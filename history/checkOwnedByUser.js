describe("checkForOwner", async () => {
  it("checks for a unique item to be owned by a user", async () => {
    const listTx_1 = await marketplace.listItem(
      mainCollection.address,
      tokenId,
      PRICE,
      charity.address,
      tokenUri,
      subCollectionId,
      AVAILABLE_EDITIONS,
      ROUTE
    );
    const listTxReceipt_1 = await listTx_1.wait(1);
    const argsList_1 = listTxReceipt_1.events[0].args;

    const listTx_2 = await marketplace.listItem(
      mainCollection.address,
      tokenId + 1,
      PRICE,
      charity.address,
      tokenUri,
      subCollectionId,
      (AVAILABLE_EDITIONS - 2),
      ROUTE
    );
    const listTxReceipt_2 = await listTx_2.wait(1);
    const argsList_2 = listTxReceipt_2.events[0].args;

    const buyTx_1 = await marketplace.connect(user).buyItem(
      mainCollection.address,
      argsList_1.tokenId,
      charity.address,
      tokenUri,
      user.toString(),
      { value: PRICE }
    );
    const buyTxReceipt_1 = await buyTx_1.wait(1);
    const buyArgsList_1 = buyTxReceipt_1.events[2].args;

    const collectionItem_1 = await marketplace.getListing(mainCollection.address, buyArgsList_1.tokenId);

    const isOwner_false = await marketplace.checkOwnedByUser(
      collectionItem_1.uniqueListingId,
      mainCollection.address,
      creator.address
    );

    assert(!isOwner_false);

    const buyTx_2 = await marketplace.connect(user).buyItem(
      mainCollection.address,
      argsList_2.tokenId,
      charity.address,
      tokenUri,
      user.toString(),
      { value: PRICE }
    );
    const buyTxReceipt_2 = await buyTx_2.wait(1);
    const buyArgsList_2 = buyTxReceipt_2.events[2].args;

    const collectionItem_2 = await marketplace.getListing(mainCollection.address, buyArgsList_2.tokenId);

    const isOwner_true = await marketplace.checkOwnedByUser(
      collectionItem_2.uniqueListingId,
      mainCollection.address,
      user.address
    );

    assert(isOwner_true);
  })
})