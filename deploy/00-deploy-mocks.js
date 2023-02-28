
const { ethers, network } = require("hardhat");
const { networkConfig, developmentChains } = require("../helper-hardhat-config");

module.exports = async ({ getNamedAccounts, deployments }) => {

  // goerli address: 0x4fBD86f75A18A6C0c6E9FF68f38cA26CeB8A8035

  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()

  log("----------------------------------------------------")
  arguments = []
  const basicNft = await deploy("BasicNft", {
    from: deployer,
    args: arguments,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  })

}

module.exports.tags = ["all", "basicnft", "main"]
