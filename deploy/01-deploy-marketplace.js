
const { ethers, network } = require("hardhat");
const { developmentChains, networkConfig } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");
require("dotenv").config();

// Goerli Address 0xf56ef14AA4788c9fD54d56e0FC8684f08B7628aa

module.exports = async ({ deployments, getNamedAccounts }) => {

  const { deploy, log } = await deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;

  const args = [];

  log("-----------------------------");

  const marketplace = await deploy("Marketplace", {
    from: deployer,
    log: true,
    args: args,
    waitConfirmations: network.config.blockConfirmations || 1
  });

  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    await verify(marketplace.address, args);
  }
}

module.exports.tags = ["all", "main", "marketplace"];
