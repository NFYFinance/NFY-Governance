const NFYStakingNFT = artifacts.require("NFYStakingNFT");
const NFYStaking = artifacts.require("NFYStaking");
const Token = artifacts.require("Demo");
const Time = artifacts.require('Timelock');
const Gov = artifacts.require('GovernorAlpha');
const truffleAssert = require("truffle-assertions");
const RewardPool = artifacts.require("RewardPool");
const helper = require('../utils/utils.js');
const ethers = require('ethers');

contract("NFY Governance Contract", async (accounts) => {

   let owner;
   let rewardPool;
   let user;
   let user2;
   let user3;
   let rewardTokensBefore
   let token;
   let nfyStakingNFT;
   let nfyStaking;
   let initialBalance;
   let stakeAmount;
   let time;
   let gov;

   function encodeParameters(types, values) {
   const abi = new ethers.utils.AbiCoder();
   return abi.encode(types, values);
   }

   before(async () => {
      // Owner address
      owner = accounts[1];

      user = accounts[3];

      user2 = accounts[4];

      user3 = accounts[5];

      user4 = accounts[6];

      initialBalanceBefore = 1000
      allowanceBefore = 2000;
      stakeAmountBefore = 5;
      moreThanBalanceBefore = 1005;
      rewardTokensBefore = 60000

      initialBalance = web3.utils.toWei(initialBalanceBefore.toString(), 'ether');
      allowance = web3.utils.toWei(allowanceBefore.toString(), 'ether');
      stakeAmount = web3.utils.toWei(stakeAmountBefore.toString(), 'ether');
      moreThanBalance = web3.utils.toWei(moreThanBalanceBefore.toString(), 'ether');
      rewardTokens = web3.utils.toWei(rewardTokensBefore.toString(), 'ether');

   });

   beforeEach(async () => {
      token = await Token.new();

      // Token deployment
      nfyStakingNFT = await NFYStakingNFT.new();

      rewardPool = await RewardPool.new(token.address);

      token.faucet(rewardPool.address, rewardTokens);

      // Funding deployment
      nfyStaking = await NFYStaking.new(token.address, nfyStakingNFT.address, nfyStakingNFT.address, rewardPool.address, 10);

      // Add NFY Staking contract as a platform address
      await nfyStakingNFT.addPlatformAddress(nfyStaking.address);

      await rewardPool.allowTransferToStaking(nfyStaking.address, rewardTokens);

      await token.faucet(user, initialBalance);
      await token.faucet(user2, initialBalance);
      await token.faucet(user3, initialBalance);

      time = await Time.new(owner,10);
      gov = await Gov.new(time.address,token.address,owner,nfyStakingNFT.address,nfyStaking.address);

      await token.approve(nfyStaking.address, allowance, {from: user});
      await nfyStaking.stakeNFY(stakeAmount, {from: user});
   });

   describe("Deposit & Withdraw demo tokens", () => {

      it('should let demo token holder deposit their tokens', async () => {
         const balBefore = BigInt(await token.balanceOf(user2)).toString()
         assert.strictEqual(initialBalance.toString(),balBefore);

         const amountDepositedBefore = await gov.userDetails(user2);
         assert.strictEqual(amountDepositedBefore.tokenRecord.toString(), '0')

         await token.approve(gov.address, allowance, {from: user2});
         await gov.depositToken(initialBalance, {from: user2});

         const balAfter = BigInt(await token.balanceOf(user2)).toString()
         assert.strictEqual('0',balAfter);

         const amountDepositedAfter = await gov.userDetails(user2);
         assert.strictEqual(amountDepositedAfter.tokenRecord.toString(), initialBalance.toString())
         
      })

      it('should let demo token holder withdraw their tokens', async () => {
         await token.approve(gov.address, allowance, {from: user2});
         await gov.depositToken(initialBalance, {from: user2});

         const balBefore = BigInt(await token.balanceOf(user2)).toString()
         assert.strictEqual('0',balBefore);

         const amountDepositedBefore = await gov.userDetails(user2);
         assert.strictEqual(amountDepositedBefore.tokenRecord.toString(), initialBalance.toString())

         await gov.withdrawToken(initialBalance, {from: user2});

         const balAfter = BigInt(await token.balanceOf(user2)).toString()
         assert.strictEqual(initialBalance.toString(),balAfter);

         const amountDepositedAfter = await gov.userDetails(user2);
         assert.strictEqual(amountDepositedAfter.tokenRecord.toString(), '0')
      })

      it('should revert if user has no demo token', async () => {
         const bal = BigInt(await token.balanceOf(user4)).toString()
         assert.strictEqual('0',bal);

         await token.approve(gov.address, allowance, {from: user4});
         await truffleAssert.reverts(gov.depositToken(initialBalance, {from: user4}));
      })

      it('should revert if user did not approve demo token', async () => {
         const bal = BigInt(await token.balanceOf(user3)).toString()
         assert.strictEqual(initialBalance.toString(),bal);

         await truffleAssert.reverts(gov.depositToken(initialBalance, {from: user3}));
      })

   })

   describe("Deposit & Withdraw staked tokens", () => {

      it('should let stakeholder deposit their staked tokens', async () => {
         const userNftIdBefore = BigInt(await nfyStakingNFT.nftTokenId(user)).toString();
         assert.strictEqual('1',userNftIdBefore);

         const amountDepositedBefore = await gov.userDetails(user);
         assert.strictEqual(amountDepositedBefore.stakeRecord.toString(), '0')

         await nfyStakingNFT.approve(gov.address, 1, {from: user});
         await gov.depositStakedToken(1, {from: user});

         const userNftIdAfter = BigInt(await nfyStakingNFT.nftTokenId(user)).toString()
         assert.strictEqual('0',userNftIdAfter);

         const balance = await nfyStaking.getNFTBalance(1);

         const amountDepositedAfter = await gov.userDetails(user);
         assert.strictEqual(amountDepositedAfter.stakeRecord.toString(), balance.toString())
      })

      it('should let stakeholder withdraw their staked tokens', async () => {
         await nfyStakingNFT.approve(gov.address, 1, {from: user});
         await gov.depositStakedToken(1, {from: user});

         const userNftIdBefore = BigInt(await nfyStakingNFT.nftTokenId(user)).toString();
         assert.strictEqual('0',userNftIdBefore);

         const balance = await nfyStaking.getNFTBalance(1);

         const amountDepositedBefore = await gov.userDetails(user);
         assert.strictEqual(amountDepositedBefore.stakeRecord.toString(), balance.toString())

         await gov.withdrawStakedToken(1, {from: user});

         const userNftIdAfter = BigInt(await nfyStakingNFT.nftTokenId(user)).toString();
         assert.strictEqual('1',userNftIdAfter);

         const amountDepositedAfter = await gov.userDetails(user);
         assert.strictEqual(amountDepositedAfter.stakeRecord.toString(), '0')
      })

      it('should revert if user has staked tokens', async () => {
         const bal = BigInt(await nfyStakingNFT.balanceOf(user4)).toString()
         assert.strictEqual('0',bal);

         await token.approve(gov.address, 1, {from: user4});
         await truffleAssert.reverts(gov.depositStakedToken(1, {from: user4}));
      })

      it('should revert if user did not approve staked tokens', async () => {
         const bal = BigInt(await nfyStakingNFT.balanceOf(user)).toString()
         assert.strictEqual('1',bal);

         await truffleAssert.reverts(gov.depositStakedToken(1, {from: user}));
      })

   })

   describe("User Info", () => {

      it('should let a user deposit stake and demo token', async () => {
         await token.faucet(user, initialBalance);

         const amountDepositedBefore = await gov.userDetails(user);
         assert.strictEqual(amountDepositedBefore.stakeRecord.toString(),'0')
         assert.strictEqual(amountDepositedBefore.tokenRecord.toString(),'0')

         await nfyStakingNFT.approve(gov.address, 1, {from: user});
         await gov.depositStakedToken(1, {from: user});

         await token.approve(gov.address, allowance, {from: user});
         await gov.depositToken(initialBalance, {from: user});

         const balance = await nfyStaking.getNFTBalance(1);

         const amountDepositedAfter = await gov.userDetails(user);
         assert.strictEqual(amountDepositedAfter.stakeRecord.toString(),balance.toString())
         assert.strictEqual(amountDepositedAfter.tokenRecord.toString(),initialBalance.toString())

         const votePower = Number(balance) + Number(initialBalance)
         assert.strictEqual(amountDepositedAfter.votePower.toString(),BigInt(votePower).toString())
      })

      it('should revert if user wants to withdraw more than he deposited', async () => {
         await token.faucet(user, initialBalance);

         await nfyStakingNFT.approve(gov.address, 1, {from: user});
         await gov.depositStakedToken(1, {from: user});

         await token.approve(gov.address, allowance, {from: user});
         await gov.depositToken(initialBalance, {from: user});

         await truffleAssert.reverts(gov.withdrawToken(moreThanBalance, {from: user}));
      })

   })

   describe("Passing Gov Contract Addr as Timelock Admin", () => {

      it('should transfer timelock admin to governance contract address', async () => {
         const timeAddressBefore = await time.admin();
         assert.strictEqual(timeAddressBefore, owner);

         let delay = 12;
         let blockTime = await time.getBlockTimestamp()
         let eta = Number(blockTime) + Number(delay);
         
         await time.queueTransaction(
            time.address,
            0,
            'setPendingAdmin(address)',
            encodeParameters(['address'], [gov.address]),
            eta,
            {from:owner}
         )

         await helper.advanceTime(20);

         await time.executeTransaction(
            time.address,
            0,
            'setPendingAdmin(address)',
            encodeParameters(['address'], [gov.address]),
            eta,
            {from:owner}
         )
      
         await gov.__acceptAdmin({from:owner});

         const timeAddressAfter = await time.admin();
         assert.strictEqual(timeAddressAfter, gov.address);
      })

   })

   describe("Create Proposal", () => {

      beforeEach(async () => {
         await token.approve(gov.address, allowance, {from: user2});
         await gov.depositToken(initialBalance, {from: user2});
      })

      it('should create a proposal', async () => {
         await gov.propose(
            [nfyStaking.address],
            [0],
            ['setDailyReward(uint256)'],
            [encodeParameters(['uint256'], [200])],
            'change daily reward',
            {from:user2}
         )

         const id = await gov.latestProposalIds(user2);
         const proposalInfo = await gov.getActions(id);

         assert.strictEqual(proposalInfo.targets[0], nfyStaking.address);
      })

      it('should revert if user voting power is below proposalThreshold', async () => {
         await token.approve(gov.address, allowance, {from: user3});
         await gov.depositToken(stakeAmount, {from: user3});

         await truffleAssert.reverts(gov.propose(
            [nfyStaking.address],
            [0],
            ['setDailyReward(uint256)'],
            [encodeParameters(['uint256'], [200])],
            'change daily reward',
            {from:user3}
         ))
      })

      it('should revert if parameter array length are not equal', async () => {
         await truffleAssert.reverts(gov.propose(
            [nfyStaking.address],
            [0,0],
            ['setDailyReward(uint256)'],
            [encodeParameters(['uint256'], [200])],
            'change daily reward',
            {from:user2}
         ))
      })

      it('should revert if parameter array length is equal to 0', async () => {
         await truffleAssert.reverts(gov.propose(
            [],
            [],
            [],
            [],
            'change daily reward',
            {from:user2}
         ))

      })

   })

   describe("Voting", () => {

      beforeEach(async () => {
         await token.faucet(user, initialBalance);

         await token.approve(gov.address, allowance, {from: user2});
         await gov.depositToken(initialBalance, {from: user2});

         await token.approve(gov.address, allowance, {from: user3});
         await gov.depositToken(initialBalance, {from: user3});

         await token.approve(gov.address, allowance, {from: user});
         await gov.depositToken(initialBalance, {from: user});

         await gov.propose(
            [nfyStaking.address],
            [0],
            ['setDailyReward(uint256)'],
            [encodeParameters(['uint256'], [200])],
            'change daily reward',
            {from:user2}
         )

         await helper.advanceBlock()
         await helper.advanceBlock()
         
      })

      it('should let users vote on a proposal', async () => {

         await gov.castVote(1,true, {from:user});
         await gov.castVote(1,true, {from:user2});
         await gov.castVote(1,false, {from:user3});

         const tokensFromTwoVoters = initialBalance * 2;

         const id = await gov.latestProposalIds(user2);
         const proposalInfo = await gov.proposals(id);

         assert.strictEqual(BigInt(proposalInfo.forVotes).toString(),BigInt(tokensFromTwoVoters).toString());
         assert.strictEqual(BigInt(proposalInfo.againstVotes).toString(),initialBalance.toString());
      })

      it('proposal should be a success', async () => {

         await gov.castVote(1,true, {from:user});
         await gov.castVote(1,true, {from:user2});
         await gov.castVote(1,false, {from:user3});

         const loop = await gov.votingPeriod();

         for(let i = 0; i < loop; i++){
            await helper.advanceBlock()
         }

         const success = '4'
         const returedState = await gov.state(1);

         assert.strictEqual(success,returedState.toString());

      })

      it('proposal should be defeated', async () => {

         await gov.castVote(1,true, {from:user});
         await gov.castVote(1,false, {from:user2});
         await gov.castVote(1,false, {from:user3});

         const loop = await gov.votingPeriod();

         for(let i = 0; i < loop; i++){
            await helper.advanceBlock()
         }

         const success = '3'
         const returedState = await gov.state(1);

         assert.strictEqual(success,returedState.toString());

      })

      it('should revert if user wants to vote more than once', async () => {

         await gov.castVote(1,true, {from:user});

         await truffleAssert.reverts(gov.castVote(1,true, {from: user}))
      })

      it('should revert if user wants to withdraw demo token while voted proposal is still active', async () => {
         await gov.castVote(1,true, {from:user2});

         await truffleAssert.reverts(gov.withdrawToken(initialBalance, {from: user2}))
      })

      it('should let user withdraw demo token after voted proposal has ended', async () => {
         await gov.castVote(1,true, {from:user2});

         for(let i = 0; i < 8; i++){
            await helper.advanceBlock()
         }
         const balBefore = BigInt(await token.balanceOf(user2)).toString()
         assert.strictEqual('0',balBefore);

         await gov.withdrawToken(initialBalance, {from: user2})

         const balAfter = BigInt(await token.balanceOf(user2)).toString()
         assert.strictEqual(initialBalance.toString(),balAfter);

         const amountDepositedAfter = await gov.userDetails(user2);
         assert.strictEqual(amountDepositedAfter.tokenRecord.toString(), '0')
      })

   })

   describe("Queuing & Excuting Proposal", () => {

      beforeEach(async () => {
         let delay = 12;
         let blockTime = await time.getBlockTimestamp()
         let eta = Number(blockTime) + Number(delay);
         
         await time.queueTransaction(
            time.address,
            0,
            'setPendingAdmin(address)',
            encodeParameters(['address'], [gov.address]),
            eta,
            {from:owner}
         )

         await helper.advanceTime(20);

         await time.executeTransaction(
            time.address,
            0,
            'setPendingAdmin(address)',
            encodeParameters(['address'], [gov.address]),
            eta,
            {from:owner}
         )
      
         await gov.__acceptAdmin({from:owner});

         await token.faucet(user, initialBalance);

         await token.approve(gov.address, allowance, {from: user2});
         await gov.depositToken(initialBalance, {from: user2});

         await token.approve(gov.address, allowance, {from: user3});
         await gov.depositToken(initialBalance, {from: user3});

         await token.approve(gov.address, allowance, {from: user});
         await gov.depositToken(initialBalance, {from: user});

         await gov.propose(
            [nfyStaking.address],
            [0],
            ['setDailyReward(uint256)'],
            [encodeParameters(['uint256'], [200])],
            'change daily reward',
            {from:user2}
         )

         await helper.advanceBlock()
         await helper.advanceBlock()

         await gov.castVote(1,true, {from:user});
         await gov.castVote(1,true, {from:user2});
         await gov.castVote(1,false, {from:user3});
         
      })

      it('should revert queue if proposal has not ended', async () =>{
         await truffleAssert.reverts( gov.queue(1));
      })

      it('should successfully queue a proposal', async () =>{
         const loop = await gov.votingPeriod();

         for(let i = 0; i < loop; i++){
            await helper.advanceBlock()
         }

         await gov.queue(1);

         const queued = '5'
         const returedState = await gov.state(1);

         assert.strictEqual(queued,returedState.toString());
      })

      it('should not cancel queued proposal if call is not coming from guardian', async () => {
         const loop = await gov.votingPeriod();

         for(let i = 0; i < loop; i++){
            await helper.advanceBlock()
         }

         await gov.queue(1);
         await truffleAssert.reverts(gov.cancel(1, {from:user}));
      })

      it('should cancel queued proposal', async () => {
         const loop = await gov.votingPeriod();

         for(let i = 0; i < loop; i++){
            await helper.advanceBlock()
         }

         await gov.queue(1);
         await gov.cancel(1, {from:owner});

         const canceled = '2'
         const returedState = await gov.state(1);

         assert.strictEqual(canceled,returedState.toString());

      })

      it('should revert when executing proposal if staking contract owner is not timelock contract addr. ', async () => {
         const loop = await gov.votingPeriod();

         for(let i = 0; i < loop; i++){
            await helper.advanceBlock()
         }

         await gov.queue(1);

         await truffleAssert.reverts(gov.execute(1));

      })

      it('should execute proposal ', async () => {
         await nfyStaking.transferOwnership(time.address);

         const dailyRewardBefore = await nfyStaking.dailyReward();
         assert.strictEqual('10',dailyRewardBefore.toString());

         const loop = await gov.votingPeriod();

         for(let i = 0; i < loop; i++){
            await helper.advanceBlock()
         }

         await gov.queue(1);

         await helper.advanceTime(20);

         await gov.execute(1);

         const executed = '7'
         const returedState = await gov.state(1);

         assert.strictEqual(executed,returedState.toString());

         const dailyRewardAfter = await nfyStaking.dailyReward();
         assert.strictEqual('200',dailyRewardAfter.toString());
      })

      it('should not cancel proposal if proposal has bee executed', async () => {
         await nfyStaking.transferOwnership(time.address);

         const loop = await gov.votingPeriod();

         for(let i = 0; i < loop; i++){
            await helper.advanceBlock()
         }

         await gov.queue(1);

         await helper.advanceTime(20);

         await gov.execute(1);

         await truffleAssert.reverts(gov.cancel(1, {from:owner}));
      })

   })

})