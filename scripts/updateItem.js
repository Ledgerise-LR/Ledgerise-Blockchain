
const { ethers, deployments, getNamedAccounts, network } = require("hardhat");

const newPrice = ethers.utils.parseEther("0.001");
const newCharityAddress = "0x9905a159Ed7b24c9a6Fe637cCF40653592224596";
const itemTokenId = 7;

const updateItem = async () => {
  const marketplace = await ethers.getContract("Marketplace");
  const mainCollection = await ethers.getContract("MainCollection");

  // change tokenURI after uploading to PINATA !!!
  const tokenUri = "ipfs://QmWdSPWBWUYK5uqTtNdam4rgHmXc3XoNdYWdRueAcjN2xp";

  const updateTx = await marketplace.updateListing(
    mainCollection.address,
    itemTokenId,
    newPrice,
    newCharityAddress,
    tokenUri
  )

  await updateTx.wait(1);
}

updateItem()
  .then(() => {
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  })


