
const { ethers, getNamedAccounts } = require("hardhat");

const PRICE = ethers.utils.parseEther("0.01");

const listItem = async () => {
  const deployer = (await getNamedAccounts()).deployer;
  const marketplace = await ethers.getContract("Marketplace")
  const mainCollection = await ethers.getContract("MainCollection");

  const accounts = await ethers.getSigners();

  const user = accounts[1];
  const charity = accounts[2];
  const creator = accounts[5];

  const addCreatorTx_1 = await marketplace.addCreator(deployer);
  await addCreatorTx_1.wait(1);
  const addCreatorTx_2 = await marketplace.addCreator(creator.address);
  await addCreatorTx_2.wait(1);

  const createSubcollectionTx = await mainCollection.createSubcollection(
    "Türkiye Tek Yürek",
    charity.address,
    ["background", "category"]
  );

  const createSubcollectionTxReceipt = await createSubcollectionTx.wait(1);
  const args = createSubcollectionTxReceipt.events[0].args;
  const subCollectionId = args[0].toNumber();

  await createSubcollectionTx.wait(1);

  const tokenUri = "https://bafybeihklnl37pzyfwnaxzoihxmne2srhug6i6pw2tuyohngcwy5xrkxti.ipfs.dweb.link/";

  const listTokenCounter = await marketplace.getListTokenCounter();
  const listTx = await marketplace.listItem(
    mainCollection.address,
    listTokenCounter.toNumber(),
    PRICE,
    charity.address,
    tokenUri,
    subCollectionId
  )

  await listTx.wait(1);
}

listItem()
  .then(() => {
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  })

