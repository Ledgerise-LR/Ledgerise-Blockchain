
const { ethers, getNamedAccounts } = require("hardhat");

const PRICE = ethers.utils.parseEther("0.01");
const AVAILABLE_EDITIONS = 5;

const listItem = async () => {
  const deployer = (await getNamedAccounts()).deployer;
  const marketplace = await ethers.getContract("Marketplace");
  const mainCollection = await ethers.getContract("MainCollection");

  const charity = "0x46000a9B2df36244E1671C0a5714720aaB9e3D13";
  const creator = "0x59c0fa07599DB27758E1B7342541e4244Aae4d9F";

  const addCreatorTx_1 = await marketplace.addCreator(deployer);
  await addCreatorTx_1.wait(1);
  const addCreatorTx_2 = await marketplace.addCreator(creator);
  await addCreatorTx_2.wait(1);

  const createSubcollectionTx = await mainCollection.createSubcollection(
    "No Hunger For Africa",
    charity,
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
    charity,
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

