
const { storeImages, storeUriMetadata } = require("../utils/uploadToPinata");
require("dotenv").config();

// Please change the metadata accordingly to the NFT !!!
const metadataTemplate = {
  name: "",
  description: "",
  image: "",
  attributes: [
    {
      trait_type: "Protein",
      value: 50
    },
    {
      trait_type: "Carbohydrate",
      value: 20
    }
  ]
}

const imagesLocation = "./images/noHungerForAfrica"

let tokenUris = [];

const uploadToPinata = async () => {

  if (process.env.UPLOAD_TO_PINATA == "true") {
    tokenUris = await handleTokenUris();
  }
}


async function handleTokenUris() {
  tokenUris = [];

  // store the image on IPFS 
  // store the metadata on IPFS

  const { responses: imageUploadResponses, files } = await storeImages(imagesLocation);

  for (const imageUploadResponsesIndex in imageUploadResponses) {
    // create metadata
    // uploadMetadata
    let tokenUriMetadata = { ...metadataTemplate };
    tokenUriMetadata.name = files[imageUploadResponsesIndex].replace(".png", "");
    tokenUriMetadata.description = `The price of this NFT is equal to the real price of "${tokenUriMetadata.name.toLowerCase()}".`;
    tokenUriMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponsesIndex].IpfsHash}`;
    console.log(`Uploading ${tokenUriMetadata.name}`);
    // store the json
    const metaDataUploadResponse = await storeUriMetadata(tokenUriMetadata);
    tokenUris.push(`ipfs://${metaDataUploadResponse.IpfsHash}`);
  }
  console.log(tokenUris)
  return tokenUris;
}

uploadToPinata()
  .then(() => {
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  })

