// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import '@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol';

library PriceConverter {
  function getPrice(
    AggregatorV3Interface priceFeed
  ) internal view returns (uint256) {
    (, int price, , , ) = priceFeed.latestRoundData();
    return uint256(price) * 1e10;
  }

  function getConversionRate(
    uint256 ethAmount,
    AggregatorV3Interface priceFeed
  ) internal view returns (uint256) {
    uint256 ethPrice = getPrice(priceFeed);

    return (ethAmount * ethPrice) / 1e18;
  }

  function getPriceFiatToFiat(
    AggregatorV3Interface priceFeed
  ) internal view returns (uint256) {
    (, int price, , , ) = priceFeed.latestRoundData();
    return uint256(price);
  }

  function getConversionRateFiatToFiat(
    uint256 fiatAmount,
    AggregatorV3Interface priceFeed
  ) internal view returns (uint256) {
    uint256 fiatPrice = getPriceFiatToFiat(priceFeed);
    return (fiatAmount * fiatPrice);
  }
}
