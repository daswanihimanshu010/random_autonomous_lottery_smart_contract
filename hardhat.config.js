/** @type import('hardhat/config').HardhatUserConfig */
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-deploy");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("hardhat-contract-sizer");
require("dotenv").config();

const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL;
const GOERLI_PRIVATE_KEY_ACCOUNT1 = process.env.GOERLI_PRIVATE_KEY_ACCOUNT1;
const ETHER_SCAN_API_KEY = process.env.ETHER_SCAN_API_KEY;
const COIN_MARKET_CAP = process.env.COIN_MARKET_CAP;

module.exports = {
  solidity: "0.8.8",
  namedAccounts: {
    deployer: {
      default: 0,
    },
    player: {
      default: 1,
    },
  },
  defaultNetwork: "hardhat",
  networks: {
    goerli: {
      url: GOERLI_RPC_URL,
      accounts: [GOERLI_PRIVATE_KEY_ACCOUNT1],
      chainId: 5,
      blockConfirmations: 6,
    },
    localhost: {
      url: "http://127.0.0.1:8545/",
      chainId: 31337,
      blockConfirmations: 1,
    },
  },
  etherscan: {
    apiKey: ETHER_SCAN_API_KEY,
  },
  gasReporter: {
    enabled: false, // set it to true to enable gas reporting
    outputFile: "gas-report.txt",
    noColors: true,
    currency: "USD",
    coinmarketcap: COIN_MARKET_CAP,
    token: "ETH",
  },
  mocha: {
    timeout: 300000, // 300 seconds max
  },
};
