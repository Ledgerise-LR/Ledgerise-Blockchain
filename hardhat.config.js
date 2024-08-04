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
const ETHEREUM_ETHERSCAN_API_KEY = process.env.ETHEREUM_ETHERSCAN_API_KEY || "key";
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || "key"
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || "key";
const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL || "key";
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "https://eth-sepolia";
const MUMBAI_RPC_URL = process.env.MUMBAI_RPC_URL || "https://polygon-mumbai";
const AMOY_RPC_URL = process.env.AMOY_RPC_URL || "https://polygon-amoy";
const CARDONA_API_URL = process.env.CARDONA_API_URL || "https://polygon-cardona"
const CARDONA_API_KEY = process.env.CARDONA_API_KEY || "key"
const AMOY_API_KEY = process.env.AMOY_API_KEY || "key";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.7",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000
          }
        }
      },
      { version: "0.8.0" },
      { version: "0.8.1" },
      { version: "0.6.6" }
    ]
  },
  defaultNetwork: "hardhat",
  etherscan: {
    apiKey: {
      goerli: ETHERSCAN_API_KEY,
      sepolia: ETHEREUM_ETHERSCAN_API_KEY,
      cardona: CARDONA_API_KEY,
      amoy: POLYGONSCAN_API_KEY,
      polygonMumbai: POLYGONSCAN_API_KEY
    },
    customChains: [
      {
        network: "cardona",
        chainId: 2442,
        urls: {
          apiURL: `https://api-cardona-zkevm.polygonscan.com/api`,
          browserURL: "https://cardona-zkevm.polygonscan.com/"
        }
      },
      {
        network: "amoy",
        chainId: 80002,
        urls: {
          apiURL: `https://api-amoy.polygonscan.com/api`,
          browserURL: "https://amoy.polygonscan.com/"
        }
      }
    ]
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
      blockConfirmations: 6
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
      blockConfirmations: 6
    },
    mumbai: {
      url: MUMBAI_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 80001,
      blockConfirmations: 6,
      allowUnlimitedContractSize: true
    },
    amoy: {
      url: AMOY_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 80002,
      blockConfirmations: 6
    },
    cardona: {
      url: CARDONA_API_URL,
      accounts: [PRIVATE_KEY],
      chainId: 2442,
      blockConfirmations: 6
    },
    localhost: {
      chainId: 31337,
      allowUnlimitedContractSize: true
    }
  },
  gasReporter: {
    enabled: true,
    outputFile: "gas-report.txt",
    noColors: true,
    currency: "TRY",
    coinmarketcap: COINMARKETCAP_API_KEY,
    token: "MATIC"
  },
  mocha: {
    timeout: 300000 // 300 seconds max
  }
}
