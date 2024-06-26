// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../governance/community/proposals/Proposal.sol";
import "../policy/Policy.sol";

/**
 * @title FailureProposal
 * @notice A proposal used for testing proposal failures.
 */
contract FailureProposal is Policy, Proposal {
    /** Apologize in case of failure
     */
    error ImSorry();

    // required for compilation
    constructor() Policy(address(0x0)) {}

    /** The name of the proposal.
     */
    function name() public pure override returns (string memory) {
        return "CustomErrorReverter";
    }

    /** A description of what the proposal does.
     */
    function description() public pure override returns (string memory) {
        return "Built to fail!";
    }

    /** A URL for more information.
     */
    function url() public pure override returns (string memory) {
        return "http://something";
    }

    /** Enact the proposal.
     */
    function enacted(address _self) public override {
        revert ImSorry();
    }
}

/**
 * @title WorseFailureProposal
 * @notice A proposal used for testing proposal failures.
 */
contract WorseFailureProposal is Policy, Proposal {
    // required for compilation
    constructor() Policy(address(0x0)) {}

    /** The name of the proposal.
     */
    function name() public pure override returns (string memory) {
        return "StringReverter";
    }

    /** A description of what the proposal does.
     */
    function description() public pure override returns (string memory) {
        return "Built to fail!";
    }

    /** A URL for more information.
     */
    function url() public pure override returns (string memory) {
        return "http://something";
    }

    /** Enact the proposal.
     */
    function enacted(address _self) public override {
        require(false, "I'm an annoying error string!");
    }
}

/**
 * @title ClumsyFailureProposal
 * @notice A proposal used for testing proposal failures.
 */
contract ClumsyFailureProposal is Policy, Proposal {
    // required for compilation
    constructor() Policy(address(0x0)) {}

    /** The name of the proposal.
     */
    function name() public pure override returns (string memory) {
        return "PanicReverter";
    }

    /** A description of what the proposal does.
     */
    function description() public pure override returns (string memory) {
        return "Built to fail!";
    }

    /** A URL for more information.
     */
    function url() public pure override returns (string memory) {
        return "http://something";
    }

    /** Enact the proposal.
     */
    function enacted(address _self) public override {
        uint256 takes;
        uint256 teamwork = 1;
        uint256 failure = takes - teamwork;
    }
}

/**
 * @title TotalFailureProposal
 * @notice A proposal used for testing proposal failures.
 */
contract TotalFailureProposal is Policy, Proposal {
    // required for compilation
    constructor() Policy(address(0x0)) {}

    /** The name of the proposal.
     */
    function name() public pure override returns (string memory) {
        return "RawReverter";
    }

    /** A description of what the proposal does.
     */
    function description() public pure override returns (string memory) {
        return "Built to fail!";
    }

    /** A URL for more information.
     */
    function url() public pure override returns (string memory) {
        return "http://something";
    }

    /** Enact the proposal.
     */
    function enacted(address _self) public override {
        revert();
    }
}
