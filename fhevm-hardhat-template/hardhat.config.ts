import * as dotenv from "dotenv";
dotenv.config();

import "@fhevm/hardhat-plugin";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "@typechain/hardhat";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import type { HardhatUserConfig } from "hardhat/config";
import "solidity-coverage";

import "./tasks/accounts";
import "./tasks/FHECounter";

const mnemonic = process.env.MNEMONIC ?? "test test test test test test test test test test test junk";
const INFURA_API_KEY = process.env.INFURA_API_KEY ?? "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY ?? "";

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  namedAccounts: { deployer: 0 },
  etherscan: {
    apiKey: { sepolia: ETHERSCAN_API_KEY },
  },
  networks: {
    hardhat: {
      accounts: { mnemonic, initialIndex: 0 },
      chainId: 31337,
    },
    anvil: {
      url: "http://localhost:8545",
      chainId: 31337,
      accounts: {
        mnemonic,
        path: "m/44'/60'/0'/0/",
        initialIndex: 0,
        count: 10,
      },
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
      chainId: 11155111,
      accounts: {
        mnemonic,
        path: "m/44'/60'/0'/0/",
        initialIndex: 0,
        count: 10,
      },
    },
  },
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 800 },
      evmVersion: "cancun",
      viaIR: true,
    },
  },
  typechain: { outDir: "types", target: "ethers-v6" },
};

export default config;
