// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../governance/monetary/CurrencyGovernance.sol";
import "../governance/monetary/MonetaryPolicyAdapter.sol";
import "../utils/TimeUtils.sol";

/**
 * @title StageTestCurrencyGovernance
 * @notice For minimally testing the stage modifiers in currency governance
 */
contract StageTestCurrencyGovernance is CurrencyGovernance {
    constructor()
        CurrencyGovernance(
            Policy(address(0x11)),
            MonetaryPolicyAdapter(address(0x13)),
            1,
            getTime()
        )
    {}

    function inProposePhase() public view duringProposePhase returns (bool) {
        return true;
    }

    function inVotePhase() public view duringVotePhase returns (bool) {
        return true;
    }

    function inRevealPhase() public view duringRevealPhase returns (bool) {
        return true;
    }
}
