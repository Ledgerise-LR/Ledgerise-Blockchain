
const { verify } = require("../utils/verify");
const { ethers } = require("hardhat");
require("dotenv").config();

const verifyContract = async () => {

  const args = [];
  const marketplace = await ethers.getContract("Marketplace");
  await verify(marketplace.address, args);
}


verifyContract()
  .then(() => {
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  })

