
const { ethers, network, getNamedAccounts } = require("hardhat");
const { developmentChains, networkConfig } = require("../helper-hardhat-config");

const createSubcollection = async () => {

  console.log("Creating subcollection.")
  const deployer = (await getNamedAccounts()).deployer;
  const chainId = network.config.chainId;

  const collectionName = "No Hunger In Africa";
  const charityAddress = "0x9905a159Ed7b24c9a6Fe637cCF40653592224596";
  const properties = ["background", "category"];

  const mainCollection = await ethers.getContract("MainCollection", deployer);
  const createSubcollectionTx = await mainCollection.createSubcollection(collectionName, charityAddress, properties);
  const createSubcollectionTxReceipt = await createSubcollectionTx.wait(1);

  const args = createSubcollectionTxReceipt.events[0].args;
  console.log(`Sub collection created with name ${args[1]} at index ${args[0].toString()}`);
}

createSubcollection()
  .then(() => {
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  })


