// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../currency/ECO.sol";
import "./Notifier.sol";
import "./Lever.sol";
import "../../utils/TimeUtils.sol";

/**
 * @title Lockups
 * @notice This provides deposit certificate functionality for the purpose of countering
 * inflationary effects.
 *
 * Deposits can be made and interest will be paid out to those who make
 * deposits. Deposit principal is accessable before the interested period
 * but for a penalty of not retrieving your gained interest as well as an
 * additional penalty of that same amount.
 */
contract Lockups is Lever, TimeUtils {
    // data structure for lockups
    struct Lockup {
        // yield at time of lockup creation
        // actual yield upon withdrawal may be different due to linear inflation
        uint256 rate;
        // timestamp at which the lockup deposit window closes
        uint256 depositWindowEnd;
        // timestamp after which depositors can withdraw to claim yield + not be penalized
        uint256 end;
        // gons balances of depositors
        mapping(address => uint256) gonsBalances;
        // interest to be minted to depositors upon timely withdrawal
        // the amount minted will remain the same regardless of changes in linear inflation
        // multiplying this number by the eco inflationMultiplier yields gons
        mapping(address => uint256) interest;
        // the delegates for each user to track delegation
        mapping(address => address) delegates;
    }

    // denominator when multiplying by rate to get yield amount
    uint256 internal constant BASE = 1e18;

    // ceiling on yield --> 50%
    uint256 public constant MAX_RATE = 5E17;
    // floor for lockup duration --> 30 days
    uint256 public constant MIN_DURATION = 3600 * 24 * 30;
    // ceiling for lockup duration --> 365 days
    uint256 public constant MAX_DURATION = 3600 * 24 * 365;

    // id of the next lockup created
    uint256 internal nextId;

    // address of ECO
    ECO public immutable eco;

    // length of the deposit window
    uint256 public depositWindow;

    // mapping of Lockups, indexed by lockupId
    mapping(uint256 => Lockup) public lockups;

    // sum of early withdraw penalties in gons
    uint256 public penalties;

    // rate is out of bounds
    error BadRate();

    // duration is out of bounds
    error BadDuration();

    /** attempted deposit after deposit window has closed
     * @param lockupId ID of lockup to which deposit was attempted
     * @param depositor address that tried to deposit
     */
    error LateDeposit(uint256 lockupId, address depositor);

    /** attempted withdrawal from a lockup where withdrawer balance is 0
     * @param lockupId ID of lockup from which withdrawal was attempted
     */
    error ZeroWithdraw(uint256 lockupId);

    /** lockup created
     * @param lockupId ID of lockup
     * @param duration duration of lockup
     * @param rate yield rate of lockup at creation
     */
    event LockupCreation(uint256 lockupId, uint256 duration, uint256 rate);

    /** deposit made to lockup
     * @param lockupId ID of lockup
     * @param depositor address whose ECO were deposited
     * @param gonsDepositAmount amount in gons that was deposited to lockup
     */
    event LockupDeposit(
        uint256 lockupId,
        address depositor,
        uint256 gonsDepositAmount
    );

    /** withdrawal made from lockup
     * @param lockupId ID of lockup
     * @param recipient address receiving withdrawal
     * @param gonsWithdrawnAmount amount in gons that was withdrawn
     */
    event LockupWithdrawal(
        uint256 lockupId,
        address recipient,
        uint256 gonsWithdrawnAmount
    );

    /** constructor
     * @param _policy the owning policy address for the contract
     * @param _eco the ECO contract
     * @param _depositWindow length of the deposit window
     */
    constructor(
        Policy _policy,
        ECO _eco,
        uint256 _depositWindow
    ) Lever(_policy) {
        eco = _eco;
        depositWindow = _depositWindow;
    }

    /** Sets up ability to delegate
     * separate from constructor so that contract can be deployed pre-migration
     */
    function initializeVoting() public {
        eco.enableVoting();
    }

    /** Creates a lockup
     * @param _duration the time after lockup window closes that a user has to keep their funds locked up in order to receive yield
     * @param _rate the yield (based on inflationMultiplier at time of lockup creation) a depositor who waits the full duration will earn
     */
    function createLockup(
        uint256 _duration,
        uint256 _rate
    ) external onlyAuthorized {
        if (_rate > MAX_RATE) {
            revert BadRate();
        }
        if (_duration > MAX_DURATION || _duration < MIN_DURATION) {
            revert BadDuration();
        }

        Lockup storage lockup = lockups[nextId];
        lockup.rate = _rate;
        lockup.depositWindowEnd = getTime() + depositWindow;
        lockup.end = lockup.depositWindowEnd + _duration;

        emit LockupCreation(nextId, _duration, _rate);
        nextId += 1;
    }

    /** User deposits on their own behalf. Requires that the user has approved this contract
     * to transfer _amount of their eco.
     * @param _lockupId ID of the lockup being deposited to
     * @param _amount the amount being deposited
     */
    function deposit(uint256 _lockupId, uint256 _amount) external {
        Lockup storage lockup = lockups[_lockupId];
        if (getTime() >= lockup.depositWindowEnd) {
            revert LateDeposit(_lockupId, msg.sender);
        }

        eco.transferFrom(msg.sender, address(this), _amount);

        uint256 _gonsAmount = _amount * eco.inflationMultiplier();

        if (eco.voter(msg.sender)) {
            address _primaryDelegate = eco.getPrimaryDelegate(msg.sender);
            address depositDelegate = lockup.delegates[msg.sender];
            uint256 depositGons = lockup.gonsBalances[msg.sender];

            if (depositGons > 0 && _primaryDelegate != depositDelegate) {
                if (depositDelegate != address(0)) {
                    // this case catches if the voter status of the user changes between deposits
                    eco.undelegateAmountFromAddress(
                        depositDelegate,
                        depositGons
                    );
                }
                eco.delegateAmount(_primaryDelegate, _gonsAmount + depositGons);
            } else {
                eco.delegateAmount(_primaryDelegate, _gonsAmount);
            }

            lockup.delegates[msg.sender] = _primaryDelegate;
        }

        lockup.interest[msg.sender] += (_amount * lockup.rate) / BASE;
        lockup.gonsBalances[msg.sender] += _gonsAmount;

        emit LockupDeposit(_lockupId, msg.sender, _gonsAmount);
    }

    /** User withdraws their own funds. Withdrawing before the lockup has ended will result in a
     * forfeiture of yield and penalty equal to that yield.
     * @param _lockupId the ID of the lockup being withdrawn from
     */
    function withdraw(uint256 _lockupId) external {
        Lockup storage lockup = lockups[_lockupId];
        uint256 gonsAmount = lockup.gonsBalances[msg.sender];
        uint256 _currentInflationMultiplier = eco.inflationMultiplier();
        uint256 amount = gonsAmount / _currentInflationMultiplier;
        uint256 interest = lockup.interest[msg.sender];
        address delegate = lockup.delegates[msg.sender];

        if (gonsAmount == 0) {
            revert ZeroWithdraw(_lockupId);
        }

        if (delegate != address(0)) {
            eco.undelegateAmountFromAddress(delegate, gonsAmount);
        }

        if (getTime() < lockup.end) {
            if (interest > amount) {
                penalties += amount * _currentInflationMultiplier;
                amount = 0;
            } else {
                unchecked {
                    amount -= interest;
                }
                penalties += interest * _currentInflationMultiplier;
            }
        } else {
            eco.mint(address(this), interest);
            amount += interest;
        }

        lockup.gonsBalances[msg.sender] = 0;
        lockup.interest[msg.sender] = 0;
        lockup.delegates[msg.sender] = address(0);
        eco.transfer(msg.sender, amount);

        emit LockupWithdrawal(
            _lockupId,
            msg.sender,
            amount * _currentInflationMultiplier
        );
    }

    /** getter function for gonsBalances
     * @param _lockupId the ID of the lockup
     * @param _who address whose gons balance is being fetched
     */
    function getGonsBalance(
        uint256 _lockupId,
        address _who
    ) public view returns (uint256 gonsAmount) {
        return lockups[_lockupId].gonsBalances[_who];
    }

    /** getter function for inflation-adjusted deposits
     * @param _lockupId the ID of the lockup
     * @param _who address whose balance is being fetched
     */
    function getBalance(
        uint256 _lockupId,
        address _who
    ) public view returns (uint256 ecoAmount) {
        return
            lockups[_lockupId].gonsBalances[_who] / eco.inflationMultiplier();
    }

    /** getter function for yield
     * @param _lockupId the ID of the lockup
     * @param _who address whose balance is being fetched
     */
    function getYield(
        uint256 _lockupId,
        address _who
    ) public view returns (uint256 ecoAmount) {
        return lockups[_lockupId].interest[_who];
    }

    /** getter function for yield
     * @param _lockupId the ID of the lockup
     * @param _who address whose delegate is being fetched
     */
    function getDelegate(
        uint256 _lockupId,
        address _who
    ) public view returns (address lockupDelegate) {
        return lockups[_lockupId].delegates[_who];
    }

    /** sweep accumulated penalty eco to a destination address
     * @param _destination the address that will receive
     */
    function sweep(address _destination) external onlyPolicy {
        uint256 amount = penalties;
        penalties = 0;
        eco.transfer(_destination, amount / eco.inflationMultiplier());
    }
}
