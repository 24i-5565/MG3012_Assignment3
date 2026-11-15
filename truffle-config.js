/**
 * Truffle configuration for MG3012 Assignment 3.
 * Connects to a local Ganache blockchain and compiles with Solidity 0.8.20.
 */

module.exports = {
  networks: {
    // Ganache CLI (`ganache`) listens on 127.0.0.1:8545, chain ID 1337.
    // If you use the Ganache desktop app instead, change port to 7545.
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*", // match any network id
    },
  },

  // Default mocha options for `truffle test`
  mocha: {
    // timeout: 100000
  },

  compilers: {
    solc: {
      version: "0.8.20", // must satisfy the contract's pragma
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
        // Ganache v7 does not support the PUSH0 opcode introduced in "shanghai",
        // so compile for the "paris" EVM to avoid deployment errors.
        evmVersion: "paris",
      },
    },
  },
};
