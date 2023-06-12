
const { ethers, deployments, getNamedAccounts, network } = require("hardhat");

const PRICE = ethers.utils.parseEther("0.001");
const AVAILABLE_EDITIONS = 100;

const listItem = async () => {
  const deployer = (await getNamedAccounts()).deployer;
  const marketplace = await ethers.getContract("Marketplace");
  const mainCollection = await ethers.getContract("MainCollection");

  const charityAddress = "0x9905a159Ed7b24c9a6Fe637cCF40653592224596";
  const creatorAddress = "0x59c0fa07599DB27758E1B7342541e4244Aae4d9F";

  const subCollectionId = 1;  // index of the subcollection in the contract's subcollection array !!!

  // change tokenURI after uploading to PINATA !!!
  const tokenUri = "ipfs://QmTnoowThqtwpGnmRoP8sB2jLBiXpmnL4LKpCSduVHPP4m";

  const listTokenCounter = await marketplace.getListTokenCounter();
  const listTx = await marketplace.listItem(
    mainCollection.address,
    listTokenCounter.toNumber(),
    PRICE,
    charityAddress,
    tokenUri,
    subCollectionId,
    AVAILABLE_EDITIONS
  )

  await listTx.wait(1);
}

listItem()
  .then(() => {
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  })

