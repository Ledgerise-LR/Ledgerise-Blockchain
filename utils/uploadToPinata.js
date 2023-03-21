
const pinataSdk = require("@pinata/sdk");
const path = require("path");
const fs = require("fs");

const pinataApiKey = process.env.PINATA_API_KEY;
const pinataApiSecret = process.env.PINATA_API_SECRET;
const pinata = new pinataSdk(pinataApiKey, pinataApiSecret);

const fullImagesPath = path.resolve("./images");

async function storeImages(body) {

  console.log("Uploading to Pinata...");

  let responses = [];
  const readableStreamForFile = fs.createReadStream(`${fullImagesPath}/${body.fileName}`);
  // sending data as a stream because the file size is big
  try {
    const response = await pinata.pinFileToIPFS(readableStreamForFile, {
      pinataMetadata: {
        name: body.fileName,
      }
    });
    responses.push(response);
  } catch (e) {
    console.log(e);
  }

  return { responses, files };
}

async function storeUriMetadata(body) {
  try {
    const response = await pinata.pinJSONToIPFS(body.metadata);
    return response;
  } catch (e) {
    console.log(e);
  }
  return null;
}

module.exports = { storeImages, storeUriMetadata };
