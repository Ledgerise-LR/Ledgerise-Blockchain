const { ethers } = require("hardhat");

const networkConfig = {
  5: {
    name: "goerli",
    vrfCoordinatorAddress: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
    entranceFee: ethers.utils.parseEther("0.01"),
    gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
    subscriptionId: "8502",
    callbackGasLimit: 500000,
    interval: "30"
  },
  11155111: {
    name: "sepolia",
    vrfCoordinatorAddress: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
    entranceFee: ethers.utils.parseEther("0.01"),
    gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
    subscriptionId: "8502",
    callbackGasLimit: 500000,
    interval: "30",
    ethUsdPriceFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
    EurUsdPriceFeed: "0x1a81afB8146aeFfCFc5E50e8479e826E7D55b910"
  },
  31337: {
    name: "hardhat",
    entranceFee: ethers.utils.parseEther("0.01"),
    gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
    callbackGasLimit: 500000,
    interval: "30"
  }
}

const DECIMALS = 8;
const INITIAL_ANSWER = 200000000000;

const developmentChains = ["localhost", "hardhat"]

module.exports = { networkConfig, developmentChains, DECIMALS, INITIAL_ANSWER };
