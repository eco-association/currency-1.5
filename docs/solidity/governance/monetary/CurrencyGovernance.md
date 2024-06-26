# Eco Association

Copyright (c) 2023 Eco Association

## CurrencyGovernance

**Trustee monetary policy decision process**

This contract oversees the voting on the currency monetary levers.
Trustees vote on a policy that is implemented at the conclusion of the cycle

### MonetaryPolicy

```solidity
struct MonetaryPolicy {
  uint256 cycle;
  address[] targets;
  bytes4[] signatures;
  bytes[] calldatas;
  uint256 support;
  mapping(address => bool) supporters;
  string description;
}
```

### Vote

```solidity
struct Vote {
  bytes32 proposalId;
  uint256 score;
}
```

### TimingData

```solidity
struct TimingData {
  uint256 currentCycle;
  enum CurrencyGovernance.Stage currentStage;
}
```

### Stage

```solidity
enum Stage {
  Propose,
  Commit,
  Reveal
}
```

### trustedNodes

this var stores the current contract that holds the trusted nodes role

```solidity
contract TrustedNodes trustedNodes
```

### enacter

this var stores the current contract that holds the enacter role

```solidity
contract MonetaryPolicyAdapter enacter
```

### governanceStartTime

this variable tracks the start of governance
it is used to track the voting cycle and stage

```solidity
uint256 governanceStartTime
```

### PROPOSAL_TIME

```solidity
uint256 PROPOSAL_TIME
```

### VOTING_TIME

```solidity
uint256 VOTING_TIME
```

### REVEAL_TIME

```solidity
uint256 REVEAL_TIME
```

### CYCLE_LENGTH

```solidity
uint256 CYCLE_LENGTH
```

### START_CYCLE

start with cycle 1000 to avoid underflow and initial value issues

```solidity
uint256 START_CYCLE
```

### IDEMPOTENT_INFLATION_MULTIPLIER

```solidity
uint256 IDEMPOTENT_INFLATION_MULTIPLIER
```

### MAX_DESCRIPTION_DATA

max length of description field

```solidity
uint256 MAX_DESCRIPTION_DATA
```

### MAX_TARGETS

max length of the targets array

```solidity
uint256 MAX_TARGETS
```

### proposals

mapping of proposal IDs to submitted proposals
proposalId hashes include the _cycle as a parameter

```solidity
mapping(bytes32 => struct CurrencyGovernance.MonetaryPolicy) proposals
```

### trusteeSupports

mapping of trustee addresses to cycle number to track if they have supported (and can therefore not support again)

```solidity
mapping(address => uint256) trusteeSupports
```

### commitments

mapping of trustee addresses to their most recent hash commits for voting

```solidity
mapping(address => bytes32) commitments
```

### scores

mapping proposalIds to their voting score, accumulated during reveal

```solidity
mapping(bytes32 => uint256) scores
```

### quorum

minimum number participating trustees required for a policy to be enacted in any given cycle

```solidity
uint256 quorum
```

### participation

number of trustees that participated this cycle

```solidity
uint256 participation
```

### leader

used to track the leading proposalId during the vote totalling
tracks the winner between reveal phases
is deleted on enact to ensure it can only be enacted once

```solidity
bytes32 leader
```

### NonZeroEnacterAddr

setting the enacter address to the zero address stops governance

```solidity
error NonZeroEnacterAddr()
```

### BadQuorum

setting the quorum greater than the number of trustees stops governance
inherently prevents the trustedNodes address from being set to the zero address
something to keep in mind for the case in which trustees are removed via community governance

```solidity
error BadQuorum()
```

### TrusteeOnlyFunction

For if a non-trustee address tries to access trustee role gated functionality

```solidity
error TrusteeOnlyFunction()
```

### WrongStage

For when governance calls are made before or after their time windows for their stage

```solidity
error WrongStage()
```

### CycleIncomplete

Early finalization error
for when a cycle is attempted to be finalized before it finishes

```solidity
error CycleIncomplete(uint256 requestedCycle, uint256 currentCycle)
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestedCycle | uint256 | the cycle submitted by the end user to access |
| currentCycle | uint256 | the current cycle as calculated by the contract |

### ExceedsMaxDescriptionSize

Description length error
for when a proposal is submitted with too long of a description

```solidity
error ExceedsMaxDescriptionSize(uint256 submittedLength)
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| submittedLength | uint256 | the length of the submitted description, to be compared against MAX_DESCRIPTION_DATA |

