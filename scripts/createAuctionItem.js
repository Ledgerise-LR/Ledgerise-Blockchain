
const { ethers, deployments, getNamedAccounts, network } = require("hardhat");

const PRICE = ethers.utils.parseEther("0.001");
const INTERVAL = 172800;

const createAuctionItem = async () => {
  const deployer = (await getNamedAccounts()).deployer;
  const marketplace = await ethers.getContract("Marketplace");
  const mainCollection = await ethers.getContract("MainCollection");

  const charityAddress = "0x9905a159Ed7b24c9a6Fe637cCF40653592224596";
  const creatorAddress = "0x59c0fa07599DB27758E1B7342541e4244Aae4d9F";

  // change tokenURI after uploading to PINATA !!!
  const tokenUri = "ipfs://QmU6MZvyiWa63aY6N9AqEbAR5T9A1UT9ZdnxUq8PeSm1Rz";

  const listTokenCounter = await marketplace.getListTokenCounter();
  const createAuctionToken = await marketplace.setAuction(
    mainCollection.address,
    listTokenCounter.toNumber(),
    PRICE,
    charityAddress,
    INTERVAL,
    tokenUri
  )

  await createAuctionToken.wait(1);
}

createAuctionItem()
  .then(() => {
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  })

