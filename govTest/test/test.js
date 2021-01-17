const NFYStakingNFT = artifacts.require("NFYStakingNFT");
const NFYStaking = artifacts.require("NFYStaking");
const Token = artifacts.require("Demo");
const Time = artifacts.require('Timelock');
const Gov = artifacts.require('GovernorAlpha');
const truffleAssert = require("truffle-assertions");
const RewardPool = artifacts.require("RewardPool");
const helper = require('../utils/utils.js');
// const {
//     address,
//     etherMantissa,
//     encodeParameters,
//     mineBlock,
//     unlockedAccount
//   } = require('../utils/eth');

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

    before(async () => {
        // Owner address
        owner = accounts[1];

        user = accounts[3];

        user2 = accounts[4];

        user3 = accounts[5];

        testPlatform = accounts[6];

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

        // Transfer ownership to secured secured account
        await nfyStakingNFT.transferOwnership(owner);
        await nfyStaking.transferOwnership(owner);

        await token.faucet(user, initialBalance);
        await token.faucet(user2, initialBalance);
        await token.faucet(user3, initialBalance);

        time = await Time.new(owner,10);
        gov = await Gov.new(time.address,token.address,owner,nfyStakingNFT.address,nfyStaking.address);
     });


     describe("# stakeNFY()", () => {

        it('should let a user stake', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            await nfyStaking.stakeNFY(stakeAmount, {from: user});
            const stakedBal = BigInt(await nfyStaking.getNFTBalance(1)).toString()
            assert.strictEqual(stakeAmount.toString(),stakedBal);
        })
     })

     describe("Governance", () => {
         it('should let demo token holder deposit their tokens', async () => {
            await token.approve(gov.address, allowance, {from: user2});
            await gov.depositToken(initialBalance, {from: user2});
            const bal = BigInt(await token.balanceOf(user2)).toString()
            assert.strictEqual('0',bal);
         })

         it('should let stakeholder deposit their stakes', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            await nfyStaking.stakeNFY(stakeAmount, {from: user});
            const userNftIdBefore = BigInt(await nfyStakingNFT.nftTokenId(user)).toString()
            assert.strictEqual('1',userNftIdBefore);
            await nfyStakingNFT.approve(gov.address, 1, {from: user});
            await gov.depositStakedToken(1, {from: user});
            const userNftIdAfter = BigInt(await nfyStakingNFT.nftTokenId(user)).toString()
            assert.strictEqual('0',userNftIdAfter);
         })

     })

    })