// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../proxy/ForwardTarget.sol";

/**
 * @title The policy contract that oversees other contracts
 * @notice Policy contracts provide a mechanism for building pluggable (after deploy)
 * governance systems for other contracts.
 */
contract Policy is ForwardTarget {
    uint256 private __gapPolicy; // to cover setters mapping

    /**
     * the contract allowed enact proposals
     */
    address public governor;

    /**
     * error for when an address tries submit proposal actions without permission
     */
    error OnlyGovernor();

    /**
     * error for when an address tries to call a pseudo-internal function
     */
    error OnlySelf();

    /**
     * for when a part of enacting a proposal reverts without a readable error
     * @param proposal the proposal address that got reverted during enaction
     */
    error FailedProposal(address proposal);

    /**
     * emits when the governor permissions are changed
     * @param oldGovernor denotes the old address whose permissions are being removed
     * @param newGovernor denotes the new address whose permissions are being added
     */
    event UpdatedGovernor(address oldGovernor, address newGovernor);

    /**
     * emits when enaction happens to keep record of enaction
     * @param proposal the proposal address that got successfully enacted
     * @param governor the contract which was the source of the proposal, source for looking up the calldata
     */
    event EnactedGovernanceProposal(address proposal, address governor);

    /**
     * Modifier for checking if the sender is a governor
     */
    modifier onlyGovernorRole() {
        if (msg.sender != governor) {
            revert OnlyGovernor();
        }
        _;
    }

    /**
     * Modifier for faux internal calls
     * needed for function to be called only during delegate call
     */
    modifier onlySelf() {
        if (msg.sender != address(this)) {
            revert OnlySelf();
        }
        _;
    }

    constructor(address _governor) {
        governor = _governor;
    }

    /**
     * initializes the governor
     */
    function initialize(
        address _self
    ) public virtual override onlyConstruction {
        super.initialize(_self);

        governor = Policy(_self).governor();
    }

    /**
     * pass the governance permissions to another address
     * @param _newGovernor the address to make the new governor
     */
    function updateGovernor(address _newGovernor) public onlySelf {
        emit UpdatedGovernor(governor, _newGovernor);
        governor = _newGovernor;
    }

    function enact(address proposal) external virtual onlyGovernorRole {
        // solhint-disable-next-line avoid-low-level-calls
        (bool _success, bytes memory returndata) = proposal.delegatecall(
            abi.encodeWithSignature("enacted(address)", proposal)
        );
        if (!_success) {
            if (returndata.length == 0) revert FailedProposal(proposal);
            assembly {
                revert(add(32, returndata), mload(returndata))
            }
        }

        emit EnactedGovernanceProposal(proposal, msg.sender);
    }

    // function required for backwards compatability of the contract interface to allow for the old governance execution call to complete
    function removeSelf(bytes32) external {}
}
