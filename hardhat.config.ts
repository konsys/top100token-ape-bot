import { HardhatUserConfig } from "hardhat/config";
import 'hardhat-deploy';
import "@nomicfoundation/hardhat-toolbox";
import 'hardhat-deploy';
import { config as dotEnvConfig } from "dotenv";
dotEnvConfig();
// import 'hardhat-deploy-ethers';

const ARBDEV_PRIVATE_KEY = process.env.ARBDEV_PRIVATE_KEY as string

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.27',
  },
  namedAccounts: {
    deployer: {
      default: 0, // here this will by default take the first account as deployer
    }
  },
  paths: {
    sources: 'contracts',
  },

  networks: {
    // arbitrum: {
    //   forking: {
    //     url: "https://arbitrum-one.chainnodes.org/72ae682a-b3a9-4fea-8c42-60d08228ea26 ",
    //     blockNumber: 14390000
    //   }
    // },
    // arbdevLev2: {
    //   url: 'http://localhost:8547',
    //   chainId: 412346,
    //   accounts: [ARBDEV_PRIVATE_KEY],
    // },
    arbdevLev1: {
      url: 'http://localhost:8545',
      chainId: 1337,
      accounts: [ARBDEV_PRIVATE_KEY],
    }
  }
};

export default config;
// anvil --fork-url https://mainnet.chainnodes.org/72ae682a-b3a9-4fea-8c42-60d08228ea26--fork-block-number 17480237 --fork-chain-id 1 --chain-id 1
// https://arbitrum-one.chainnodes.org/72ae682a-b3a9-4fea-8c42-60d08228ea26

// anvil --fork-url https://mainnet.chainnodes.org/72ae682a-b3a9-4fea-8c42-60d08228ea26 --fork-block-number 17480237 --fork-chain-id 1 --chain-id 1
// anvil --fork-url https://arbitrum-one.chainnodes.org/72ae682a-b3a9-4fea-8c42-60d08228ea26 --fork-block-number 17480237 --fork-chain-id 1 --chain-id 1

// npx hardhat node --fork https://arbitrum-one.chainnodes.org/72ae682a-b3a9-4fea-8c42-60d08228ea26 