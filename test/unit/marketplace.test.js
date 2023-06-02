
const { assert, expect } = require("chai");
const { ethers, getNamedAccounts, network, deployments } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");

const PRICE = ethers.utils.parseEther("0.01");
const INTERVAL = 30;
const AVAILABLE_EDITIONS = 5;
const LOCATION = {
  latitude: 12345,
  longitude: 12345,
  decimals: 3
}

!developmentChains.includes(network.name)
  ? describe.skip()
  : describe("Marketplace", () => {

    let marketplace, basicNft, mainCollection, charity, creator, deployer, tokenUri, user, tokenId, subCollectionId;

    beforeEach(async () => {
      deployer = (await getNamedAccounts()).deployer;
      await deployments.fixture(["all"]);
      marketplace = await ethers.getContract("Marketplace", deployer);
      basicNft = await ethers.getContract("BasicNft", deployer);
      mainCollection = await ethers.getContract("MainCollection", deployer);

      tokenId = await mainCollection.getTokenCounter();

      const accounts = await ethers.getSigners();

      user = accounts[1];
      charity = accounts[2];
      creator = accounts[5];

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
      subCollectionId = args[0].toNumber();

      await createSubcollectionTx.wait(1);

      tokenUri = "https://bafybeihklnl37pzyfwnaxzoihxmne2srhug6i6pw2tuyohngcwy5xrkxti.ipfs.dweb.link/";
    })

    describe("listItem", () => {
      it("reverts if the sender is not the creator", async () => {
        await expect(marketplace.connect(user).listItem(
          mainCollection.address,
          tokenId,
          PRICE,
          charity.address,
          tokenUri,
          subCollectionId,
          AVAILABLE_EDITIONS
        )).to.be.revertedWithCustomError(
          marketplace,
          "NftMarketplace__NotCreator"
        );
      });

      it("listes and emits the event", async () => {
        const listTx = await marketplace.listItem(
          mainCollection.address,
          tokenId,
          PRICE,
          charity.address,
          tokenUri,
          subCollectionId,
          AVAILABLE_EDITIONS
        );

        const listTxReceipt = await listTx.wait(1);
        const args = listTxReceipt.events[0].args;

        const listing = await marketplace.getListing(mainCollection.address, tokenId);
        assert(args.price, listing.price);
      })
    });

    describe("buyItem", () => {
      it("should revert when item is not listed", async () => {
        await expect(marketplace.buyItem(mainCollection.address, tokenId, charity.address, tokenUri)).to.be.revertedWithCustomError(
          marketplace,
          "NftMarketplace__ItemNotListed"
        )
      });

      it("reverts if there are no available editions", async () => {
        const listTx = await marketplace.listItem(
          mainCollection.address,
          tokenId,
          PRICE,
          charity.address,
          tokenUri,
          subCollectionId,
          1
        );
        const listTxReceipt = await listTx.wait(1);
        const argsList = listTxReceipt.events[0].args;

        const buyTx = await marketplace.connect(user).buyItem(
          mainCollection.address,
          argsList.tokenId,
          charity.address,
          tokenUri,
          { value: PRICE }
        );
        const buyTxReceipt = await buyTx.wait(1);
        const buyArgsList = buyTxReceipt.events[2].args;

        await expect(marketplace.connect(creator).buyItem(
          mainCollection.address,
          buyArgsList.tokenId,
          charity.address,
          tokenUri,
          { value: PRICE }
        )).to.be.revertedWithCustomError(
          marketplace,
          "NftMarketplace__ItemNotAvailable"
        );
      })


      it("it reverts when value insufficient, it buys an item and emits the event", async () => {

        const charityInitialBalance = await ethers.provider.getBalance(charity.address);
        const sellerInitialBalance = await ethers.provider.getBalance(deployer);

        const listTx = await marketplace.listItem(
          mainCollection.address,
          tokenId,
          PRICE,
          charity.address,
          tokenUri,
          subCollectionId,
          AVAILABLE_EDITIONS
        );
        const listTxReceipt = await listTx.wait(1);

        const { gasUsed: gasUsedList, effectiveGasPrice: effectiveGasPriceList } = listTxReceipt;
        const gasCostList = gasUsedList.mul(effectiveGasPriceList);
        console.log("Gas cost list: " + ethers.utils.formatEther(gasCostList));
        const argsList = listTxReceipt.events[0].args;

        await expect(marketplace.connect(user).buyItem(
          mainCollection.address,
          tokenId,
          charity.address,
          tokenUri,
          { value: 0 }
        )).to.be.revertedWithCustomError(marketplace, "NftMarketplace__PriceNotMet");


        const charityFunds = PRICE * 70 / 100;
        const sellerFunds = PRICE * 20 / 100;

        const buyTx = await marketplace.connect(user).buyItem(
          mainCollection.address,
          argsList.tokenId,
          charity.address,
          tokenUri,
          { value: PRICE }
        );
        const buyTxReceipt = await buyTx.wait(1);
        const { gasUsed: gasUsedBuy, effectiveGasPrice: effectiveGasPriceBuy } = buyTxReceipt;
        const gasCostBuy = gasUsedBuy.mul(effectiveGasPriceBuy);
        console.log("Gas cost for buy: " + ethers.utils.formatEther(gasCostBuy.toString(), "ether"))
        const args = buyTxReceipt.events[2].args;

        const withdrawTx = await marketplace.withdrawProceeds();
        const withdrawTxReceipt = await withdrawTx.wait(1);
        const { gasUsed: gasUsedWithdraw, effectiveGasPrice: effectiveGasPriceWithdraw } = withdrawTxReceipt;
        const gasCostWithdraw = gasUsedWithdraw.mul(effectiveGasPriceWithdraw);

        const charityEndingBalance = await ethers.provider.getBalance(charity.address);
        const sellerEndingBalance = await ethers.provider.getBalance(deployer);


        assert.equal(charityEndingBalance.toString(), charityInitialBalance.add(charityFunds));
        assert.equal(
          sellerEndingBalance.add(gasCostList).add(gasCostWithdraw).toString(),
          sellerInitialBalance.add(sellerFunds).toString());

        assert.equal(args.buyer, user.address);
        const ownerOfNft = await mainCollection.ownerOf(tokenId);
        assert.equal(args.buyer.toString(), ownerOfNft.toString())
      })
    });

    describe("cancelItem", async () => {
      beforeEach(async () => {
        const listTx = await marketplace.listItem(
          mainCollection.address,
          tokenId,
          PRICE,
          charity.address,
          tokenUri,
          subCollectionId,
          AVAILABLE_EDITIONS
        );
        await listTx.wait(1);
      })

      it("cancels a listing and emits the event", async () => {
        const tx = await marketplace.cancelItem(mainCollection.address, tokenId);
        const txReceipt = await tx.wait(1);

        const { tokenId: tokenIdFromEvent, nftAddress: nftAddressFromEvent } = txReceipt.events[0].args;

        const emptyListing = await marketplace.getListing(nftAddressFromEvent, tokenIdFromEvent);
        assert.equal(emptyListing.price.toString(), "0");
      })

    });

    describe("updateItem", () => {
      beforeEach(async () => {

        const listTx = await marketplace.listItem(
          mainCollection.address,
          tokenId,
          PRICE,
          charity.address,
          tokenUri,
          subCollectionId,
          AVAILABLE_EDITIONS
        );
        await listTx.wait(1);
      })

      it("updates the nft and emits the event", async () => {
        const NEW_PRICE = ethers.utils.parseEther("0.02"); // ETH
        const newCharityAddress = (await ethers.getSigners())[3];

        const updateTx = await marketplace.updateListing(
          mainCollection.address,
          tokenId,
          NEW_PRICE,
          newCharityAddress.address,
          tokenUri
        );

        const updateTxReceipt = await updateTx.wait(1);
        const args = updateTxReceipt.events[0].args;

        const updatedListing = await marketplace.getListing(mainCollection.address, tokenId);
        assert.equal(args.price.toString(), updatedListing.price.toString());
        assert.equal(args.charityAddress.toString(), updatedListing.charityAddress.toString());
      })
    });

    describe("setAuction", () => {
      it("sets auction and emits the event", async () => {
        const auctionTx = await marketplace.setAuction(mainCollection.address, tokenId, PRICE, charity.address, INTERVAL, tokenUri);
        const auctionTxReceipt = await auctionTx.wait(1);
        const args = auctionTxReceipt.events[0].args;

        const auction = await marketplace.getAuctionByParams(mainCollection.address, tokenId);

        assert.equal(auction.currentBidding.toString(), args.currentBidding.toString());
      })
    })

    describe("updateAuction", () => {
      let tokenId, user, newBidder;
      beforeEach(async () => {
        const mintTx = await basicNft.mintNft();
        await mintTx.wait(1);

        tokenId = (await basicNft.getTokenCounter()) - 1;

        const approveTx = await basicNft.approve(marketplace.address, tokenId);
        await approveTx.wait(1);

        const accounts = await ethers.getSigners();
        user = accounts[1];
        newBidder = accounts[4];

        const auctionTx = await marketplace.setAuction(basicNft.address, tokenId, PRICE, charity.address, INTERVAL, tokenUri);
        await auctionTx.wait(1);
      })

      // updating means new bidding
      it("should update the auction and emit the event", async () => {

        await expect(marketplace
          .connect(user)
          .updateAuction(
            basicNft.address,
            tokenId,
            { value: 0 }
          )
        ).to.be.revertedWithCustomError(
          marketplace,
          "NftMarketplace__PriceNotMet"
        )

        const newBidding = ethers.utils.parseEther("0.02");
        const updateTx = await marketplace.connect(user).updateAuction(basicNft.address, tokenId, { value: newBidding });
        const updateTxReceipt = await updateTx.wait(1);
        const args = updateTxReceipt.events[0].args;

        const updatedAuction = await marketplace.getAuctionByParams(basicNft.address, tokenId);

        assert.equal(updatedAuction.currentBidding.toString(), args.currentBidding.toString());
        assert.equal(updatedAuction.currentBidder, user.address);
      })

      it("returns the old bidders money", async () => {

        const intialOlderBidderBalance = await ethers.provider.getBalance(user.address);

        const oldBidding = ethers.utils.parseEther("0.02");
        const oldUpdateTx = await marketplace.connect(user).updateAuction(
          basicNft.address,
          tokenId,
          { value: oldBidding }
        );
        const oldUpdateTxReceipt = await oldUpdateTx.wait(1);
        const gasCostOldUpdate = (oldUpdateTxReceipt.gasUsed).mul(oldUpdateTxReceipt.effectiveGasPrice);

        const middleOlderBidderBalance = await ethers.provider.getBalance(user.address);
        assert.equal(intialOlderBidderBalance.toString(), (middleOlderBidderBalance.add(oldBidding).add(gasCostOldUpdate)).toString());

        const newBidding = ethers.utils.parseEther("0.05");
        const newUpdateTx = await marketplace.connect(newBidder).updateAuction(
          basicNft.address,
          tokenId,
          { value: newBidding }
        );
        await newUpdateTx.wait(1);

        const endingOlderBidderBalance = await ethers.provider.getBalance(user.address);
        assert.equal(intialOlderBidderBalance.toString(), (endingOlderBidderBalance.add(gasCostOldUpdate)).toString());

      })
    });

    describe("checkUpkeep", () => {
      let tokenId, user, auction;
      beforeEach(async () => {
        const mintTx = await basicNft.mintNft();
        await mintTx.wait(1);

        tokenId = (await basicNft.getTokenCounter()) - 1;

        const approveTx = await basicNft.approve(marketplace.address, tokenId);
        await approveTx.wait(1);

        const accounts = await ethers.getSigners();
        user = accounts[1];

        const auctionTx = await marketplace.setAuction(basicNft.address, tokenId, PRICE, charity.address, INTERVAL, tokenUri);
        await auctionTx.wait(1);

        auction = await marketplace.getAuctionByParams(basicNft.address, tokenId);
      })

      it("returns false if there is no current bidder", async () => {
        await network.provider.send("evm_increaseTime", [INTERVAL + 1]);
        await network.provider.send("evm_mine", []);

        const txResponse = await marketplace.callStatic.checkUpkeep("0x");

        const { upkeepNeeded } = txResponse;
        assert(!upkeepNeeded);
      })

      it("returns false if interval hasn't passed", async () => {
        const newPrice = ethers.utils.parseEther("0.03");
        const updateTx = await marketplace.connect(user).updateAuction(basicNft.address, tokenId, { value: newPrice });
        await updateTx.wait(1);

        const txResponse = await marketplace.callStatic.checkUpkeep("0x");

        const { upkeepNeeded } = txResponse;
        assert(!upkeepNeeded);
      })

      it("returns upkeepNeeded true if there is bidder and interval passed", async () => {
        const newPrice = ethers.utils.parseEther("0.03");
        const updateTx = await marketplace.connect(user).updateAuction(basicNft.address, tokenId, { value: newPrice });
        await updateTx.wait(1);

        await network.provider.send("evm_increaseTime", [INTERVAL + 1]);
        await network.provider.send("evm_mine", []);

        const txResponse = await marketplace.callStatic.checkUpkeep("0x");

        const { upkeepNeeded, performData } = txResponse;
        const auctionState = await marketplace.getAuctionState(decodeURI(performData));

        assert(upkeepNeeded);
        assert.equal(auctionState, auction.state);
      })
    })

    describe("performUpkeep", () => {

      let user, tokenId, auction;
      beforeEach(async () => {
        const mintTx = await basicNft.mintNft();
        await mintTx.wait(1);

        tokenId = (await basicNft.getTokenCounter()) - 1;

        const approveTx = await basicNft.approve(marketplace.address, tokenId);
        await approveTx.wait(1);

        const accounts = await ethers.getSigners();
        user = accounts[1];

        const auctionTx = await marketplace.setAuction(mainCollection.address, tokenId, PRICE, charity.address, INTERVAL, tokenUri);
        await auctionTx.wait(1);

        auction = await marketplace.getAuctionByParams(mainCollection.address, tokenId);

        const newPrice = ethers.utils.parseEther("0.03");
        const updateTx = await marketplace.connect(user).updateAuction(mainCollection.address, tokenId, { value: newPrice });
        await updateTx.wait(1);

        await network.provider.send("evm_increaseTime", [INTERVAL + 1]);
        await network.provider.send("evm_mine", []);
      })

      it("completes the auction and emits the event", async () => {

        const txResponse = await marketplace.callStatic.checkUpkeep("0x");

        const { performData } = txResponse;

        await marketplace.performUpkeep(performData);

        await new Promise(async (resolve, reject) => {
          setTimeout(() => {
            reject();
          }, 30000);
          marketplace.once("AuctionCompleted", async (
            currentBidder,
            seller,
            nftAddress,
            tokenId,
            currentBidding
          ) => {
            const ownerOfNft = await mainCollection.ownerOf(tokenId);

            const lastBlockTimeStamp = await marketplace.getLastTimestamp();
            assert.equal(currentBidder, ownerOfNft);
            assert(auction.startTimeStamp.add(INTERVAL + 1) <= lastBlockTimeStamp);
            resolve();
          })
        });
      })
    })

    describe("checkForOwner", async () => {
      it("checks for a unique item to be owned by a user", async () => {
        const listTx_1 = await marketplace.listItem(
          mainCollection.address,
          tokenId,
          PRICE,
          charity.address,
          tokenUri,
          subCollectionId,
          AVAILABLE_EDITIONS
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
          (AVAILABLE_EDITIONS - 2)
        );
        const listTxReceipt_2 = await listTx_2.wait(1);
        const argsList_2 = listTxReceipt_2.events[0].args;

        const buyTx_1 = await marketplace.connect(user).buyItem(
          mainCollection.address,
          argsList_1.tokenId,
          charity.address,
          tokenUri,
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

    describe("saveRealItemHistory", async () => {
      const realItemHistoryData = {
        key: "stamp",
        nftAddress: "",
        marketplaceTokenId: tokenId,
        openseaTokenId: 0,
        buyer: "",
        location: LOCATION,
        date: Date.now().toString()
      }

      beforeEach(async () => {

        const listTx = await marketplace.listItem(
          mainCollection.address,
          tokenId,
          PRICE,
          charity.address,
          tokenUri,
          subCollectionId,
          AVAILABLE_EDITIONS
        );

        await listTx.wait(1);

        const buyTx = await marketplace.connect(user).buyItem(
          mainCollection.address,
          tokenId,
          charity.address,
          tokenUri,
          { value: PRICE }
        )

        const buyTxReceipt = await buyTx.wait(1);

        realItemHistoryData.buyer = buyTxReceipt.events[2].args.buyer;
        realItemHistoryData.nftAddress = mainCollection.address;
        realItemHistoryData.marketplaceTokenId = parseInt(buyTxReceipt.events[2].args.tokenId);

      });

      it("saves real item history and emits an event", async () => {
        const saveItemToRealHistoryTx = await marketplace.saveRealItemHistory(
          realItemHistoryData.nftAddress,
          realItemHistoryData.marketplaceTokenId,
          realItemHistoryData.key,
          realItemHistoryData.buyer,
          realItemHistoryData.date,
          realItemHistoryData.openseaTokenId,
          realItemHistoryData.location.latitude,
          realItemHistoryData.location.longitude,
          realItemHistoryData.location.decimals
        );

        const saveItemToRealHistoryTxReceipt = await saveItemToRealHistoryTx.wait(1);
        assert(saveItemToRealHistoryTxReceipt.transactionHash);
      })

      it("reverts if decimals isn't equal to 3", async () => {
        await expect(marketplace.saveRealItemHistory(
          realItemHistoryData.nftAddress,
          realItemHistoryData.marketplaceTokenId,
          realItemHistoryData.key,
          realItemHistoryData.buyer,
          realItemHistoryData.date,
          realItemHistoryData.openseaTokenId,
          realItemHistoryData.location.latitude,
          realItemHistoryData.location.longitude,
          2
        )).to.be.revertedWithCustomError(marketplace, "NftMarketplace__DecimalsIncorrect");
      });

      it("reverts if", async () => {
        await expect(marketplace.saveRealItemHistory(
          realItemHistoryData.nftAddress,
          realItemHistoryData.marketplaceTokenId,
          realItemHistoryData.key,
          realItemHistoryData.buyer,
          realItemHistoryData.date,
          realItemHistoryData.openseaTokenId,
          100000,
          100000,
          realItemHistoryData.location.decimals
        )).to.be.revertedWithCustomError(marketplace, "NftMarketplace__LocationFormatIncorrect");
      })
    })
  })
