import { ethers, config as hardhatConfig } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import {
  Fixture,
  BaseContracts,
  deployBaseUnproxied,
  deployCommunity,
  deployMonetary,
  MonetaryGovernanceContracts,
  CommunityGovernanceContracts,
  BaseAddresses,
  CommunityGovernanceAddresses,
  MonetaryGovernanceAddresses,
} from '../../deploy/standalone.fixture'
import { time, reset } from '@nomicfoundation/hardhat-network-helpers'
import { DAY } from '../utils/constants'
import {
  ECO as ECOold,
  ECOx as ECOxold,
  ECOxStaking as ECOxStakingold,
  Policy as Policyold,
  PolicyProposals__factory,
  fixtures,
  ImplementationUpdatingTarget__factory,
  PolicyVotes__factory,
} from '@helix-foundation/currency-dev'
import { ECO, ECOx } from '../../typechain-types/contracts/currency'
import { Policy } from '../../typechain-types/contracts/policy'
import { ECOxStaking } from '../../typechain-types/contracts/governance/community'
import { MigrationLinker } from '../../typechain-types/contracts/test/deploy/MigrationLinker.propo.sol'
import { MigrationLinker__factory } from '../../typechain-types/factories/contracts/test/deploy/MigrationLinker.propo.sol'
import { SnapshotUpdatingTarget__factory } from '../../typechain-types/factories/contracts/test/deploy'
import { deploy } from '../../deploy/utils'
import { getExistingEco } from '../../deploy/parse-mainnet'
import { Policy__factory } from '../../typechain-types/factories/contracts/policy'
import {
  ECO__factory,
  ECOx__factory,
} from '../../typechain-types/factories/contracts/currency'
import { ECOxStaking__factory } from '../../typechain-types/factories/contracts/governance/community'
import { BigNumber } from 'ethers'

const { policyFor } = fixtures

const INITIAL_ECOx = ethers.constants.WeiPerEther.mul(1000000000).toString() // taylored to match the mainnet deploy

const aliceAddr = '0x99f98ea4A883DB4692Fa317070F4ad2dC94b05CE'
const bobAddr = '0xA201d3C815AC9D4d8830fb3dE2b490B5b0069ACa'
const charlieAddr = '0xED83D2f20cF2d218Adbe0a239C0F8AbDca8Fc499'
const etherWhaleAddr = '0x00000000219ab540356cBB839Cbe05303d7705Fa'

const TRUSTEE_TERM = 26 * 14 * DAY
const VOTE_REWARD = 1000
const LOCKUP_DEPOSIT_WINDOW = 2 * DAY

