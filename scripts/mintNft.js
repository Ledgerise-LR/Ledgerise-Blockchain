
const { ethers, getNamedAccounts } = require("hardhat");

const PRICE = ethers.utils.parseEther("0.01");
const AVAILABLE_EDITIONS = 5;

const mintItem = async () => {
  const deployer = (await getNamedAccounts()).deployer;
  console.log(deployer)
  const marketplace = await ethers.getContract("Marketplace", deployer);
  const mainCollection = await ethers.getContract("MainCollection");

  const tokenUri = "https://bafybeihklnl37pzyfwnaxzoihxmne2srhug6i6pw2tuyohngcwy5xrkxti.ipfs.dweb.link/";

  const tx = await mainCollection.connect(marketplace.address).mintNft(1, tokenUri, deployer);
  await tx.wait(1);
  console.log("NFT minted successfully!");
}

mintItem()
  .then(() => {
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  })

