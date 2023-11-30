// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';

// errors
error LedgeriseLens__NotOwner();
error LedgeriseLens__ItemAlreadyVerified();

contract LedgeriseLens is ERC721URIStorage {
  struct ItemVisual {
    string tokenUri;
    uint256 visualOpenseaTokenId;
  }

  event VisualNftMinted(
    string owner,
    uint256 indexed tokenCounter,
    uint256 indexed openseaTokenId
  );

  enum EventType {
    STAMP,
    SHIPPED,
    DELIVERED
  }

  address private immutable i_owner;
  uint256 public s_tokenCounter;
  mapping(string => mapping(uint256 => mapping(EventType => ItemVisual))) s_buyerToIdToKeyToVisual;

  constructor() ERC721('LedgeriseLens Visual Verification', 'LVV') {
    s_tokenCounter = 0;
    i_owner = msg.sender;
  }

  modifier isOwner(address spender) {
    if (i_owner != spender) {
      revert LedgeriseLens__NotOwner();
    }
    _;
  }

  function mintVisualNft(
    uint256 itemOpenseaTokenId,
    string memory tokenUri,
    string memory buyer,
    uint256 key
  ) external isOwner(msg.sender) {
    if (
      bytes(
        s_buyerToIdToKeyToVisual[buyer][itemOpenseaTokenId][EventType(key)]
          .tokenUri
      ).length > 0
    ) {
      revert LedgeriseLens__ItemAlreadyVerified();
    }
    s_buyerToIdToKeyToVisual[buyer][itemOpenseaTokenId][
      EventType(key)
    ] = ItemVisual(tokenUri, s_tokenCounter);

    _safeMint(i_owner, s_tokenCounter);
    _setTokenURI(s_tokenCounter, tokenUri);

    s_tokenCounter += 1;

    emit VisualNftMinted(buyer, (s_tokenCounter - 1), itemOpenseaTokenId);
  }

  function getTokenUri(
    uint256 itemOpenseaTokenId,
    string memory buyer,
    uint256 key
  ) public view returns (string memory) {
    return
      s_buyerToIdToKeyToVisual[buyer][itemOpenseaTokenId][EventType(key)]
        .tokenUri;
  }

  function getTokenCounter() public view returns (uint256) {
    return s_tokenCounter;
  }
}
