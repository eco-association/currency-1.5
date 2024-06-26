// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../currency/ECO.sol";
import "./Notifier.sol";
import "./Lever.sol";

/**
 * @title Rebase lever
 * @notice This contract is a monetary policy lever that rebases the eco currency in accordance with
 * the decision made by the slate of trustees.
 */
contract Rebase is Lever {
    ECO public immutable eco;

    uint256 public constant INFLATION_FLOOR = 0;

    uint256 public constant INFLATION_CEILING = 1E19;

    error BadInflationMultiplier(uint256 rate);

    event Rebased(uint256 newInflation);

    constructor(Policy policy, ECO _eco) Lever(policy) {
        eco = _eco;
    }

    function execute(uint256 _newMultiplier) public onlyAuthorized {
        if (
            _newMultiplier <= INFLATION_FLOOR ||
            _newMultiplier >= INFLATION_CEILING
        ) {
            revert BadInflationMultiplier(_newMultiplier);
        }

        eco.rebase(_newMultiplier);
        notifier.notify();

        emit Rebased(_newMultiplier);
    }
}
