const NFYStakingNFT = artifacts.require("NFYStakingNFT");
const NFYStaking = artifacts.require("NFYStaking");
const Token = artifacts.require("Demo");
const Time = artifacts.require('Timelock');
const Gov = artifacts.require('GovernorAlpha');
const truffleAssert = require("truffle-assertions");
const RewardPool = artifacts.require("RewardPool");
const helper = require('../utils/utils.js');
const ethers = require('ethers');

contract("NFYStaking", async (accounts) => {

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

   async function rpc(request) {
   return new Promise((okay, fail) => web3.currentProvider.send(request, (err, res) => err ? fail(err) : okay(res)));
   }

   async function advanceBlocks(blocks) {
   let { result: num } = await rpc({ method: 'eth_blockNumber' });
   await rpc({ method: 'evm_mineBlockNumber', params: [blocks + parseInt(num)] });
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

      // Transfer ownership to secured secured account
      await nfyStakingNFT.transferOwnership(gov.address);
      await nfyStaking.transferOwnership(gov.address);

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

         await helper.advanceTime(2000);

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

      it('should create a proposal', async () => {
         await token.approve(gov.address, allowance, {from: user2});
         await gov.depositToken(initialBalance, {from: user2});

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

   })

})