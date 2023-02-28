// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@chainlink/contracts/src/v0.8/KeeperCompatible.sol';
import './MainCollection.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

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
error NftMarketplace__NoProceeds();
error NftMarketplace__TransferFailed();
error NftMarketplace__NotCreator();

contract Marketplace is KeeperCompatibleInterface, ReentrancyGuard, Ownable {
  // Type declarations
  struct Listing {
    address seller;
    uint256 price;
    address charityAddress;
    address creator;
    uint256 subcollectionId;
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
    string tokenUri
  );

  event ItemBought(
    address indexed buyer,
    address indexed nftAddress,
    uint256 indexed tokenId,
    uint256 price
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

  // NFT variables
  mapping(address => mapping(uint256 => Listing)) public s_listings;
  mapping(address => uint256) public s_proceeds;
  Auction[] public s_auctions;
  mapping(address => bool) public s_creators;

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

  function listItem(
    address nftAddress,
    uint256 tokenId,
    uint256 price,
    address charityAddress,
    string memory tokenUri,
    uint256 subCollectionId
  ) external notListed(nftAddress, tokenId, msg.sender) isCreator(msg.sender) {
    if (price <= 0) {
      revert NftMarketplace__PriceMustBeAboveZero();
    }

    s_listings[nftAddress][tokenId] = Listing(
      msg.sender,
      price,
      charityAddress,
      msg.sender,
      subCollectionId
    );

    emit ItemListed(
      msg.sender,
      nftAddress,
      tokenId,
      charityAddress,
      price,
      tokenUri
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

    uint256 subcollectionId = MainCollection(nftAddress)
      .getSubcollectionOfToken(tokenId);

    address creator = getListing(nftAddress, tokenId).creator;

    MainCollection(nftAddress).mintNft(subcollectionId, tokenUri, creator);

    MainCollection(nftAddress).safeTransferFrom(
      listedItem.seller,
      msg.sender,
      tokenId
    );

    uint256 charityFunds = ((msg.value) * 5) / 10;
    uint256 sellerFunds = ((msg.value) * 4) / 10;

    delete (s_listings[nftAddress][tokenId]);

    s_proceeds[listedItem.seller] = s_proceeds[listedItem.seller] + sellerFunds;

    (bool successCharity, ) = payable(charityAddress).call{value: charityFunds}(
      ''
    );

    if (!successCharity) {
      revert NftMarketplace__TransferFailed();
    }

    emit ItemBought(msg.sender, nftAddress, tokenId, listedItem.price);
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
    emit ItemListed(
      msg.sender,
      nftAddress,
      tokenId,
      charityAddress,
      price,
      tokenUri
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

    uint256 sellerFunds = (endedAuction.currentBidding * 4) / 10;
    uint256 charityFunds = (endedAuction.currentBidding * 5) / 10;

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

  function addCreator(address creatorAddress) external onlyOwner {
    s_creators[creatorAddress] = true;
    emit CreatorAdded(creatorAddress);
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
}
