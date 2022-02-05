const Farm = artifacts.require("Farm");
const Coin = artifacts.require("Coin");
const FarmTkn = artifacts.require("FarmTkn");

module.exports = async function (deployer) {
  await deployer.deploy(Coin).then(async() =>{
    await deployer.deploy(FarmTkn).then(async() => {
      await deployer.deploy(Farm, Coin.address, FarmTkn.address);
    })
  }
  )
};
