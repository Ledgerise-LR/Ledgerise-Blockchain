// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';
import 'hardhat/console.sol';

// errors
error MainCollection__NotOwner();
error MainCollection__ContractNotAllowed();

contract MainCollection is ERC721URIStorage {
  // Type declarations
  struct subcollection {
    uint256 id;
    string name;
    address charityAddress;
    string[] properties;
  }

  // Events
  event SubcollectionCreated(
    uint256 indexed id,
    string name,
    address indexed charityAddress,
    string[] indexed properties
  );

  event NftMinted(
    address indexed owner,
    uint256 indexed tokenCounter,
    uint256 indexed subcollectionId
  );

  event AuctionMinted(address indexed owner, uint256 indexed tokenCounter);

  // NFT Variables
  address private immutable i_allowedContract;
  address private immutable i_owner;
  mapping(uint256 => subcollection) s_tokenIdToSubcollection;
  subcollection[] private s_subcollections;
  uint256 public s_subcollectionIdCounter;
  uint256 public s_tokenCounter;

  constructor(
    address allowedContract
  ) ERC721('Fundraising Main Collection', 'FMC') {
    i_owner = msg.sender;
    s_subcollectionIdCounter = 0;
    s_tokenCounter = 0;
    i_allowedContract = allowedContract;
    setApprovalForAll(allowedContract, true);
  }

  // Modifiers

  modifier isOwner(address spender) {
    if (i_owner != spender) {
      revert MainCollection__NotOwner();
    }
    _;
  }

  modifier isSpenderAllowed(address spender) {
    if (i_allowedContract != spender) {
      revert MainCollection__ContractNotAllowed();
    }
    _;
  }

  // Main Functions

  function mintNft(
    uint256 subcollectionId,
    string memory tokenUri, // IPFS string
    address creatorAddress
  ) external isSpenderAllowed(msg.sender) {
    s_tokenIdToSubcollection[s_tokenCounter] = s_subcollections[
      subcollectionId
    ];

    _safeMint(creatorAddress, s_tokenCounter);
    _setTokenURI(s_tokenCounter, tokenUri);

    s_tokenCounter += 1;

    emit NftMinted(creatorAddress, (s_tokenCounter - 1), subcollectionId);
  }

  function mintAuction(
    string memory tokenUri, // IPFS string
    address creatorAddress
  ) external isSpenderAllowed(msg.sender) {
    _safeMint(creatorAddress, s_tokenCounter);
    _setTokenURI(s_tokenCounter, tokenUri);

    s_tokenCounter += 1;

    emit AuctionMinted(creatorAddress, (s_tokenCounter - 1));
  }

  function createSubcollection(
    string memory name,
    address charityAddress,
    string[] memory properties // background, clothes
  ) external isOwner(msg.sender) {
    subcollection memory newCollection = subcollection(
      s_subcollectionIdCounter,
      name,
      charityAddress,
      properties
    );

    s_subcollections.push(newCollection);
    s_subcollectionIdCounter += 1;

    emit SubcollectionCreated(
      s_subcollectionIdCounter - 1,
      name,
      charityAddress,
      properties
    );
  }

  function getTokenCounter() public view returns (uint256) {
    return s_tokenCounter;
  }

  function getSubcollectionCounter() public view returns (uint256) {
    return s_subcollectionIdCounter;
  }

  function getSubcollectionOfToken(
    uint256 tokenId
  ) public view returns (uint256) {
    return s_tokenIdToSubcollection[tokenId].id;
  }
}
