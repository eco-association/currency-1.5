// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../policy/Policed.sol";
import "../../currency/ECO.sol";
import "../../currency/ECOx.sol";
import "./ECOxStaking.sol";

/** @title VotingPower
 * Compute voting power for user
 */
contract VotingPower is Policed {
    // ECOx voting power is snapshotted when the contract is cloned
    uint256 public totalECOxSnapshot;

    // voting power to exclude from totalVotingPower
    uint256 public excludedVotingPower;

    // the ECO contract address
    ECO public immutable ecoToken;

    constructor(Policy _policy, ECO _ecoAddr) Policed(_policy) {
        require(
            address(_ecoAddr) != address(0),
            "Unrecoverable: do not set the _ecoAddr as the zero address"
        );
        ecoToken = _ecoAddr;
    }

    function totalVotingPower(uint256 _blockNumber)
        public
        view
        returns (uint256)
    {
        uint256 _supply = ecoToken.totalSupplyAt(_blockNumber);

        return _supply + 10 * totalECOxSnapshot - excludedVotingPower;
    }

    function votingPower(address _who, uint256 _blockNumber)
        public
        view
        returns (uint256)
    {
        uint256 _power = ecoToken.getPastVotes(_who, _blockNumber);
        uint256 _powerx = getXStaking().votingECOx(_who, _blockNumber);
        // ECOx has 10x the voting power of ECO per unit
        return _power + 10 * _powerx;
    }

    function getXStaking() internal view returns (ECOxStaking) {
        return ECOxStaking(address(0x0));//placeholder
    }
}