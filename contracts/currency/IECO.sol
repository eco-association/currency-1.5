/* -*- c-basic-offset: 4 -*- */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// TODO: make an interface for delegation

interface IECO is IERC20 {
    /**
     * Only available to minters
     */
    function mint(address to, uint256 amount) external;

    /**
     * Only available to token holders for their own tokens and burners
     */
    function burn(address from, uint256 amount) external;

    /**
     * Returns the votes for the current snapshot
     *
     * @param account the address whose vote balance to check
     */
    function voteBalanceSnapshot(
        address account
    ) external view returns (uint256);

    /**
     * Returns the inflation multiplier value for the current snapshot
     */
    function inflationMultiplierSnapshot() external view returns (uint256);

    /**
     * Returns the total supply for the current snapshot
     */
    function totalSupplySnapshot() external view returns (uint256);
}
