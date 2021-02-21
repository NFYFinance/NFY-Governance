require('dotenv').config();

require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const p = process.env.PRIVATE_KEY
module.exports = {
  solidity: "0.6.10",
  networks: {
    kovan: {
      url: 'https://ropsten.infura.io/v3/c0f8460e5ac24f3396a45a1ba9f386a8',
      accounts: [p]
    }
  },
  etherscan: {
    apiKey: "2JPE8TQQUB3R2KUPHN3QXWID3XBV9ID1D7"
  }
};