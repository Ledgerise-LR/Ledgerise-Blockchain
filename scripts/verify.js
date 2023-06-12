
const { verify } = require("../utils/verify");
const { ethers } = require("hardhat");
require("dotenv").config();

const verifyContract = async () => {

  const marketplace = await ethers.getContract("Marketplace");
  const args = [marketplace.address];

  const mainCollection = await ethers.getContract("MainCollection");
  await verify(mainCollection.address, args);
}


verifyContract()
  .then(() => {
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  })

