
const { ethers, network } = require("hardhat");
const { networkConfig, developmentChains } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");
require("dotenv").config();

module.exports = async ({ getNamedAccounts, deployments }) => {

  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()

  log("----------------------------------------------------")
  const arguments = [
    "0x0000000000000000000000000000000000000000",
    "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    "0x6090149792dAAeE9D1D568c9f9a6F6B46AA29eFD",
    ["urlBTC", "urlUSD", "urlEUR"],
    [
      {
        url: "https://min-api.cryptocompare.com/data/price",
        pathLabel: "pathBTC",
        path: "BTC"
      },
      {
        url: "https://min-api.cryptocompare.com/data/price",
        pathLabel: "pathUSD",
        path: "USD"
      },
      {
        url: "https://min-api.cryptocompare.com/data/price",
        pathLabel: "pathEUR",
        path: "EUR"
      },
    ]
  ];
  const entegrasyon = await deploy("Entegrasyon", {
    from: deployer,
    args: arguments,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  })

  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    await verify(entegrasyon.address, arguments);
  }

}

module.exports.tags = ["all", "main", "entegrasyon"];