### BadNumTargets

Targets length error
for when a proposal is submitted with too many actions or zero actions

```solidity
error BadNumTargets(uint256 submittedLength)
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| submittedLength | uint256 | the length of the submitted targets array, to be compared against MAX_TARGETS and 0 |

### ProposalActionsArrayMismatch

error for when the 3 arrays submitted for the proposal don't all have the same number of elements

```solidity
error ProposalActionsArrayMismatch()
```

### SupportAlreadyGiven

error for when a trustee is already supporting a policy and tries to propose or support another policy

```solidity
error SupportAlreadyGiven()
```

### SupportNotGiven

error for when a trustee is not supporting a policy and tries unsupport

```solidity
error SupportNotGiven()
```

### ProposalNotCurrent

error for when a trustee tries unsupporting a proposal from a past cycle

```solidity
error ProposalNotCurrent()
```

### DuplicateProposal

error for when a proposal is submitted that's a total duplicate of an existing one

```solidity
error DuplicateProposal()
```

### NoSuchProposal

error for when a proposal is supported that hasn't actually been proposed

```solidity
error NoSuchProposal()
```

### CannotVoteEmpty

error for when a reveal is submitted with no votes

```solidity
error CannotVoteEmpty()
```

### NoAbstainWithCommit

error for when a trustee with a commmitment tries to abstain

```solidity
error NoAbstainWithCommit()
```

### NoCommitFound

error for when a reveal is submitted for an empty commitment, usually the sign of no commit being submitted

```solidity
error NoCommitFound()
```

### CommitMismatch

error for when the submitted vote doesn't match the stored commit

```solidity
error CommitMismatch()
```

### InvalidVoteBadProposalId

error for when a proposalId in a trustee's vote is not one from the current cycle or is completely invalid

```solidity
error InvalidVoteBadProposalId(struct CurrencyGovernance.Vote vote)
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| vote | struct CurrencyGovernance.Vote | the vote containing the invalid proposalId |

### InvalidVoteBadProposalOrder

error for when the proposalIds in a trustee's vote are not strictly increasing

```solidity
error InvalidVoteBadProposalOrder(struct CurrencyGovernance.Vote prevVote, struct CurrencyGovernance.Vote vote)
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| prevVote | struct CurrencyGovernance.Vote | the vote before the invalid vote |
| vote | struct CurrencyGovernance.Vote | the vote with the non-increasing proposalId |

### InvalidVoteBadScore

error for when a score in a trustee's vote is either duplicate or doesn't respect support weightings

```solidity
error InvalidVoteBadScore(struct CurrencyGovernance.Vote vote)
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| vote | struct CurrencyGovernance.Vote | the vote containing the invalid score |

### InvalidVotesOutOfBounds

error for when the scores for proposals are not monotonically increasing, accounting for support weighting

```solidity
error InvalidVotesOutOfBounds()
```

### QuorumNotMet

error for when the leader's score is less than the quorum

```solidity
error QuorumNotMet()
```

### EnactCycleNotCurrent

error for when enact is called, but the cycle it's called for does not match the proposal that's the current leader

```solidity
error EnactCycleNotCurrent()
```

### NewTrustedNodes

emits when the trustedNodes contract is changed

```solidity
event NewTrustedNodes(contract TrustedNodes newTrustedNodes, contract TrustedNodes oldTrustedNodes)
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newTrustedNodes | contract TrustedNodes | denotes the new trustedNodes contract address |
| oldTrustedNodes | contract TrustedNodes | denotes the old trustedNodes contract address |

### NewEnacter

emits when the enacter contract is changed

```solidity
event NewEnacter(contract MonetaryPolicyAdapter newEnacter, contract MonetaryPolicyAdapter oldEnacter)
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newEnacter | contract MonetaryPolicyAdapter | denotes the new enacter contract address |
| oldEnacter | contract MonetaryPolicyAdapter | denotes the old enacter contract address |

### NewQuorum

emits when setQuorum is called successfully

```solidity
event NewQuorum(uint256 newQuorum, uint256 oldQuorum)
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newQuorum | uint256 | the new quorum |
| oldQuorum | uint256 | the old quorum |

### ProposalCreation

Tracking for proposal creation
emitted when a proposal is submitted to track the values

```solidity
event ProposalCreation(address _trusteeAddress, uint256 _cycle, bytes32 id, string _description)
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _trusteeAddress | address | the address of the trustee that submitted the proposal |
| _cycle | uint256 | the cycle during which the proposal was submitted |
| id | bytes32 | the lookup id for the proposal in the proposals mapping is created via a hash of _cycle, _targets, _signatures, and _calldatas; see getProposalHash for more details |
| _description | string | a string allowing the trustee to describe the proposal or link to discussions on the proposal |

