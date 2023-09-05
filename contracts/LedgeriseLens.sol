// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';

// errors
error LedgeriseLens__NotOwner();

contract LedgeriseLens is ERC721URIStorage {
  struct ItemVisual {
    string tokenUri;
    uint256 visualOpenseaTokenId;
  }

  event VisualNftMinted(
    address indexed owner,
    uint256 indexed tokenCounter,
    uint256 indexed openseaTokenId
  );

  address private immutable i_owner;
  uint256 public s_tokenCounter;
  mapping(address => mapping(uint256 => mapping(string => ItemVisual))) s_buyerToIdToKeyToVisual;

  constructor() ERC721('LedgeriseLens Visual Verification', 'LVV') {
    s_tokenCounter = 0;
    i_owner = msg.sender;
    setApprovalForAll(msg.sender, true);
  }

  modifier isOwner(address spender) {
    if (i_owner != spender) {
      revert LedgeriseLens__NotOwner();
    }
    _;
  }

  function mintVisualNftuint256(
    uint256 itemOpenseaTokenId,
    string memory tokenUri,
    address buyer,
    string memory key
  ) external isOwner(msg.sender) {
    s_buyerToIdToKeyToVisual[buyer][itemOpenseaTokenId][key] = ItemVisual(
      tokenUri,
      s_tokenCounter
    );

    _safeMint(buyer, s_tokenCounter);
    _setTokenURI(s_tokenCounter, tokenUri);

    s_tokenCounter += 1;

    emit VisualNftMinted(buyer, (s_tokenCounter - 1), itemOpenseaTokenId);
  }

  function tokenURI(
    uint256 itemOpenseaTokenId,
    address buyer,
    string memory key
  ) public view returns (string memory) {
    return s_buyerToIdToKeyToVisual[buyer][itemOpenseaTokenId][key].tokenUri;
  }

  function getTokenCounter() public view returns (uint256) {
    return s_tokenCounter;
  }
}
