
const { expect, assert } = require("chai");
const { ethers, getNamedAccounts, network, deployments } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");

const ENTEGRASYON_SEPOLIA = "0xaF39B71dCE3bB0A5C7Eb4943Da88F562eb719d4F";

developmentChains.includes(network.name)
  ? describe.skip()
  : describe("Entegrasyon", () => {
    
    let entegrasyon, deployer, query1, query2, query3;

    beforeEach(async () => {
      deployer = (await getNamedAccounts()).deployer;   
      entegrasyon = await ethers.getContract("Entegrasyon", deployer);
      queryString1 = "?tokenId=6&subcollectionId=4&nftAddress=0x992B8cF28fF160f18da15B3FC0d8C1952bf8F19f";
      queryString2 = "?tokenId=6&subcollectionId=4&nftAddress=0x992B8cF28fF160f18da15B3FC0d8C1952bf8F19f";
    })

    describe("get mutliple api response data", () => {

      let historyCounter;

      it("calls api endpoints and returns responses", async () => {
        try {
          await entegrasyon.requestAll(queryString1, queryString2);  

          await new Promise(async (resolve, reject) => {
            setTimeout(() => {
              reject();
            }, 30000);
            entegrasyon.once("requestHistorySaved", async (
              _historyCounter
            ) => {
              historyCounter = parseInt(_historyCounter);
              resolve();
            })
          });

          console.log(historyCounter);

          const responseHistory = await entegrasyon.getResponseHistoryFromHistoryId(historyCounter);

          console.log(responseHistory);
          assert(historyCounter);
        } catch (error) {
          console.log(error)
        }
      })
    })
  })
