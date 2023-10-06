/* -*- c-basic-offset: 4 -*- */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IECO is IERC20 {
    /**
     * Only available to CurrencyTimer and ECOx
     */
    function mint(address to, uint256 amount) external;

    /**
     * Only available to token holders and CurrencyTimer
     */
    function burn(address from, uint256 amount) external;

    /**
     * Returns the currentGeneration
     */
    function currentGeneration() external view returns (uint256);

    /**
     * Returns final votes of an address at the end of a blockNumber
     */
    function voteBalanceOfAt(
        address owner,
        uint256 blockNumber
    ) external view returns (uint256);

    /**
     * Returns the inflation multiplier value for the current snapshot
     */
    function getInflationMultiplier() external view returns (uint256);

    /**
     * Returns the inflation multiplier value for the specified snapshot
     */
    function getInflationMultiplierAt(
        uint256 snapshotId
    ) external view returns (uint256);

    /**
     * Returns the final total supply at the end of the given block number
     */
    function totalSupplyAt(uint256 blockNumber) external view returns (uint256);
}