### Support

Tracking for support actions
emitted when a trustee adds their support for a proposal

```solidity
event Support(address trustee, bytes32 proposalId, uint256 cycle)
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| trustee | address | the address of the trustee supporting |
| proposalId | bytes32 | the lookup for the proposal being supported |
| cycle | uint256 | the cycle during which the support action happened |

### Unsupport

Tracking for unsupport actions
emitted when a trustee retracts their support for a proposal

```solidity
event Unsupport(address trustee, bytes32 proposalId, uint256 cycle)
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| trustee | address | the address of the trustee unsupporting |
| proposalId | bytes32 | the lookup for the proposal being unsupported |
| cycle | uint256 | the cycle during which the support action happened |

### ProposalDeleted

Tracking for removed proposals
emitted when the last trustee retracts their support for a proposal

```solidity
event ProposalDeleted(bytes32 proposalId, uint256 cycle)
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | bytes32 | the lookup for the proposal being deleted |
| cycle | uint256 | the cycle during which the unsupport deletion action happened |

### VoteCommit

Fired when a trustee commits their vote.

```solidity
event VoteCommit(address trustee, uint256 cycle)
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| trustee | address | the trustee that committed the vote |
| cycle | uint256 | the cycle for the commitment |

### VoteReveal

Fired when a vote is revealed, to create a voting history for all participants.
Records the voter, as well as all of the parameters of the vote cast.

```solidity
event VoteReveal(address voter, uint256 cycle, struct CurrencyGovernance.Vote[] votes)
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voter | address | the trustee who revealed their vote |
| cycle | uint256 | the cycle when the vote was cast and counted |
| votes | struct CurrencyGovernance.Vote[] | the array of Vote structs that composed the trustee's ballot |

### QuorumReached

```solidity
event QuorumReached()
```

### Abstain

Fired when an address choses to abstain

```solidity
event Abstain(address voter, uint256 cycle)
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voter | address | the address of the voter |
| cycle | uint256 | the cycle for which the voter abstained |

### VoteResult

Fired when vote results are computed, creating a permanent record of vote outcomes.

```solidity
event VoteResult(uint256 cycle, bytes32 winner)
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| cycle | uint256 | the cycle for which this is the vote result |
| winner | bytes32 | the proposalId for the proposal that won |

### onlyTrusted

Restrict access to trusted nodes only.

```solidity
modifier onlyTrusted()
```

### duringProposePhase

for functions related to proposing monetary policy

```solidity
modifier duringProposePhase()
```

### duringVotePhase

for functions related to committing votes

```solidity
modifier duringVotePhase()
```

### duringRevealPhase

for functions related to revealing votes

```solidity
modifier duringRevealPhase()
```

### constructor

constructor

```solidity
constructor(contract Policy _policy, contract MonetaryPolicyAdapter _enacter, uint256 _quorum, uint256 _termStart) public
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _policy | contract Policy | the owning policy address for the contract |
| _enacter | contract MonetaryPolicyAdapter | the monetary policy adapter |
| _quorum | uint256 | the required quorum for enactment of monetary policy |
| _termStart | uint256 | the time the current CurrencyGovernance term starts |

### setTrustedNodes

setter function for trustedNodes var
This function is very disruptive to the currency governance process and the timing of calling it should be VERY INTENTIONAL
The proposal that does so should have a timing restriction on its enaction, don't just let it be enacted as soon as it passes!

only available to the owning policy contract

```solidity
function setTrustedNodes(contract TrustedNodes _trustedNodes) external
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _trustedNodes | contract TrustedNodes | the value to set the new trustedNodes address to, must have enough trustees to be able to hit quorum |

### _setTrustedNodes

```solidity
function _setTrustedNodes(contract TrustedNodes _trustedNodes) internal
```

### setEnacter

setter function for enacter var
only available to the owning policy contract

```solidity
function setEnacter(contract MonetaryPolicyAdapter _enacter) external
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _enacter | contract MonetaryPolicyAdapter | the value to set the new enacter address to, cannot be zero |

### _setEnacter

```solidity
function _setEnacter(contract MonetaryPolicyAdapter _enacter) internal
```