describe('Mainnet fork migration tests', () => {
  let alice: SignerWithAddress
  let bob: SignerWithAddress
  let charlie: SignerWithAddress
  let etherWhale: SignerWithAddress

  let proposal: MigrationLinker

  let policyProxy: Policyold
  let ecoProxy: ECOold
  let ecoxProxy: ECOxold
  let ecoXStakingProxy: ECOxStakingold

  let fixtureAddresses: BaseAddresses &
    CommunityGovernanceAddresses &
    MonetaryGovernanceAddresses // clarifies which fixture addresses
  let baseContracts: BaseContracts
  let monetaryGovernanceContracts: MonetaryGovernanceContracts
  let communityGovernanceContracts: CommunityGovernanceContracts

  beforeEach(async () => {
    // reset the fork
    await reset(
      hardhatConfig.networks.hardhat.forking?.url,
      hardhatConfig.networks.hardhat.forking?.blockNumber
    )

    // setup faked addresses
    alice = await ethers.getImpersonatedSigner(aliceAddr)
    bob = await ethers.getImpersonatedSigner(bobAddr)
    charlie = await ethers.getImpersonatedSigner(charlieAddr)
    etherWhale = await ethers.getImpersonatedSigner(etherWhaleAddr)
    etherWhale.sendTransaction({
      to: alice.address,
      value: ethers.utils.parseEther('100'),
    })
    etherWhale.sendTransaction({
      to: bob.address,
      value: ethers.utils.parseEther('100'),
    })
    etherWhale.sendTransaction({
      to: charlie.address,
      value: ethers.utils.parseEther('100'),
    })
    ;({
      policy: policyProxy,
      eco: ecoProxy,
      ecox: ecoxProxy,
      ecoXStaking: ecoXStakingProxy,
    } = await getExistingEco(alice))

    // deploy the new contracts with proxy implementations only
    const config = {
      verify: false,
      policyProxyAddress: policyProxy.address,
      ecoProxyAddress: ecoProxy.address,
      ecoxProxyAddress: ecoxProxy.address,
      ecoXStakingProxyAddress: ecoXStakingProxy.address,
      noLockups: true,
      governanceStartTime: await time.latest(),
    }

    // deploy base contracts
    baseContracts = await deployBaseUnproxied(
      alice,
      INITIAL_ECOx,
      false,
      config
    )

    const implAddresses = baseContracts.toAddresses()

    // edit the base contracts object so it has the proxy addresses in the right places
    baseContracts.policy = policyProxy as unknown as Policy
    baseContracts.eco = ecoProxy as unknown as ECO
    baseContracts.ecox = ecoxProxy as unknown as ECOx
    baseContracts.ecoXStaking = ecoXStakingProxy as unknown as ECOxStaking

    monetaryGovernanceContracts = await deployMonetary(
      alice,
      baseContracts,
      [alice.address, bob.address],
      false,
      config
    )
    communityGovernanceContracts = await deployCommunity(
      alice,
      baseContracts,
      alice.address,
      false,
      config
    ) // sets alice to be the pauser

    fixtureAddresses = {
      ...implAddresses, // has the implementation addresses for later because the proxies are already set to global values
      ...monetaryGovernanceContracts.toAddresses(),
      ...communityGovernanceContracts.toAddresses(),
    }
  })

  it('check deployment constructors', async () => {
    const contracts: Fixture = new Fixture(
      baseContracts,
      communityGovernanceContracts,
      monetaryGovernanceContracts
    )

    // these are pre migrated contracts
    expect(await contracts.base.eco.policy()).to.eq(
      contracts.base.policy.address
    )
    expect(await contracts.base.eco.pauser()).to.eq(alice.address)
    expect(await contracts.base.eco.decimals()).to.eq(18)
    expect(await contracts.base.eco.name()).to.eq('ECO')
    expect(await contracts.base.eco.symbol()).to.eq('ECO')

    expect(await contracts.base.ecox.policy()).to.eq(
      contracts.base.policy.address
    )
    expect(await contracts.base.ecox.pauser()).to.eq(alice.address)
    expect(await contracts.base.ecox.decimals()).to.eq(18)
    expect(await contracts.base.ecox.name()).to.eq('ECOx')
    expect(await contracts.base.ecox.symbol()).to.eq('ECOx')

    expect(await contracts.base.ecoXStaking.policy()).to.eq(
      contracts.base.policy.address
    )
    expect(await contracts.base.ecoXStaking.ecoXToken()).to.eq(
      contracts.base.ecox.address
    )
    expect(await contracts.base.ecoXStaking.decimals()).to.eq(18)
    expect(await contracts.base.ecoXStaking.name()).to.eq('Staked ECOx')
    expect(await contracts.base.ecoXStaking.symbol()).to.eq('sECOx')
    expect(await contracts.base.ecoXStaking.pauser()).to.eq(
      ethers.constants.AddressZero
    )

    // these are contracts deployed for post migration
    expect(await contracts.base.ecoXExchange.policy()).to.eq(
      contracts.base.policy.address
    )
    expect(await contracts.base.ecoXExchange.eco()).to.eq(
      contracts.base.eco.address
    )
    expect(await contracts.base.ecoXExchange.ecox()).to.eq(
      contracts.base.ecox.address
    )
    expect(await contracts.base.ecoXExchange.initialSupply()).to.eq(
      INITIAL_ECOx
    )

    expect(await contracts.community.communityGovernance.policy()).to.eq(
      contracts.base.policy.address
    )
    expect(await contracts.community.communityGovernance.pauser()).to.eq(
      alice.address
    )
    expect(await contracts.community.communityGovernance.ecoToken()).to.eq(
      contracts.base.eco.address
    )
    expect(await contracts.community.communityGovernance.ecoXStaking()).to.eq(
      contracts.base.ecoXStaking.address
    )

    expect(await contracts.monetary!.rebaseLever.policy()).to.eq(
      contracts.base.policy.address
    )
    expect(await contracts.monetary!.rebaseLever.eco()).to.eq(
      contracts.base.eco.address
    )

    expect(await contracts.monetary!.rebaseNotifier.policy()).to.eq(
      contracts.base.policy.address
    )
    expect(await contracts.monetary!.rebaseNotifier.lever()).to.eq(
      contracts.monetary!.rebaseLever.address
    )

    expect(await contracts.monetary!.adapter.policy()).to.eq(
      contracts.base.policy.address
    )

    expect(await contracts.monetary!.monetaryGovernance.policy()).to.eq(
      contracts.base.policy.address
    )
    expect(await contracts.monetary!.monetaryGovernance.enacter()).to.eq(
      contracts.monetary!.adapter.address
    )
    expect(
      await contracts.monetary!.monetaryGovernance.governanceStartTime()
    ).to.not.eq(0)

    expect(await contracts.monetary!.trustedNodes.policy()).to.eq(
      contracts.base.policy.address
    )
    expect(await contracts.monetary!.trustedNodes.ecoX()).to.eq(
      contracts.base.ecox.address
    )
    expect(await contracts.monetary!.trustedNodes.currencyGovernance()).to.eq(
      contracts.monetary!.monetaryGovernance.address
    )
    expect(await contracts.monetary!.trustedNodes.voteReward()).to.eq(
      VOTE_REWARD
    )
    expect(await contracts.monetary!.trustedNodes.termEnd()).to.not.eq(0)
    expect(await contracts.monetary!.trustedNodes.termStart()).to.eq(
      (await contracts.monetary!.trustedNodes.termEnd()).sub(TRUSTEE_TERM)
    )
    expect(await contracts.monetary!.trustedNodes.isTrusted(alice.address)).to
      .be.true
    expect(await contracts.monetary!.trustedNodes.isTrusted(bob.address)).to.be
      .true

    expect(await contracts.monetary!.lockupsLever.policy()).to.eq(
      contracts.base.policy.address
    )
    expect(await contracts.monetary!.lockupsLever.eco()).to.eq(
      contracts.base.eco.address
    )
    expect(await contracts.monetary!.lockupsLever.depositWindow()).to.eq(
      LOCKUP_DEPOSIT_WINDOW
    )

    expect(await contracts.monetary!.lockupsNotifier.policy()).to.eq(
      contracts.base.policy.address
    )
    expect(await contracts.monetary!.lockupsNotifier.lever()).to.eq(
      contracts.monetary!.lockupsLever.address
    )
  })

  context('with the proposal contstructed', () => {
    beforeEach(async () => {
      const implementationUpdatingTarget = await deploy(
        alice,
        ImplementationUpdatingTarget__factory
      )

      const snapshotUpdatingTarget = await deploy(
        alice,
        SnapshotUpdatingTarget__factory
      )

      const proposalParams = [
        fixtureAddresses.communityGovernance,
        fixtureAddresses.ecoXExchange,
        fixtureAddresses.rebaseNotifier,
        fixtureAddresses.lockupsNotifier,
        fixtureAddresses.trustedNodes,
        fixtureAddresses.policy,
        fixtureAddresses.eco,
        fixtureAddresses.ecox,
        fixtureAddresses.ecoXStaking,
        implementationUpdatingTarget.address,
        snapshotUpdatingTarget.address,
      ]

      proposal = (await deploy(
        alice,
        MigrationLinker__factory,
        proposalParams
      )) as MigrationLinker
      await proposal.deployed()
    })

    it('proposal constructs correctly', async () => {
      expect(await proposal.newEcoImpl()).to.eq(fixtureAddresses.eco)

      expect(await proposal.ecoProxyAddress()).to.eq(baseContracts.eco.address)

      expect(fixtureAddresses.eco).to.not.eq(baseContracts.eco.address)

      expect(await proposal.newEcoxImpl()).to.eq(fixtureAddresses.ecox)

      expect(await proposal.ecoxProxyAddress()).to.eq(
        baseContracts.ecox.address
      )

      expect(fixtureAddresses.ecox).to.not.eq(baseContracts.ecox.address)

      expect(await proposal.newEcoxStakingImpl()).to.eq(
        fixtureAddresses.ecoXStaking
      )

      expect(await proposal.ecoXStakingProxyAddress()).to.eq(
        baseContracts.ecoXStaking.address
      )

      expect(fixtureAddresses.ecoXStaking).to.not.eq(
        baseContracts.ecoXStaking.address
      )

      expect(await proposal.communityGovernance()).to.eq(
        fixtureAddresses.communityGovernance
      )

      expect(await proposal.ecoXExchange()).to.eq(fixtureAddresses.ecoXExchange)

      expect(await proposal.rebase()).to.eq(fixtureAddresses.rebaseLever)

      expect(await proposal.rebaseNotifier()).to.eq(
        fixtureAddresses.rebaseNotifier
      )

      expect(await proposal.monetaryPolicyAdapter()).to.eq(
        fixtureAddresses.adapter
      )

      expect(await proposal.currencyGovernance()).to.eq(
        fixtureAddresses.monetaryGovernance
      )

      expect(await proposal.trustedNodes()).to.eq(fixtureAddresses.trustedNodes)

      expect(await proposal.newPolicyImpl()).to.eq(fixtureAddresses.policy)
    })

    context('with enacted proposal', () => {
      let oldPolicyImpl
      let oldEcoImpl
      let oldEcoxImpl
      let oldEcoXStakingImpl
      let oldInflationMult: BigNumber

      beforeEach(async () => {
        // confirm start state
        oldPolicyImpl = await policyProxy.implementation()
        oldEcoImpl = await ecoProxy.implementation()
        oldEcoxImpl = await ecoxProxy.implementation()
        oldEcoXStakingImpl = await ecoXStakingProxy.implementation()
        oldInflationMult = await ecoProxy.getPastLinearInflation(
          await time.latestBlock()
        )

        // the addresses in fixtureAddresses have the new impls, and this check confirms that fact
        expect(fixtureAddresses.policy).to.not.eq(oldPolicyImpl)
        expect(fixtureAddresses.eco).to.not.eq(oldEcoImpl)
        expect(fixtureAddresses.ecox).to.not.eq(oldEcoxImpl)
        expect(fixtureAddresses.ecoXStaking).to.not.eq(oldEcoXStakingImpl)

        // grab the policyProposals contract
        const proposalsHash = ethers.utils.solidityKeccak256(
          ['string'],
          ['PolicyProposals']
        )
        const policyProposals = new PolicyProposals__factory(alice).attach(
          await policyFor(policyProxy, proposalsHash)
        )

        // submit proposal
        await ecoProxy
          .connect(alice)
          .approve(
            policyProposals.address,
            await policyProposals.COST_REGISTER()
          )
        await policyProposals.connect(alice).registerProposal(proposal.address)

        // support through to voting
        await policyProposals.connect(alice).support(proposal.address)
        await policyProposals.connect(alice).deployProposalVoting()

        // get policy votes object
        const policyVotesIdentifierHash = ethers.utils.solidityKeccak256(
          ['string'],
          ['PolicyVotes']
        )
        const policyVotes = new PolicyVotes__factory(alice).attach(
          await policyFor(policyProxy, policyVotesIdentifierHash)
        )

        // confirm vote
        await policyVotes.connect(alice).vote(true)
        // wait until end of voting phase
        await time.increase(4 * DAY)
        // executes
        await policyVotes.execute()

        // initialize the voting for the lockup
        await monetaryGovernanceContracts.lockupsLever.initializeVoting()

        // edit the base contracts object so it has the right interface object
        baseContracts.policy = new Policy__factory(alice).attach(
          policyProxy.address
        )
        baseContracts.eco = new ECO__factory(alice).attach(ecoProxy.address)
        baseContracts.ecox = new ECOx__factory(alice).attach(ecoxProxy.address)
        baseContracts.ecoXStaking = new ECOxStaking__factory(alice).attach(
          ecoXStakingProxy.address
        )
      })

      it('changes proxy implementations', async () => {
        const newPolicyImpl = await baseContracts.policy.implementation()
        const newEcoImpl = await baseContracts.eco.implementation()
        const newEcoxImpl = await baseContracts.ecox.implementation()
        const newEcoXStakingImpl =
          await baseContracts.ecoXStaking.implementation()

        expect(fixtureAddresses.policy).to.eq(newPolicyImpl)
        expect(fixtureAddresses.eco).to.eq(newEcoImpl)
        expect(fixtureAddresses.ecox).to.eq(newEcoxImpl)
        expect(fixtureAddresses.ecoXStaking).to.eq(newEcoXStakingImpl)
      })

      it('check preservation of inflation multiplier', async () => {
        expect(await baseContracts.eco.inflationMultiplier()).to.eq(
          oldInflationMult
        )
      })

      it('check deployment linking', async () => {
        const contracts = new Fixture(
          baseContracts,
          communityGovernanceContracts,
          monetaryGovernanceContracts
        )

        expect(await contracts.base.policy.governor()).to.eq(
          contracts.community.communityGovernance.address
        )

        expect(
          await contracts.base.ecox.burners(contracts.base.ecoXExchange.address)
        ).to.be.true

        expect(
          await contracts.base.eco.minters(contracts.base.ecoXExchange.address)
        ).to.be.true
        expect(
          await contracts.base.eco.rebasers(
            contracts.monetary!.rebaseLever.address!
          )
        ).to.be.true
        expect(
          await contracts.base.eco.snapshotters(
            contracts.community.communityGovernance.address
          )
        ).to.be.true

        expect(
          await contracts.monetary!.rebaseLever.authorized(
            contracts.monetary!.adapter.address
          )
        ).to.be.true
        expect(await contracts.monetary!.rebaseLever.notifier()).to.eq(
          contracts.monetary!.rebaseNotifier.address
        )

        let tx = await contracts.monetary!.rebaseNotifier.transactions(0)!
        expect(tx.target).to.eq('0x09bC52B9EB7387ede639Fc10Ce5Fa01CBCBf2b17')
        expect(tx.data).to.eq('0xfff6cae9')
        expect(tx.gasCost).to.eq(75000)

        tx = await contracts.monetary!.rebaseNotifier.transactions(1)!
        expect(tx.target).to.eq('0xAa029BbdC947F5205fBa0F3C11b592420B58f824')
        expect(tx.data).to.eq(
          '0x429046420000000000000000000000000000000000000000000000000000000000000000'
        )
        expect(tx.gasCost).to.eq(380000)

        expect(await contracts.monetary!.adapter.currencyGovernance()).to.eq(
          contracts.monetary!.monetaryGovernance.address
        )
        expect(
          await contracts.monetary!.monetaryGovernance.trustedNodes()
        ).to.eq(contracts.monetary!.trustedNodes.address)

        expect(
          await contracts.base.eco.voter(
            contracts.monetary!.lockupsLever.address!
          )
        ).to.be.true

        expect(
          await contracts.base.eco.minters(
            contracts.monetary!.lockupsLever.address!
          )
        ).to.be.true
        expect(
          await contracts.monetary!.lockupsLever.authorized(
            contracts.monetary!.adapter.address
          )
        ).to.be.true
        expect(await contracts.monetary!.lockupsLever.notifier()).to.eq(
          contracts.monetary!.lockupsNotifier.address
        )
      })

      it('can withdraw from staking contract', async () => {
        const aliceEcoxBalance = await baseContracts.ecox.balanceOf(
          alice.address
        )
        const withdrawAmount = ethers.utils.parseUnits('1', 'ether')
        await baseContracts.ecoXStaking.connect(alice).withdraw(withdrawAmount)
        expect(await baseContracts.ecox.balanceOf(alice.address)).to.eq(
          aliceEcoxBalance.add(withdrawAmount)
        )
      })

      it('can create a lockup (tests monetary governance cycle)', async () => {
        const contracts = new Fixture(
          baseContracts,
          communityGovernanceContracts,
          monetaryGovernanceContracts
        )

        const lockupRate = await contracts.monetary!.lockupsLever.MAX_RATE()
        const lockupDuration =
          await contracts.monetary!.lockupsLever.MIN_DURATION()

        // propose the monetary policy with the lockup
        const tx = await contracts
          .monetary!.monetaryGovernance.connect(bob)
          .propose(
            [contracts.monetary!.lockupsLever.address],
            [
              contracts.monetary!.lockupsLever.interface.getSighash(
                'createLockup'
              ),
            ],
            [
              `0x${contracts
                .monetary!.lockupsLever.interface.encodeFunctionData(
                  'createLockup',
                  [lockupDuration, lockupRate]
                )
                .slice(10)}`,
            ],
            'aoeu'
          )!
        // get proposalId from event cuz it's easier
        const receipt = await tx.wait()
        const proposalId = receipt.events?.find(
          (e) => e.event === 'ProposalCreation'
        )?.args?.id
        // move to next stage
        await time.increase(6 * DAY) // we are already 4 days into the cycle because of the previous community governance action
        // need cycle number
        const cycle =
          await contracts.monetary!.monetaryGovernance.getCurrentCycle()
        // build commit hash
        const salt = '0x' + '00'.repeat(32)
        const vote = [{ proposalId, score: 1 }]
        const commit = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            [
              'bytes32',
              'uint256',
              'address',
              '(bytes32 proposalId, uint256 score)[]',
            ],
            [salt, cycle, bob.address, vote]
          )
        )
        // vote proposal through
        await contracts.monetary!.monetaryGovernance.connect(bob).commit(commit)
        // next stage
        await time.increase(
          await contracts.monetary!.monetaryGovernance.VOTING_TIME()!
        )
        // reveal proposal
        await contracts.monetary!.monetaryGovernance.reveal(
          bob.address,
          salt,
          vote
        )
        // next stage
        await time.increase(
          await contracts.monetary!.monetaryGovernance.REVEAL_TIME()!
        )
        // execute proposal
        await contracts.monetary!.monetaryGovernance.enact()

        const lockupParams = await contracts.monetary!.lockupsLever.lockups(0)!
        const now = await time.latest()
        expect(lockupParams.depositWindowEnd).to.eq(now + LOCKUP_DEPOSIT_WINDOW)
        expect(lockupParams.end).to.eq(
          now + LOCKUP_DEPOSIT_WINDOW + lockupDuration!.toNumber()
        )
        expect(lockupParams.rate).to.eq(lockupRate)
      })

      it('can rebase (tests monetary governance cycle)', async () => {
        const contracts = new Fixture(
          baseContracts,
          communityGovernanceContracts,
          monetaryGovernanceContracts
        )

        const oldInflationMult = await contracts.base.eco.inflationMultiplier()
        const rebaseAmount = ethers.utils.parseUnits('2', 'ether') // 50% rebase

        // propose the monetary policy with the lockup
        const tx = await contracts
          .monetary!.monetaryGovernance.connect(bob)
          .propose(
            [contracts.monetary!.rebaseLever.address],
            [contracts.monetary!.rebaseLever.interface.getSighash('execute')],
            [
              `0x${contracts
                .monetary!.rebaseLever.interface.encodeFunctionData('execute', [
                  rebaseAmount,
                ])
                .slice(10)}`,
            ],
            'aoeu'
          )!
        // get proposalId from event cuz it's easier
        const receipt = await tx.wait()
        const proposalId = receipt.events?.find(
          (e) => e.event === 'ProposalCreation'
        )?.args?.id
        // move to next stage
        await time.increase(6 * DAY) // we are already 4 days into the cycle because of the previous community governance action
        // need cycle number
        const cycle =
          await contracts.monetary!.monetaryGovernance.getCurrentCycle()
        // build commit hash
        const salt = '0x' + '00'.repeat(32)
        const vote = [{ proposalId, score: 1 }]
        const commit = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            [
              'bytes32',
              'uint256',
              'address',
              '(bytes32 proposalId, uint256 score)[]',
            ],
            [salt, cycle, bob.address, vote]
          )
        )
        // vote proposal through
        await contracts.monetary!.monetaryGovernance.connect(bob).commit(commit)
        // next stage
        await time.increase(
          await contracts.monetary!.monetaryGovernance.VOTING_TIME()!
        )
        // reveal proposal
        await contracts.monetary!.monetaryGovernance.reveal(
          bob.address,
          salt,
          vote
        )
        // next stage
        await time.increase(
          await contracts.monetary!.monetaryGovernance.REVEAL_TIME()!
        )
        // execute proposal
        await contracts.monetary!.monetaryGovernance.enact()

        expect(await contracts.base.eco.inflationMultiplier()).to.eq(
          oldInflationMult
            .mul(rebaseAmount)
            .div(await contracts.base.eco.INITIAL_INFLATION_MULTIPLIER())
        )
      })
    })
  })
})
