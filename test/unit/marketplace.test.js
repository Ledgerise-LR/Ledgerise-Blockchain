
const { assert, expect } = require("chai");
const { ethers, getNamedAccounts, network, deployments } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");

const PRICE = ethers.utils.parseEther("0.01");
const INVALID_PRICE = 0;
const INTERVAL = 30;
const AVAILABLE_EDITIONS = 5;
const DUMMY_ADDRESS = "0x00000"
const DONOR_ID = "980";
const EVENT_DATA = {
  "stamp": 0,
  "shipped": 1,
  "delivered": 2
};

const currencySingleFiatConversion = "USD", currencyDoubleFiatConversion = "EUR";

const LOCATION = {
  latitude: 12345,
  longitude: 12345,
  decimals: 3
}

const INCORRECT_FORMAT_LOCATION = {
  latitude: 1234567,
  longitude: 123456789,
  decimals: 2
}

const ROUTE = {
  stampLocation: LOCATION,
  shipLocation: LOCATION,
  deliverLocation: LOCATION
}

const INCORRECT_ROUTE = {
  stampLocation: INCORRECT_FORMAT_LOCATION,
  shipLocation: LOCATION,
  deliverLocation: LOCATION
}

!developmentChains.includes(network.name)
  ? describe.skip()
  : describe("Marketplace", () => {

    let marketplace, basicNft, mainCollection, ledgeriseLens, mockV3Aggregator, charity, creator, deployer, tokenUri, user, tokenId, subCollectionId;

    beforeEach(async () => {
      deployer = (await getNamedAccounts()).deployer;
      await deployments.fixture(["all"]);
      marketplace = await ethers.getContract("Marketplace", deployer);
      basicNft = await ethers.getContract("BasicNft", deployer);
      mainCollection = await ethers.getContract("MainCollection", deployer);
      mockV3Aggregator = await ethers.getContract("MockV3Aggregator", deployer);
      ledgeriseLens = await ethers.getContract("LedgeriseLens", deployer);

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

    describe("mainCollection", () => {
      it("returns subcollectionCounter", async () => {
        const subcollectionCounter = await mainCollection.getSubcollectionCounter();
        assert.equal(subcollectionCounter, 1);
      })

      it("reverts if sender is not allowed to interact", async () => {
        await expect(mainCollection.connect(user).mintNft(
          subCollectionId,
          tokenUri,
          deployer
        )).to.be.revertedWithCustomError(
          mainCollection,
          "MainCollection__ContractNotAllowed"
        )
      })

      it("reverts if sender is not allowed to interact", async () => {
        await expect(mainCollection.connect(user).createSubcollection(
          "Türkiye Tek Yürek",
          charity.address,
          ["background", "category"]
        )).to.be.revertedWithCustomError(
          mainCollection,
          "MainCollection__NotOwner"
        )
      })
    })

    describe("listItem", () => {
      it("reverts if price is below zero", async () => {
        await expect(marketplace.listItem(
          mainCollection.address,
          tokenId,
          INVALID_PRICE,
          charity.address,
          tokenUri,
          subCollectionId,
          AVAILABLE_EDITIONS,
          ROUTE
        )).to.be.revertedWithCustomError(
          marketplace,
          "NftMarketplace__PriceMustBeAboveZero"
        );
      })

      it("reverts if the sender is not the creator", async () => {
        await expect(marketplace.connect(user).listItem(
          mainCollection.address,
          tokenId,
          PRICE,
          charity.address,
          tokenUri,
          subCollectionId,
          AVAILABLE_EDITIONS,
          ROUTE
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
          AVAILABLE_EDITIONS,
          ROUTE
        );

        const listTxReceipt = await listTx.wait(1);
        const args = listTxReceipt.events[0].args;

        const listing = await marketplace.getListing(mainCollection.address, tokenId);
        assert(args.price, listing.price);
      })

      it("reverts if item already listed", async () => {
        const listTx = await marketplace.listItem(
          mainCollection.address,
          tokenId,
          PRICE,
          charity.address,
          tokenUri,
          subCollectionId,
          AVAILABLE_EDITIONS,
          ROUTE
        );

        await listTx.wait(1);

        await expect(marketplace.listItem(
          mainCollection.address,
          tokenId,
          PRICE,
          charity.address,
          tokenUri,
          subCollectionId,
          AVAILABLE_EDITIONS,
          ROUTE
        )).to.be.revertedWithCustomError(
          marketplace,
          "NftMarketplace__ItemAlreadyListed"
        )
      })

      it("reverts if route data format is incorrect", async () => {
        await expect(marketplace.listItem(
          mainCollection.address,
          tokenId,
          PRICE,
          charity.address,
          tokenUri,
          subCollectionId,
          AVAILABLE_EDITIONS,
          INCORRECT_ROUTE
        )).to.be.revertedWithCustomError(
          marketplace,
          "NftMarketplace__RouteFormatIncorrect"
        );
      })
    });

    describe("buyItem", () => {
      it("should revert when item is not listed", async () => {
        await expect(marketplace.connect(user).buyItem(mainCollection.address, tokenId, charity.address, tokenUri, user.toString())).to.be.revertedWithCustomError(
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
          1,
          ROUTE
        );
        const listTxReceipt = await listTx.wait(1);
        const argsList = listTxReceipt.events[0].args;

        const buyTx = await marketplace.connect(user).buyItem(
          mainCollection.address,
          argsList.tokenId,
          charity.address,
          tokenUri,
          user.toString(),
          { value: PRICE }
        );
        const buyTxReceipt = await buyTx.wait(1);
        const buyArgsList = buyTxReceipt.events[2].args;

        await expect(marketplace.connect(creator).buyItem(
          mainCollection.address,
          buyArgsList.tokenId,
          charity.address,
          tokenUri,
          user.toString(),
          { value: PRICE }
        )).to.be.revertedWithCustomError(
          marketplace,
          "NftMarketplace__ItemNotAvailable"
        );
      });


      it("reverts when value insufficient, it buys an item and emits the event", async () => {

        const charityInitialBalance = await ethers.provider.getBalance(charity.address);
        const sellerInitialBalance = await ethers.provider.getBalance(deployer);

        const listTx = await marketplace.listItem(
          mainCollection.address,
          tokenId,
          PRICE,
          charity.address,
          tokenUri,
          subCollectionId,
          AVAILABLE_EDITIONS,
          ROUTE
        );
        const listTxReceipt = await listTx.wait(1);

        const { gasUsed: gasUsedList, effectiveGasPrice: effectiveGasPriceList } = listTxReceipt;
        const gasCostList = gasUsedList.mul(effectiveGasPriceList);
        // console.log("Gas cost list: " + ethers.utils.formatEther(gasCostList));
        const argsList = listTxReceipt.events[0].args;

        await expect(marketplace.connect(user).buyItem(
          mainCollection.address,
          tokenId,
          charity.address,
          tokenUri,
          user.toString(),
          { value: 0 }
        )).to.be.revertedWithCustomError(marketplace, "NftMarketplace__PriceNotMet");


        const charityFunds = (PRICE * 995) / 1000;
        const sellerFunds = (PRICE * 5) / 1000;

        const buyTx = await marketplace.connect(user).buyItem(
          mainCollection.address,
          argsList.tokenId,
          charity.address,
          tokenUri,
          user.toString(),
          { value: PRICE }
        );
        const buyTxReceipt = await buyTx.wait(1);
        const { gasUsed: gasUsedBuy, effectiveGasPrice: effectiveGasPriceBuy } = buyTxReceipt;
        const gasCostBuy = gasUsedBuy.mul(effectiveGasPriceBuy);
        // console.log("Gas cost for buy: " + ethers.utils.formatEther(gasCostBuy.toString(), "ether"))
        const args = buyTxReceipt.events[2].args;

        const withdrawTx = await marketplace.withdrawProceeds();
        const withdrawTxReceipt = await withdrawTx.wait(1);
        const { gasUsed: gasUsedWithdraw, effectiveGasPrice: effectiveGasPriceWithdraw } = withdrawTxReceipt;
        const gasCostWithdraw = gasUsedWithdraw.mul(effectiveGasPriceWithdraw);

        const charityEndingBalance = await ethers.provider.getBalance(charity.address);
        const sellerEndingBalance = await ethers.provider.getBalance(deployer);

        const tokenCounter = await mainCollection.getTokenCounter();

        assert.equal(charityEndingBalance.toString(), charityInitialBalance.add((charityFunds.toString())));
        assert.equal(
          sellerEndingBalance.add(gasCostList).add(gasCostWithdraw).toString(),
          sellerInitialBalance.add(sellerFunds).toString());

        assert.equal(parseInt(tokenCounter), parseInt(args.openseaTokenId));
        assert.equal(args.buyer.toString(), user.toString());
        const ownerOfNft = await mainCollection.getOwnerOfToken(tokenId);
        assert.equal(args.buyer.toString(), ownerOfNft.toString())
      })
    });

    describe("needs", () => {

      let needName = "Telefon";
      let needDescription = "Görüşme yapmak için telefon ihtiyacım var.";
      let needQuantity = 5;

      let needItemPrice = 100;

      let needDetails = {
        donorPhoneNumber: "5330000001",
        beneficiaryPhoneNumber: "",
        depotAddress: "HB İzmir Depo",
        beneficiaryAddress: "Atatürk Mah.",
        orderNumber: "123124124214",
        donateTimestamp: "",
        needTokenId: "",
        quantitySatisfied: 2
      }

      beforeEach(async () => {

        const addBeneficiaryTx = await marketplace.addBeneficiary(
          mainCollection.address,
          "5330000000"
        );
        const addBeneficiaryTxReceipt = await addBeneficiaryTx.wait(1);

        const args = addBeneficiaryTxReceipt.events[0].args;
        needDetails.beneficiaryPhoneNumber = args[2];
        needDetails.needTokenId = args[1];


        const createNeedTx = await marketplace.createNeed(
          mainCollection.address,
          needDetails.beneficiaryPhoneNumber,
          needName,
          needDescription,
          needQuantity,
          LOCATION.latitude,
          LOCATION.longitude
        );

        const createNeedTxReceipt = await createNeedTx.wait(1);

        const needArgs = createNeedTxReceipt.events[0].args;

        const need = await marketplace.getNeed(mainCollection.address, needDetails.needTokenId);

        assert.equal(need[0], needArgs.needTokenId.toNumber());
        assert.equal(need[1], needName);
      })

      it("verifies that the donor satisfied a need", async () => {

        needDetails.donateTimestamp = Date.now();

        const listNeedItemTx = await marketplace.listNeedItem(
          mainCollection.address,
          tokenId,
          needItemPrice,
          charity.address,
          tokenUri,
          needDetails
        );

        await listNeedItemTx.wait(1);

        const buyItemWithFiatCurrencyTx = await marketplace.buyItemWithFiatCurrency(
          mainCollection.address,
          tokenId,
          charity.address,
          tokenUri,
          needItemPrice,
          needDetails.donorPhoneNumber
        );

        const buyItemWithFiatCurrencyTxReceipt = await buyItemWithFiatCurrencyTx.wait(1);

        const args = buyItemWithFiatCurrencyTxReceipt.events[2].args
        assert.equal(args[0], needDetails.donorPhoneNumber);

        const needListing = await marketplace.getListing(
          mainCollection.address,
          tokenId
        );

        assert.equal(needListing.listingType, 1);
        assert.equal(needListing.availableEditions.toNumber(), 0);

        const need = await marketplace.getNeed(mainCollection.address, needDetails.needTokenId);
        assert.equal(need.currentSatisfiedNeedQuantity, needDetails.quantitySatisfied);
        
        const amountSatisfiedFromMapping = await marketplace.getSatisfiedAmountFromPhoneNumber(
          mainCollection.address,
          tokenId,
          needDetails.donorPhoneNumber
        );

        assert.equal(amountSatisfiedFromMapping, needDetails.quantitySatisfied);
      })
    })

    describe("cancelItem", async () => {
      beforeEach(async () => {
        const listTx = await marketplace.listItem(
          mainCollection.address,
          tokenId,
          PRICE,
          charity.address,
          tokenUri,
          subCollectionId,
          AVAILABLE_EDITIONS,
          ROUTE
        );
        await listTx.wait(1);
      })

      it("reverts if sender is not the owner", async () => {
        await expect(marketplace.connect(user).cancelItem(mainCollection.address, tokenId)).to.be.revertedWithCustomError(
          marketplace,
          "NftMarketplace__NotOwner"
        )
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
          AVAILABLE_EDITIONS,
          ROUTE
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

    describe("withdrawProceeds", () => {
      it("reverts if sender doesn't have proceeds", async () => {
        await expect(marketplace.connect(user).withdrawProceeds()).to.be.revertedWithCustomError(
          marketplace,
          "NftMarketplace__NoProceeds"
        )
      })
    })

    describe("setAuction", () => {
      it("sets auction and emits the event", async () => {
        const auctionTx = await marketplace.setAuction(mainCollection.address, tokenId, PRICE, charity.address, INTERVAL, tokenUri);
        const auctionTxReceipt = await auctionTx.wait(1);
        const args = auctionTxReceipt.events[0].args;

        const auction = await marketplace.getAuctionByParams(mainCollection.address, tokenId);

        assert.equal(auction.currentBidding.toString(), args.currentBidding.toString());
      })

      it("reverts if price is below zero", async () => {
        await expect(marketplace.setAuction(
          mainCollection.address,
          tokenId,
          INVALID_PRICE,
          charity.address,
          INTERVAL,
          tokenUri)).to.be.revertedWithCustomError(
            marketplace,
            "NftMarketplace__PriceMustBeAboveZero"
          );
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

    describe("transferFailed", async () => {

    })

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

    describe("saveRealItemHistory", async () => {
      const realItemHistoryData = {
        key: "stamp",
        nftAddress: "",
        marketplaceTokenId: tokenId,
        openseaTokenId: 0,
        buyer: "",
        location: LOCATION,
        date: Date.now().toString(),
        visualVerificationTokenId: 0
      }

      let visualVerificationData = {};

      beforeEach(async () => {

        const listTx = await marketplace.listItem(
          mainCollection.address,
          tokenId,
          PRICE,
          charity.address,
          tokenUri,
          subCollectionId,
          AVAILABLE_EDITIONS,
          ROUTE
        );

        await listTx.wait(1);

        const buyTx = await marketplace.connect(user).buyItem(
          mainCollection.address,
          tokenId,
          charity.address,
          tokenUri,
          user.toString(),
          { value: PRICE }
        )

        const buyTxReceipt = await buyTx.wait(1);

        realItemHistoryData.buyer = buyTxReceipt.events[2].args.buyer;
        realItemHistoryData.nftAddress = mainCollection.address;
        realItemHistoryData.marketplaceTokenId = parseInt(buyTxReceipt.events[2].args.tokenId);

        visualVerificationData = {
          itemOpenseaTokenId: realItemHistoryData.openseaTokenId,
          key: realItemHistoryData.key,
          buyer: realItemHistoryData.buyer,
          tokenUri: tokenUri
        }

        // console.log(visualVerificationData)

        const verifyVisualTx = await ledgeriseLens.mintVisualNft(
          visualVerificationData.itemOpenseaTokenId,
          visualVerificationData.tokenUri,
          visualVerificationData.buyer,
          EVENT_DATA[visualVerificationData.key]
        )

        const verifyVisualTxReceipt = await verifyVisualTx.wait(1);
        const eventData = verifyVisualTxReceipt.events[1].args
        const visualVerificationTokenId = eventData.tokenCounter;
        realItemHistoryData.visualVerificationTokenId = visualVerificationTokenId;

        // console.log(realItemHistoryData.visualVerificationTokenId);

      });

      it("reverts if spender is not the owner", async () => {
        const visualVerificationDataDummy = {
          itemOpenseaTokenId: 0,
          key: "stamp",
          buyer: realItemHistoryData.buyer,
          tokenUri: tokenUri
        }

        await expect(ledgeriseLens.connect(user).mintVisualNft(
          visualVerificationDataDummy.itemOpenseaTokenId,
          visualVerificationDataDummy.tokenUri,
          visualVerificationDataDummy.buyer,
          EVENT_DATA[visualVerificationData.key]
        )).to.be.revertedWithCustomError(
          ledgeriseLens,
          "LedgeriseLens__NotOwner"
        );
      })

      it("returns the tokenUri of the visual verification", async () => {
        const tokenUriResult = await ledgeriseLens.getTokenUri(
          visualVerificationData.itemOpenseaTokenId,
          visualVerificationData.buyer,
          EVENT_DATA[visualVerificationData.key]
        )

        assert.equal(tokenUri, tokenUriResult);
      })

      it("reverts if visual verification is duplicate", async () => {
        // const verifyVisualTx = await ledgeriseLens.mintVisualNft(
        //   visualVerificationData.itemOpenseaTokenId,
        //   visualVerificationData.tokenUri,
        //   visualVerificationData.buyer,
        //   visualVerificationData.key
        // )

        // await verifyVisualTx.wait(1);

        await expect(ledgeriseLens.mintVisualNft(
          visualVerificationData.itemOpenseaTokenId,
          visualVerificationData.tokenUri,
          visualVerificationData.buyer,
          EVENT_DATA[visualVerificationData.key]
        )).to.be.revertedWithCustomError(
          ledgeriseLens,
          "LedgeriseLens__ItemAlreadyVerified"
        );
      })

      it("returns the token counter", async () => {
        const tokenCounter = await ledgeriseLens.getTokenCounter();
        assert.equal(parseInt(tokenCounter) - 1, parseInt(realItemHistoryData.visualVerificationTokenId));
      })

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
          realItemHistoryData.location.decimals,
          realItemHistoryData.visualVerificationTokenId
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
          2,
          realItemHistoryData.visualVerificationTokenId
        )).to.be.revertedWithCustomError(marketplace, "NftMarketplace__DecimalsIncorrect");
      });

      it("reverts if location format incorrect", async () => {
        await expect(marketplace.saveRealItemHistory(
          realItemHistoryData.nftAddress,
          realItemHistoryData.marketplaceTokenId,
          realItemHistoryData.key,
          realItemHistoryData.buyer,
          realItemHistoryData.date,
          realItemHistoryData.openseaTokenId,
          100000,
          100000,
          realItemHistoryData.location.decimals,
          realItemHistoryData.visualVerificationTokenId
        )).to.be.revertedWithCustomError(marketplace, "NftMarketplace__LocationFormatIncorrect");
      });

      it("reverts if realItemEvent is duplicate", async () => {

        const saveItemToRealHistoryTx = await marketplace.saveRealItemHistory(
          realItemHistoryData.nftAddress,
          realItemHistoryData.marketplaceTokenId,
          realItemHistoryData.key,
          realItemHistoryData.buyer,
          realItemHistoryData.date,
          realItemHistoryData.openseaTokenId,
          realItemHistoryData.location.latitude,
          realItemHistoryData.location.longitude,
          realItemHistoryData.location.decimals,
          realItemHistoryData.visualVerificationTokenId
        );

        await saveItemToRealHistoryTx.wait(1);

        await expect(marketplace.saveRealItemHistory(
          realItemHistoryData.nftAddress,
          realItemHistoryData.marketplaceTokenId,
          realItemHistoryData.key,
          realItemHistoryData.buyer,
          realItemHistoryData.date,
          realItemHistoryData.openseaTokenId,
          realItemHistoryData.location.latitude,
          realItemHistoryData.location.longitude,
          realItemHistoryData.location.decimals,
          realItemHistoryData.visualVerificationTokenId
        )).to.be.revertedWithCustomError(marketplace, "NftMarketplace__DuplicateRealItemEvent");
      })
    });

    describe("report", () => {

      it("creates a report and emit the event", async () => {

        const timestampReal = parseInt(Date.now() / 100000);

        const addressTelephoneNumber = "5302137012"
        const message = "The visual doesn't belong to an aid parcel. It's a car.";
        const reportCode = [2, 3]; // IRRELEVANT_VISUAL
        const createReportTx = await marketplace.reportIssue(
          addressTelephoneNumber,
          message,
          reportCode
        );

        const createReportTxReceipt = await createReportTx.wait(1);

        const args = createReportTxReceipt.events[0].args;
        assert.equal(args[0], addressTelephoneNumber);
        assert.equal(args[1], message);

        const timestampConverted = parseInt(parseInt(args[3]) / 100);
        assert.equal(timestampConverted, timestampReal)
      })
    })

    describe("other", () => {

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
          1,
          ROUTE
        );
        await listTx.wait(1);

        const buyTx = await marketplace.connect(user).buyItem(
          mainCollection.address,
          tokenId,
          charity.address,
          tokenUri,
          user.toString(),
          { value: PRICE }
        )

        const buyTxReceipt = await buyTx.wait(1);

        realItemHistoryData.buyer = buyTxReceipt.events[2].args.buyer;
        realItemHistoryData.nftAddress = mainCollection.address;
        realItemHistoryData.marketplaceTokenId = parseInt(buyTxReceipt.events[2].args.tokenId);

        const saveItemToRealHistoryTx = await marketplace.saveRealItemHistory(
          realItemHistoryData.nftAddress,
          realItemHistoryData.marketplaceTokenId,
          realItemHistoryData.key,
          realItemHistoryData.buyer,
          realItemHistoryData.date,
          realItemHistoryData.openseaTokenId,
          realItemHistoryData.location.latitude,
          realItemHistoryData.location.longitude,
          realItemHistoryData.location.decimals,
          0
        );

        await saveItemToRealHistoryTx.wait(1);
      })

      it("returns listTokenCounter", async () => {
        const listTokenCounter = await marketplace.getListTokenCounter();
        assert.equal(listTokenCounter, 1);
      })

      it("returns realItemHistory", async () => {
        const realItemHistory = await marketplace.getRealItemHistory(realItemHistoryData.nftAddress, realItemHistoryData.marketplaceTokenId);
        assert.equal(realItemHistory[0].key, realItemHistoryData.key);
        assert.equal(realItemHistory[0].buyer, realItemHistoryData.buyer);
      })
    })
  })