### setQuorum

```solidity
function setQuorum(uint256 _quorum) external
```

### _setQuorum

```solidity
function _setQuorum(uint256 _quorum) internal
```

### getCurrentStage

getter for timing data
calculates and returns the current cycle and the current stage

```solidity
function getCurrentStage() public view returns (struct CurrencyGovernance.TimingData timingData)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| timingData | struct CurrencyGovernance.TimingData | Timin Data type of { uint256 cycle, Stage stage } |

### getCurrentCycle

getter for just the current cycle
calculates and returns, used internally

```solidity
function getCurrentCycle() public view returns (uint256 cycle)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| cycle | uint256 | the index for the currently used governance recording mappings |

### propose

propose a monetary policy
this function allows trustees to submit a potential monetary policy
if there is already a proposed monetary policy by the trustee, this overwrites it

```solidity
function propose(address[] targets, bytes4[] signatures, bytes[] calldatas, string description) external
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| targets | address[] | array of target addresses |
| signatures | bytes4[] | array of signatures |
| calldatas | bytes[] | array of calldata |
| description | string | descrption of the monetary policy |

### canSupport

getter for duplicate support checks
the function just pulls to see if the address has supported this generation
doesn't check to see if the address is a trustee

```solidity
function canSupport(address _address) public view returns (bool)
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _address | address | the address to check. not msg.sender for dapp related purposes |

### getProposalId

```solidity
function getProposalId(uint256 _cycle, address[] _targets, bytes4[] _signatures, bytes[] _calldatas) public pure returns (bytes32)
```

### getProposalTargets

```solidity
function getProposalTargets(bytes32 proposalId) external view returns (address[])
```

### getProposalSignatures

```solidity
function getProposalSignatures(bytes32 proposalId) external view returns (bytes4[])
```

### getProposalCalldatas

```solidity
function getProposalCalldatas(bytes32 proposalId) external view returns (bytes[])
```

### getProposalSupporter

```solidity
function getProposalSupporter(bytes32 proposalId, address supporter) external view returns (bool)
```

### supportProposal

add your support to a monetary policy
this function allows you to increase the support weight to an already submitted proposal
the submitter of a proposal default supports it
support for a proposal is close to equivalent of submitting a duplicate proposal to pad the ranking

```solidity
function supportProposal(bytes32 proposalId) external
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | bytes32 | the lookup ID for the proposal that's being supported |

### unsupportProposal

removes your support to a monetary policy
this function allows you to reduce the support weight to an already submitted proposal
you must unsupport first if you currently have supported if you want to support or propose another proposal
the last person who unsupports the proposal deletes the proposal

```solidity
function unsupportProposal(bytes32 proposalId) external
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | bytes32 | the lookup ID for the proposal that's being unsupported |

### commit

submit a vote commitment
this function allows trustees to submit a commit hash of their vote
commitment is salted so that it is a blind vote process
calling additional times overwrites previous commitments

```solidity
function commit(bytes32 _commitment) external
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _commitment | bytes32 | the hash commit to check against when revealing the structure of the commit is keccak256(abi.encode(salt, cycleIndex, msg.sender, votes)) where votes is an array of Vote structs |

### abstain

signal abstainment to the protocol
does not count as a vote (cannot be revealed to record positive participation for a reward)
signals the abstainment with an event
due to a small quirk, forgetting to reveal your vote in the previous round requires you to first call commit with zero data

```solidity
function abstain() external
```

### reveal

reveal a committed vote
this function allows trustees to reveal their previously committed votes once the reveal phase is entered
in revealing the vote, votes are tallied, a running tally of each proposal's votes is kept in storage during this phase

```solidity
function reveal(address _trustee, bytes32 _salt, struct CurrencyGovernance.Vote[] _votes) external
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _trustee | address | the trustee's commit to try and reveal trustees can obviously reveal their own commits, but this allows for a delegated reveal the commit structure means that only the correct committed vote can ever be revealed, no matter who reveals it reveals are attributed to this trustee |
| _salt | bytes32 | the salt for the commit hash to make the vote secret |
| _votes | struct CurrencyGovernance.Vote[] | the array of Vote objects { bytes32 proposal, uint256 ranking } that follows our modified Borda scheme. The votes need to be arranged in ascending order of address and ranked via the integers 1 to the number of proposals ranked. |

### enact

send the results to the adapter for enaction

```solidity
function enact() external
```

