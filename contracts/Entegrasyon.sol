
//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import {Chainlink, ChainlinkClient} from "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {LinkTokenInterface} from "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";

/**
 * Request testnet LINK and ETH here: https://faucets.chain.link/
 * Find information on LINK Token Contracts and get the latest ETH and LINK faucets here: https://docs.chain.link/docs/link-token-contracts/
 */

/**
 * JOB IDs
 * GET>bytes | 7da2702f37fd48e5b1b9a5715e3509b6 (for images)
 * GET>string | 7d80a6386ef543a3abb52817f6707e3b 
 * GET>uint256 | ca98366cc7314957b8c012c72f05aeeb 
 * GET>boolean | c1c5e92880894eb6b27d3cae19670aa3 
 */

contract Entegrasyon is ChainlinkClient, ConfirmedOwner {
    using Chainlink for Chainlink.Request;

    uint256 private fee;

    // Immutable Variables //
    address immutable i_owner;
    // address immutable i_confirmedContract;


    // Events for each request //

    event Request_1_Fulfilled(
        bytes32 indexed requestId,
        string response1
    );

    event Request_2_Fulfilled(
        bytes32 indexed requestId,
        string response2
    );

    event requestHistorySaved(
      uint256 historyId
    );

    // Type Declarations //
    struct ResponseHistory {
      uint256 timestamp;
      string response1;
      string response2;
    }

    // Contract Variables //
    uint256 public s_historyCounter;
    mapping (uint256 => ResponseHistory) s_requestIdToResponseHistoryMapping;

    /**
     * Sepolia Testnet details:
     * Link Token: 0x779877A7B0D9E8603169DdbD7836e478b4624789
     * Oracle: 0x6090149792dAAeE9D1D568c9f9a6F6B46AA29eFD (Chainlink DevRel)	
     */

    constructor(
      address chainlinkToken,
      address chainlinkOracle
    ) ConfirmedOwner(msg.sender) {
        _setChainlinkToken(chainlinkToken);
        _setChainlinkOracle(chainlinkOracle);

        i_owner = msg.sender;

        fee = (1 * LINK_DIVISIBILITY) / 10;
        
        s_historyCounter = 1;
    }


    function requestAll(
      string memory queryStringReq1, 
      string memory queryStringReq2
    ) public {

      s_requestIdToResponseHistoryMapping[s_historyCounter] = ResponseHistory(
        block.timestamp,
        "pending",
        "pending"
      );

      request1(queryStringReq1);
      request2(queryStringReq2);

      // s_historyCounter += 1;

      // emit requestHistorySaved(
      //   s_historyCounter - 1
      // );
    }


    function request1(string memory queryString) public {   // path: numbers for array indices, slot names for objects

      Chainlink.Request memory req = _buildChainlinkRequest("7d80a6386ef543a3abb52817f6707e3b", address(this), this.fulfillRequest1.selector);
      
      req._add(
          "get",
          string(abi.encodePacked("https://api.ledgerise.org/active-item/get-asset", queryString))
      );
      req._add("path", "activeItem,seller");

      _sendChainlinkRequest(req, fee);
    }

    function fulfillRequest1(
      bytes32 _requestId, 
      string memory _response1
    ) public recordChainlinkFulfillment(_requestId) {
      s_requestIdToResponseHistoryMapping[s_historyCounter].response1 = _response1;
      emit Request_1_Fulfilled(
        _requestId,
        _response1
      );
    }

    

    function request2(string memory queryString) public {
      Chainlink.Request memory req = _buildChainlinkRequest("7d80a6386ef543a3abb52817f6707e3b", address(this), this.fulfillRequest2.selector);
      
      req._add(
          "get",
          string(abi.encodePacked('https://api.ledgerise.org/active-item/get-asset', queryString))
      );
      req._add("path", "activeItem,tokenUri");

      _sendChainlinkRequest(req, fee);
    }

    function fulfillRequest2(
      bytes32 _requestId, 
      string memory _response2
    ) public recordChainlinkFulfillment(_requestId) {
      s_requestIdToResponseHistoryMapping[s_historyCounter].response2 = _response2;
      emit Request_2_Fulfilled(
        _requestId,
        _response2
      );
      
      s_historyCounter += 1;
      emit requestHistorySaved(
        s_historyCounter - 1
      );
    }

    /**
     * Withdraw LINK tokens for reusability
     */
    function withdrawLink() public onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(_chainlinkTokenAddress());
        require(
            link.transfer(msg.sender, link.balanceOf(address(this))),
            "Unable to transfer"
        );
    }


    // Get functions //

    function getResponseHistoryFromHistoryId(uint256 historyId) public view returns(ResponseHistory memory) {
      return s_requestIdToResponseHistoryMapping[historyId];
    }

    function getHistoryCounter() public view returns(uint256) {
      return s_historyCounter;
    }
}
