require("@nomicfoundation/hardhat-toolbox")
require("hardhat-deploy")
require("hardhat-gas-reporter")
require("solidity-coverage")
require("@nomiclabs/hardhat-etherscan")
require("dotenv").config()
require("hardhat-gas-reporter")
require("solidity-coverage")

const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL || "https://eth-goerli";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0xkey";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "key";
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || "key";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.7",
  defaultNetwork: "hardhat",
  etherscan: {
    apiKey: {
      goerli: ETHERSCAN_API_KEY
    }
  },
  namedAccounts: {
    deployer: {
      default: 0
    },
    player: {
      default: 1
    }
  },
  networks: {
    goerli: {
      url: GOERLI_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 5,
      blockConfirmations: 6,
    },
    localhost: {
      chainId: 31337,
    }
  },
  gasReporter: {
    enabled: true,
    outputFile: "gas-report.txt",
    noColors: true,
    currency: "TRY",
    coinmarketcap: COINMARKETCAP_API_KEY,
    token: "ETH"
  },
  mocha: {
    timeout: 300000 // 300 seconds max
  }
}
