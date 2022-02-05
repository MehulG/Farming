const {
  time,    
  expectRevert
} = require('@openzeppelin/test-helpers');
const BN = web3.utils.toBN;

const Farm = artifacts.require("Farm");
const Coin = artifacts.require("Coin");
const FarmTkn = artifacts.require("FarmTkn");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("Farm", function (accounts) {
  let owner = accounts[0];
  let user = accounts[1];
  let user1 = accounts[2];
  let user2 = accounts[3];
  let user3 = accounts[4];
  let user4 = accounts[5];


  let FARM, COIN, FARMTKN;
  let amount = "10000000000"

  const destributeCoin = async (user) =>{
    await COIN.transfer(user, amount);
  }
  
  beforeEach('should setup the contract farm', async () => {
    FARM = await Farm.deployed();
    COIN = await Coin.deployed();
    FARMTKN = await FarmTkn.deployed();
  });

  it("should verify coin and farm tkn address", async () => {
    const coin_address = await FARM.coin();
    assert.equal(coin_address, COIN.address);
    const farmtkn_address = await FARM.farmToken();
    assert.equal(farmtkn_address, FARMTKN.address);
  });

  it("should expect revert with low allowance on deposit and invalid lock period", async () => {
    destributeCoin(user);
    bal = await FARMTKN.balanceOf(owner);
    await FARMTKN.transfer(FARM.address, bal);
    await COIN.approve(FARM.address, "1");
    await expectRevert(
      FARM.deposit(amount, "0"),
      'Check the coin allowance',
    );
    await expectRevert(
      FARM.deposit("0", "12"),
      '_amount should be  greater than 0',
    );
    await expectRevert(
      FARM.deposit("1", "10"),
      '_lockupPeriod can either be 0/6/12 months',
    );
  });

  it("should be able to deposit", async () => {
    await COIN.approve(FARM.address, amount, { from: user });
    await FARM.deposit(amount, "0", { from: user });
    usrBal = (await FARM.user(user)).amount;
    assert.equal(usrBal.toString(), amount);
  });

  it("should be able to withdraw", async () => {    
    time.increase(50000)
    await expectRevert(
      FARM.withdraw({from: user1}),
      'nothing to withdraw',
    );
    await FARM.withdraw({ from: user });
    bal = await COIN.balanceOf(user);
    assert.equal(bal.toString(),amount)
    balFarmTkn = await FARMTKN.balanceOf(user);
  });


  it("should be able to withdraw and 10% cut before lock", async () => {   
    await COIN.transfer(user1, amount);
    beforeBal = await COIN.balanceOf(user1);
    await COIN.approve(FARM.address,amount, {from: user1});
    await FARM.deposit(amount, "12", { from: user1 });
    time.increase(50000)
    await FARM.withdraw({ from: user1 });
    afterBal = await COIN.balanceOf(user1);
    balFarmTkn = await FARMTKN.balanceOf(user1);
    //assert fARMTKN transfered
    assert.isTrue(BN(balFarmTkn.toString()).gt(BN("0")));
    //assert 10% COIN transfered
    assert.equal(afterBal.toString(),((BN(beforeBal.toString()).mul(BN("9")).div(BN("10")))).toString())
  });

  it("should check distribution of rewards", async () => {
    //checking FARMTKN is getting distributed   
    await COIN.transfer(user2, amount);
    beforeBal = await COIN.balanceOf(user2);
    await COIN.approve(FARM.address,amount, {from: user2});
    await FARM.deposit(amount, "6", { from: user2 });

    depositTime = (await FARM.user(user2)).depositTime;

    //time 6 months
    time.increase(6*30*24*60*60)

    await FARM.withdraw({ from: user2 });
    balFarmTkn = await FARMTKN.balanceOf(user2);
    blocktime = await time.latest()
    
    expected = (BN(amount.toString()).mul(BN("20")).mul(BN(blocktime).sub(depositTime))).div(BN("86400").mul(BN("365")).mul(BN("100")));

    //assert FARMTKN transfered
    assert.equal(expected.toString(), BN(balFarmTkn).toString());


    await COIN.transfer(user3, amount);
    beforeBal = await COIN.balanceOf(user3);
    await COIN.approve(FARM.address,amount, {from: user3});
    await FARM.deposit(amount, "12", { from: user3 });

    depositTime = (await FARM.user(user3)).depositTime;

    //time 12 months
    time.increase(12*30*24*60*60)

    await FARM.withdraw({ from: user3 });
    balFarmTkn = await FARMTKN.balanceOf(user3);
    blocktime = await time.latest()
    
    expected = (BN(amount.toString()).mul(BN("30")).mul(BN(blocktime).sub(depositTime))).div(BN("86400").mul(BN("365")).mul(BN("100")));

    //assert FARMTKN transfered
    assert.equal(expected.toString(), BN(balFarmTkn).toString());

    


    await COIN.transfer(user4, amount);
    beforeBal = await COIN.balanceOf(user4);
    await COIN.approve(FARM.address,amount, {from: user4});
    await FARM.deposit(amount, "0", { from: user4 });

    depositTime = (await FARM.user(user4)).depositTime;

    //time 3 months
    time.increase(3*30*24*60*60)

    await FARM.withdraw({ from: user4 });
    balFarmTkn = await FARMTKN.balanceOf(user4);
    blocktime = await time.latest()
    
    expected = (BN(amount.toString()).mul(BN("10")).mul(BN(blocktime).sub(depositTime))).div(BN("86400").mul(BN("365")).mul(BN("100")));

    //assert FARMTKN transfered
    assert.equal(expected.toString(), BN(balFarmTkn).toString());

  });
});
