
const pinataSdk = require("@pinata/sdk");
const path = require("path");
const fs = require("fs");

const pinataApiKey = process.env.PINATA_API_KEY;
const pinataApiSecret = process.env.PINATA_API_SECRET;
const pinata = new pinataSdk(pinataApiKey, pinataApiSecret);

const fullImagesPath = path.resolve("./images");

async function storeImages(imagesFilePath) {

  console.log("Uploading to Pinata...");
  const fullImagesPath = path.resolve(imagesFilePath);
  const files = fs.readdirSync(fullImagesPath);

  let responses = [];
  for (fileIndex in files) {
    console.log(`${fullImagesPath}/${files[fileIndex]}`)
    const readableStreamForFile = fs.createReadStream(`${fullImagesPath}/${files[fileIndex]}`);
    // sending data as a stream because the file size is big
    try {
      const response = await pinata.pinFileToIPFS(readableStreamForFile, {
        pinataMetadata: {
          name: files[fileIndex],
        }
      });
      responses.push(response);
    } catch (e) {
      console.log(e);
    }
  }
  return { responses, files };
}


async function storeUriMetadata(metadata) {
  try {
    const response = await pinata.pinJSONToIPFS(metadata);
    return response;
  } catch (e) {
    console.log(e);
  }
  return null;
}

module.exports = { storeImages, storeUriMetadata };
