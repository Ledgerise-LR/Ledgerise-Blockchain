
const { expect } = require("chai");
const { ethers, getNamedAccounts, network, deployments } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");

const ENTEGRASYON_SEPOLIA = "0xCcfec35F6Eef1ade6a255328a4a1bFCF3830DC6D";

developmentChains.includes(network.name)
  ? describe.skip()
  : describe("Entegrasyon", () => {
    
    let entegrasyon, deployer, btcQuery, usdQuery, eurQuery;

    beforeEach(async () => {
      deployer = (await getNamedAccounts()).deployer;   
      entegrasyon = await ethers.getContract("Entegrasyon", deployer);
      btcQuery = "?fsym=ETH&tsyms=BTC";
      usdQuery = "?fsym=ETH&tsyms=USD";
      eurQuery = "?fsym=ETH&tsyms=EUR";
    })

    describe("get mutliple api response data", () => {

      let g_requestId, g_response1;

      it("calls api endpoints and returns responses", async () => {
        try {
          await entegrasyon.requestMultipleParameters(["urlBTC", "urlUSD", "urlEUR"], [btcQuery, usdQuery, eurQuery]);  

          await new Promise(async (resolve, reject) => {
            setTimeout(() => {
              reject();
            }, 30000);
            entegrasyon.once("RequestMultipleFulfilled", async (
              requestId,
              response1,
              response2,
              response3
            ) => {

              g_requestId = requestId;
              g_response1 = response1;

              resolve();
            })
          });

          const requestHistory = await entegrasyon.getResponseHistoryFromRequestId(g_requestId);
          assert.equal(requestHistory.response1, g_response1);

        } catch (error) {
          console.log(error)
        }
      })
    })

    describe("get functions", () => {

      it("gets the array of urlLabels", async function () {
        const response = await entegrasyon.getAllRequestLabels();
        expect(response[0]).to.be.equal("urlBTC");
      })

      it("gets the request object", async function () {
        const response = await entegrasyon.getAllRequestLabels();
        const request = await entegrasyon.getRequestFromLabel(response[0]);
        expect(request.url).to.be.equal("https://min-api.cryptocompare.com/data/price");
      })
    })
  })
