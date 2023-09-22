// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@chainlink/contracts/src/v0.8/KeeperCompatible.sol';
import './MainCollection.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol';

import './utils/PriceConverter.sol';

// Errors

error NftMarketplace__PriceMustBeAboveZero();
error NftMarketplace__NotApprovedForMarketplace();
error NftMarketplace__ItemAlreadyListed(address nftAddress, uint256 tokenId);
error NftMarketplace__ItemNotListed(address nftAddress, uint256 tokenId);
error NftMarketplace__NotOwner();
error NftMarketplace__PriceNotMet(
  address nftAddress,
  uint256 tokenId,
  uint256 price
);
error NftMarketplace__PriceNotMetFiat(
  address nftAddress,
  uint256 tokenId,
  uint256 fiatAmount
);
error NftMarketplace__NoProceeds();
error NftMarketplace__TransferFailed();
error NftMarketplace__NotCreator();
error NftMarketplace__ItemNotAvailable();
error NftMarketplace__DecimalsIncorrect();
error NftMarketplace__LocationFormatIncorrect();
error NftMarketplace__RouteFormatIncorrect();
error NftMarketplace__DuplicateRealItemEvent();

contract Marketplace is KeeperCompatibleInterface, ReentrancyGuard, Ownable {
  using PriceConverter for uint256;

  // Type declarations
  struct Listing {
    uint256 uniqueListingId;
    address seller;
    uint256 price;
    address charityAddress;
    address creator;
    uint256 subcollectionId;
    uint256 availableEditions;
    Route route;
  }

  struct Route {
    Location stampLocation;
    Location shipLocation;
    Location deliverLocation;
  }

  struct Location {
    uint256 latitude;
    uint256 longitude;
    uint256 decimals;
  }

  struct RealItemHistory {
    string key;
    address buyer;
    string date;
    uint256 openseaTokenId;
    Location location;
    uint256 visualVerificationTokenId;
  }

  enum AuctionState {
    OPEN,
    ENDED
  }

  struct Auction {
    address nftAddress;
    uint256 tokenId;
    address seller;
    uint256 currentBidding;
    uint256 interval; // in seconds
    address charityAddress;
    address currentBidder;
    uint256 startTimeStamp;
    AuctionState state;
    string tokenUri;
    address creator;
  }

  // Events
  event ItemListed(
    address indexed seller,
    address indexed nftAddress,
    uint256 indexed tokenId,
    address charityAddress,
    uint256 price,
    string tokenUri,
    uint256 subcollectionId,
    uint256 availableEditions,
    Route route
  );

  event ItemBought(
    address indexed buyer,
    address indexed nftAddress,
    uint256 indexed tokenId,
    uint256 price,
    uint256 openseaTokenId
  );

  event ItemBoughtWithFiat(
    address indexed buyer,
    address indexed nftAddress,
    uint256 indexed tokenId,
    uint256 fiatPrice,
    uint256 openseaTokenId
  );

  event ItemCanceled(
    address indexed seller,
    address indexed nftAddress,
    uint256 indexed tokenId
  );

  event AuctionCreated(
    address indexed nftAddress,
    uint256 indexed tokenId,
    uint256 indexed interval,
    address charityAddress,
    uint256 currentBidding,
    address currentBidder,
    uint256 startTimeStamp,
    string tokenUri
  );

  event AuctionUpdated(
    address indexed nftAddress,
    uint256 indexed tokenId,
    uint256 indexed currentBidding,
    address currentBidder
  );

  event AuctionCompleted(
    address bidder,
    address seller,
    address nftAddress,
    uint256 tokenId,
    uint256 price
  );

  event CreatorAdded(address indexed creatorAddress);

  event RealItemHistorySaved(address nftAddress, uint256 tokenId);

  // NFT variables
  mapping(address => mapping(uint256 => Listing)) public s_listings;
  mapping(address => uint256) public s_proceeds;
  mapping(address => uint256) s_charity_fiat_proceeds;
  mapping(address => mapping(uint256 => RealItemHistory[])) s_realItemHistory;
  Auction[] public s_auctions;
  mapping(address => bool) public s_creators;
  uint256 private s_listTokenCounter = 0;

  // modifiers

  modifier notListed(
    address nftAddress,
    uint256 tokenId,
    address owner
  ) {
    if (s_listings[nftAddress][tokenId].price > 0) {
      revert NftMarketplace__ItemAlreadyListed(nftAddress, tokenId);
    }
    _;
  }

  modifier isOwner(
    address nftAddress,
    uint256 tokenId,
    address spender
  ) {
    if (s_listings[nftAddress][tokenId].creator != spender) {
      revert NftMarketplace__NotOwner();
    }
    _;
  }

  modifier isCreator(address spender) {
    if (s_creators[spender] != true) {
      revert NftMarketplace__NotCreator();
    }
    _;
  }

  modifier isListed(address nftAddress, uint256 tokenId) {
    if (s_listings[nftAddress][tokenId].price <= 0) {
      revert NftMarketplace__ItemNotListed(nftAddress, tokenId);
    }
    _;
  }

  // Functions

  function checkForLocationFormat(
    Location memory location
  ) internal pure returns (bool) {
    uint8[3] memory validValuesLatitude = [3, 4, 5];
    uint8[4] memory validValuesLongitude = [3, 4, 5, 6];

    bool numOfDigitsLatitudeFlag = false;
    bool numOfDigitsLongitudeFlag = false;
    bool decimalsFlag = false;

    for (uint i = 0; i < validValuesLatitude.length; i++) {
      if (getNumOfDigits(location.latitude) == validValuesLatitude[i]) {
        numOfDigitsLatitudeFlag = true;
      }
    }

    for (uint i = 0; i < validValuesLongitude.length; i++) {
      if (getNumOfDigits(location.longitude) == validValuesLongitude[i]) {
        numOfDigitsLongitudeFlag = true;
      }
    }

    if (location.decimals == 3) {
      decimalsFlag = true;
    }

    return (numOfDigitsLatitudeFlag &&
      numOfDigitsLongitudeFlag &&
      decimalsFlag);
  }

  function listItem(
    address nftAddress,
    uint256 tokenId,
    uint256 price,
    address charityAddress,
    string memory tokenUri,
    uint256 subCollectionId,
    uint256 availableEditions,
    Route memory route
  ) external notListed(nftAddress, tokenId, msg.sender) isCreator(msg.sender) {
    if (price <= 0) {
      revert NftMarketplace__PriceMustBeAboveZero();
    }

    if (
      !checkForLocationFormat(route.stampLocation) ||
      !checkForLocationFormat(route.shipLocation) ||
      !checkForLocationFormat(route.deliverLocation)
    ) {
      revert NftMarketplace__RouteFormatIncorrect();
    }

    s_listings[nftAddress][tokenId] = Listing(
      s_listTokenCounter,
      msg.sender,
      price,
      charityAddress,
      msg.sender,
      subCollectionId,
      availableEditions,
      route
    );

    s_listTokenCounter += 1;

    emit ItemListed(
      msg.sender,
      nftAddress,
      tokenId,
      charityAddress,
      price,
      tokenUri,
      subCollectionId,
      availableEditions,
      route
    );
  }

  function buyItem(
    address nftAddress,
    uint256 tokenId,
    address charityAddress,
    string memory tokenUri
  ) external payable nonReentrant isListed(nftAddress, tokenId) {
    Listing memory listedItem = s_listings[nftAddress][tokenId];
    if (msg.value < listedItem.price) {
      revert NftMarketplace__PriceNotMet(nftAddress, tokenId, listedItem.price);
    }

    if (listedItem.availableEditions <= 0) {
      revert NftMarketplace__ItemNotAvailable();
    }

    uint256 subcollectionId = MainCollection(nftAddress)
      .getSubcollectionOfToken(tokenId);

    MainCollection(nftAddress).mintNft(subcollectionId, tokenUri, msg.sender);

    uint256 charityFunds = ((msg.value) * 70) / 100;
    uint256 sellerFunds = ((msg.value) * 20) / 100;

    s_listings[nftAddress][tokenId].availableEditions -= 1;

    s_proceeds[listedItem.seller] = s_proceeds[listedItem.seller] + sellerFunds;

    (bool successCharity, ) = payable(charityAddress).call{value: charityFunds}(
      ''
    );

    if (!successCharity) {
      revert NftMarketplace__TransferFailed();
    }

    uint256 openseaTokenId = MainCollection(nftAddress).getTokenCounter();

    emit ItemBought(
      msg.sender,
      nftAddress,
      tokenId,
      listedItem.price,
      openseaTokenId
    );
  }

  function buyItemWithFiatCurrency(
    address nftAddress,
    uint256 tokenId,
    address charityAddress,
    string memory tokenUri,
    AggregatorV3Interface priceFeed,
    uint256 fiatAmount
  ) external nonReentrant isListed(nftAddress, tokenId) {
    /* Only for fiat currency payments: mastercard, visa, paypal etc.*/

    Listing memory listedItem = s_listings[nftAddress][tokenId];

    if (fiatAmount < listedItem.price.getConversionRate(priceFeed)) {
      revert NftMarketplace__PriceNotMetFiat(nftAddress, tokenId, fiatAmount);
    }

    if (listedItem.availableEditions <= 0) {
      revert NftMarketplace__ItemNotAvailable();
    }

    uint256 subcollectionId = MainCollection(nftAddress)
      .getSubcollectionOfToken(tokenId);

    MainCollection(nftAddress).mintNft(subcollectionId, tokenUri, msg.sender);

    uint256 charityFunds = ((listedItem.price / 1e18) * 70) / 100;
    uint256 sellerFunds = ((listedItem.price / 1e18) * 20) / 100;

    s_listings[nftAddress][tokenId].availableEditions -= 1;

    s_proceeds[listedItem.seller] = s_proceeds[listedItem.seller] + sellerFunds;

    s_charity_fiat_proceeds[charityAddress] =
      s_charity_fiat_proceeds[charityAddress] +
      charityFunds;

    uint256 openseaTokenId = MainCollection(nftAddress).getTokenCounter();

    emit ItemBoughtWithFiat(
      msg.sender,
      nftAddress,
      tokenId,
      fiatAmount,
      openseaTokenId
    );
  }

  function cancelItem(
    address nftAddress,
    uint256 tokenId
  )
    external
    isListed(nftAddress, tokenId)
    isOwner(nftAddress, tokenId, msg.sender)
  {
    delete (s_listings[nftAddress][tokenId]);
    emit ItemCanceled(msg.sender, nftAddress, tokenId);
  }

  function updateListing(
    address nftAddress,
    uint256 tokenId,
    uint256 price,
    address charityAddress,
    string memory tokenUri
  )
    external
    isListed(nftAddress, tokenId)
    isOwner(nftAddress, tokenId, msg.sender)
  {
    if (charityAddress != s_listings[nftAddress][tokenId].charityAddress) {
      s_listings[nftAddress][tokenId].charityAddress = charityAddress;
    }
    s_listings[nftAddress][tokenId].price = price;

    uint256 subcollectionId = s_listings[nftAddress][tokenId].subcollectionId;
    uint256 availableEditions = s_listings[nftAddress][tokenId]
      .availableEditions;
    Route memory route = s_listings[nftAddress][tokenId].route;

    emit ItemListed(
      msg.sender,
      nftAddress,
      tokenId,
      charityAddress,
      price,
      tokenUri,
      subcollectionId,
      availableEditions,
      route
    );
  }

  function withdrawProceeds() external {
    uint256 proceeds = s_proceeds[msg.sender];
    if (proceeds <= 0) {
      revert NftMarketplace__NoProceeds();
    }

    s_proceeds[msg.sender] = 0;
    (bool success, ) = payable(msg.sender).call{value: proceeds}('');

    if (!success) {
      revert NftMarketplace__TransferFailed();
    }
  }

  function deleteWithdrawedFiatAmountFromCharityProceeds(
    uint256 fiatAmount /* USD */,
    address charityAddress
  ) internal {
    s_charity_fiat_proceeds[charityAddress] =
      s_charity_fiat_proceeds[charityAddress] -
      fiatAmount;
  }

  // Auction functions

  function setAuction(
    address nftAddress,
    uint256 tokenId,
    uint256 price,
    address charityAddress,
    uint256 interval,
    string memory tokenUri
  ) external isCreator(msg.sender) {
    if (price <= 0) {
      revert NftMarketplace__PriceMustBeAboveZero();
    }

    s_auctions.push(
      Auction(
        nftAddress,
        tokenId,
        msg.sender,
        price,
        interval,
        charityAddress,
        address(0),
        block.timestamp,
        AuctionState(0),
        tokenUri,
        msg.sender
      )
    );

    emit AuctionCreated(
      nftAddress,
      tokenId,
      interval,
      charityAddress,
      price, // current bid
      address(0), // current bidder 0x0000
      block.timestamp,
      tokenUri
    );
  }

  function updateAuction(
    address nftAddress,
    uint256 tokenId
  ) external payable nonReentrant {
    for (uint i = 0; i < s_auctions.length; i++) {
      if (msg.value <= s_auctions[i].currentBidding) {
        revert NftMarketplace__PriceNotMet(nftAddress, tokenId, msg.value);
      }
      if (
        s_auctions[i].nftAddress == nftAddress &&
        s_auctions[i].tokenId == tokenId
      ) {
        address oldBidder = s_auctions[i].currentBidder;
        uint256 oldBidding = s_auctions[i].currentBidding;

        (bool success, ) = payable(oldBidder).call{value: oldBidding}('');
        if (!success) {
          revert NftMarketplace__TransferFailed();
        }

        s_auctions[i].currentBidding = msg.value;
        s_auctions[i].currentBidder = msg.sender;

        emit AuctionUpdated(nftAddress, tokenId, msg.value, msg.sender);
      }
    }
  }

  // Keeper functions for auctions

  function checkUpkeep(
    bytes memory // checkData
  ) external override returns (bool upkeepNeeded, bytes memory performData) {
    for (uint i = 0; i < s_auctions.length; i++) {
      Auction memory auction = s_auctions[i];

      // time satisfied
      // includes current bidder
      performData = abi.encodePacked(uint256(i));
      upkeepNeeded = (((block.timestamp - auction.startTimeStamp) >
        auction.interval) && (auction.currentBidder != address(0)));
      if (upkeepNeeded) {
        s_auctions[i].state = AuctionState.ENDED;
        return (upkeepNeeded, performData);
      }
    }
  }

  function performUpkeep(bytes calldata performData) external override {
    uint256 auctionIndex = abi.decode(performData, (uint256));

    Auction memory endedAuction = s_auctions[auctionIndex];
    delete s_auctions[auctionIndex];

    uint256 sellerFunds = (endedAuction.currentBidding * 25) / 100;
    uint256 charityFunds = (endedAuction.currentBidding * 65) / 100;

    s_proceeds[endedAuction.seller] += sellerFunds;

    (bool successCharity, ) = payable(endedAuction.charityAddress).call{
      value: charityFunds
    }('');

    if (!successCharity) {
      revert NftMarketplace__TransferFailed();
    }

    MainCollection(endedAuction.nftAddress).mintAuction(
      endedAuction.tokenUri,
      endedAuction.creator
    );

    MainCollection(endedAuction.nftAddress).safeTransferFrom(
      endedAuction.seller,
      endedAuction.currentBidder,
      endedAuction.tokenId
    );

    emit AuctionCompleted(
      endedAuction.currentBidder,
      endedAuction.seller,
      endedAuction.nftAddress,
      endedAuction.tokenId,
      endedAuction.currentBidding
    );
  }

  function getNumOfDigits(uint256 num) internal pure returns (uint256) {
    uint8 i = 0;
    while (num >= 1) {
      num /= 10;
      i++;
    }

    return i;
  }

  function compareStrings(
    string memory a,
    string memory b
  ) internal pure returns (bool) {
    return (keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b)));
  }

  function saveRealItemHistory(
    address nftAddress,
    uint256 tokenId,
    string memory key,
    address buyer,
    string memory date,
    uint256 openseaTokenId,
    uint256 latitude,
    uint256 longitude,
    uint256 decimals,
    uint256 visualVerificationTokenId
  ) external onlyOwner {
    Location memory location = Location(latitude, longitude, decimals);

    if (decimals != 3) {
      revert NftMarketplace__DecimalsIncorrect();
    }

    if (
      getNumOfDigits(latitude) != 4 &&
      getNumOfDigits(latitude) != 5 &&
      getNumOfDigits(longitude) != 4 &&
      getNumOfDigits(longitude) != 5
    ) {
      revert NftMarketplace__LocationFormatIncorrect();
    }

    for (uint i = 0; i < s_realItemHistory[nftAddress][tokenId].length; i++) {
      string memory savedItemKey = s_realItemHistory[nftAddress][tokenId][i]
        .key;

      if (compareStrings(savedItemKey, key)) {
        revert NftMarketplace__DuplicateRealItemEvent();
      }
    }

    s_realItemHistory[nftAddress][tokenId].push(
      RealItemHistory(
        key,
        buyer,
        date,
        openseaTokenId,
        location,
        visualVerificationTokenId
      )
    );

    emit RealItemHistorySaved(nftAddress, tokenId);
  }

  function addCreator(address creatorAddress) external onlyOwner {
    s_creators[creatorAddress] = true;
    emit CreatorAdded(creatorAddress);
  }

  function priorConversion(
    uint256 amount,
    AggregatorV3Interface priceFeed
  ) external view returns (uint256) {
    return amount.getConversionRateFiatToFiat(priceFeed);
  }

  function getRealItemHistory(
    address nftAddress,
    uint256 tokenId
  ) external view onlyOwner returns (RealItemHistory[] memory) {
    return s_realItemHistory[nftAddress][tokenId];
  }

  function getListing(
    address nftAddress,
    uint256 tokenId
  ) public view returns (Listing memory) {
    return s_listings[nftAddress][tokenId];
  }

  function getAuctionByParams(
    address nftAddress,
    uint256 tokenId
  ) external view returns (Auction memory auction) {
    for (uint i = 0; i < s_auctions.length; i++) {
      if (
        s_auctions[i].nftAddress == nftAddress &&
        s_auctions[i].tokenId == tokenId
      ) {
        return s_auctions[i];
      }
    }
  }

  function getLastTimestamp() external view returns (uint256) {
    return block.timestamp;
  }

  function getAuctionState(uint256 index) external view returns (AuctionState) {
    return s_auctions[index].state;
  }

  function getListTokenCounter() public view returns (uint256) {
    return s_listTokenCounter;
  }

  function checkOwnedByUser(
    uint256 uniqueItemId,
    address nftAddress,
    address ownerAddress
  ) public view returns (bool isOwned) {
    for (uint i = 0; i < s_listTokenCounter; i++) {
      Listing memory listing = s_listings[nftAddress][i];
      try IERC721(nftAddress).ownerOf(i) returns (address /*owner*/) {
        if (
          listing.uniqueListingId == uniqueItemId &&
          IERC721(nftAddress).ownerOf(i) == ownerAddress
        ) {
          return true;
        }
      } catch (bytes memory /*lowLevelData*/) {
        continue;
      }
    }
    return false;
  }
}
