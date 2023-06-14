"use strict";

import "dotenv/config";
import { providers } from "ethers";
import fs from "fs";
import { createReadStream } from "fs";
import csvParser from "csv-parser";
import makeRequest from "./src/meta.js";
import { SELECTOR_LIST } from "./src/constants.js";

const CSV = "./data_files/example.csv";

let csvAddresses = [];
let eoaArray = [];
let contractArray = [];
let timeoutAddresses = [];

const provider = new providers.WebSocketProvider(
  `wss://mainnet.infura.io/ws/v3/${process.env.INFURA_API_KEY}`
);

async function ensNameScraper(address) {
  return await provider.lookupAddress(address);
}

async function readCSV(csvFilePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    createReadStream(csvFilePath)
      .pipe(csvParser())
      .on("data", (row) => {
        rows.push(row);
      })
      .on("end", () => {
        resolve(rows);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

async function dataCombiner(address) {
  if (address.length > 0) {
    for (let j = 0; j < address.length; j++) {
      const addr = await makeRequest(address[j], SELECTOR_LIST[4]);
      if (addr === "error") {
        timeoutAddresses.push(address[j]);
      } else if (!addr.isContract) {
        const eoaName = await ensNameScraper(address[j].toLowerCase());
        if (eoaName != null) {
          eoaArray.push({ address: address[j], eoaName: eoaName });
        }
      } else {
        console.log("contract " + address[j]);

        const labels = await makeRequest(address[j], SELECTOR_LIST[0]);
        const creator = await makeRequest(address[j], SELECTOR_LIST[1]);
        const tokenInfo = await makeRequest(address[j], SELECTOR_LIST[2]);
        const chains = await makeRequest(address[j], SELECTOR_LIST[3]);

        if (addr.isVerified) {
          const contractName = await makeRequest(address[j], SELECTOR_LIST[5]);
          if (contractName != null) {
            contractArray.push({
              address: address[j],
              contractName: contractName,
              contractData: {
                labels: labels,
                creator: creator,
                tokenInfo: tokenInfo,
                chains: chains,
              },
            });
          }
        }
      }
    }
  }
}

async function retrieveCSV() {
  await readCSV(CSV)
    .then((data) => {
      for (let i = 0; i < data.length; i++) {
        const addr = data[i].address;
        csvAddresses.push(addr);
      }
    })
    .catch((error) => {
      console.error("Error reading CSV:", error);
    });
}

async function main() {
  await retrieveCSV();

  if (csvAddresses.length > 0) await dataCombiner(csvAddresses);
  if (timeoutAddresses.length > 0) await dataCombiner(timeoutAddresses);

  const jsonContract = JSON.stringify(contractArray);
  const jsonEOA = JSON.stringify(eoaArray);

  fs.writeFileSync("contracts.json", jsonContract, "utf8", (err) => {
    if (err) {
      console.error(err);
    }
    console.log("Success. Read contracts.json file");
  });

  fs.writeFileSync("eoa.json", jsonEOA, "utf8", (err) => {
    if (err) {
      console.error(err);
    }
    console.log("Success. Read eoa.json file");
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
