// SPDX-License-Identifier: MIT

// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.7;

import {Chainlink, ChainlinkClient} from "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import {LinkTokenInterface} from "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";

/**
 * Request testnet LINK and ETH here: https://faucets.chain.link/
 * Find information on LINK Token Contracts and get the latest ETH and LINK faucets here: https://docs.chain.link/docs/link-token-contracts/
 */

/**
 * THIS IS AN EXAMPLE CONTRACT THAT USES HARDCODED VALUES FOR CLARITY.
 * THIS IS AN EXAMPLE CONTRACT THAT USES UN-AUDITED CODE.
 * DO NOT USE THIS CODE IN PRODUCTION.
 */

/**
 * 
 * Chainlink token  0x779877A7B0D9E8603169DdbD7836e478b4624789
 * Chainlink oracle 0x6090149792dAAeE9D1D568c9f9a6F6B46AA29eFD
 */


// Errors //

error Entegrasyon__RequestAndCredentialsLengthNotSameError(uint256 difference);


contract Entegrasyon is ChainlinkClient {
    using Chainlink for Chainlink.Request;

    // Events //

    event RequestMultipleFulfilled(
      bytes32 requestId,
      uint256 response1,
      uint256 response2,
      uint256 response3
    );


    // Type declarations

    struct Request {
      string url; /** the request url */
      string pathLabel; /** an identificator that distincts the path from others */
      string path; /** path to the data */
    }

    struct ResponseBody {
      uint256 response1;
      uint256 response2;
      uint256 response3;
    }

    struct ResponseHistory {
      uint256 timestamp;
      ResponseBody responseBody;
    }

    // Immutable variables

    address immutable i_owner;
    address immutable i_confirmedContract;


    // Mutable variables

    bytes32 private jobId;
    uint256 private fee;

    string[] public s_urlLabels;
    mapping (string => Request) s_urlLabelToRequestMapping;
    mapping (bytes32 => ResponseHistory) s_requestIdToResponseHistoryMapping;

    constructor(
      address confirmedContract, 
      address chainlinkToken,
      address chainlinkOracle,
      string[] memory urlLabels,
      Request[] memory requestObjects
    ) {

        if (urlLabels.length != requestObjects.length) {
          revert Entegrasyon__RequestAndCredentialsLengthNotSameError(urlLabels.length - requestObjects.length);
        }

        _setChainlinkToken(chainlinkToken);
        _setChainlinkOracle(chainlinkOracle);

        jobId = "53f9755920cd451a8fe46f5087468395";
        fee = (1 * LINK_DIVISIBILITY) / 10; // 0,1 * 10**18 (Varies by network and job)

        i_owner = msg.sender;
        i_confirmedContract = confirmedContract;

        s_urlLabels = urlLabels;
        for (uint256 i = 0; i < urlLabels.length; i++) {

          string memory urlLabel = urlLabels[i];
          s_urlLabelToRequestMapping[urlLabel] = requestObjects[i];
        }
    }

    function requestMultipleParameters
    (
      string[] memory urlLabels,
      string[] memory queries /** e-devlet entegrasyonu için kimlik bilgileri */
    ) external {

        if (urlLabels.length != queries.length) {
          revert Entegrasyon__RequestAndCredentialsLengthNotSameError(urlLabels.length - queries.length);
        }

        Chainlink.Request memory req = _buildChainlinkRequest(
            jobId,
            address(this),
            this.fulfillMultipleParameters.selector
        );

        
        for (uint i = 0; i < urlLabels.length; i++) {
          string memory urlLabel = urlLabels[i];
          Request memory request = s_urlLabelToRequestMapping[urlLabel];
          string memory query = queries[i];

          req._add(
            urlLabel,
            string(abi.encodePacked(request.url, query))
          );
          req._add(
            request.pathLabel,
            request.path
          );
        }

        _sendChainlinkRequest(req, fee); // MWR API.
    }

    /**
     * @notice Fulfillment function for multiple parameters in a single request
     * @dev This is called by the oracle. recordChainlinkFulfillment must be used.
     */
    function fulfillMultipleParameters(
        bytes32 requestId,
        uint256 response1,
        uint256 response2,
        uint256 response3
    ) public recordChainlinkFulfillment(requestId) {
        emit RequestMultipleFulfilled(
            requestId,
            response1,
            response2,
            response3
        );
        s_requestIdToResponseHistoryMapping[requestId] = ResponseHistory(
          block.timestamp,
          ResponseBody(response1, response2, response3)
        );
    }


    function getAllRequestLabels() public view returns (string[] memory) {
      return s_urlLabels;
    }

    
    function getRequestFromLabel(string memory urlLabel) public view returns (Request memory) {
      return s_urlLabelToRequestMapping[urlLabel];
    }


    function getResponseHistoryFromRequestId(bytes32 requestId) public view returns (ResponseHistory memory) {
      return s_requestIdToResponseHistoryMapping[requestId];
    }
}
