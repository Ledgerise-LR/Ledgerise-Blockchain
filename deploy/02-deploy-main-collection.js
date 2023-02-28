
const { ethers, network } = require("hardhat");
const { networkConfig, developmentChains } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");
require("dotenv").config();

module.exports = async ({ getNamedAccounts, deployments }) => {

  //  Goerli Address: 0x3847da94832345cC06736393CE46d41660662C29

  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()

  log("----------------------------------------------------")
  const marketplace = await ethers.getContract("Marketplace");
  arguments = [marketplace.address]
  const mainCollection = await deploy("MainCollection", {
    from: deployer,
    args: arguments,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  })

  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    await verify(mainCollection.address, arguments);
  }

}

module.exports.tags = ["all", "maincollection"];
