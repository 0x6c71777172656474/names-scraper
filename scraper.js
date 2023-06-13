"use strict";

import "dotenv/config";
import { providers } from "ethers";
import axios from "axios";
import fs from "fs";
import { createReadStream } from "fs";
import csvParser from "csv-parser";
// const { stringify } = require("csv-stringify");
import makeRequest from "./meta.js";
const CSV = "./data_files/example.csv";

let csvAddresses = [];
let eoaArray = [];
let contractArray = [];
const folders = ["data_files"];
const csv = [["address", "contractName", "eoaName"]];

const SELECTOR_LIST = [
  "#ContentPlaceHolder1_divLabels",
  "#ContentPlaceHolder1_trContract div",
  "#ContentPlaceHolder1_tr_tokeninfo div",
  "#ContentPlaceHolder1_divMultichainAddress div div div ul",
];

const provider = new providers.WebSocketProvider(
  `wss://mainnet.infura.io/ws/v3/${process.env.INFURA_API_KEY}`
);

async function getContractName(address) {
  try {
    const getSourceCode = `${process.env.ETHERSCAN_SOURCECODE_URL}${address}&apikey=${process.env.ETHERSCAN_API_KEY}`;
    // getAbi could be surplus because of limited requests
    const getAbi = `${process.env.ETHERSCAN_ABI_URL}${address}&apikey=${process.env.ETHERSCAN_API_KEY}`;

    const responseGetSourceCode = await axios.get(getSourceCode);
    const responseGetAbi = await axios.get(getAbi);
    const contractName = responseGetSourceCode.data.result[0].ContractName;

    if (responseGetAbi.data.status == 1) {
      return contractName;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error retrieving contract name:", error);
    return null;
  }
}

async function ensNameScraper(address) {
  return await provider.lookupAddress(address);
}

// async function writeResultCSV(src) {
//   folders.forEach((folder) => {
//     src.forEach((v) => {
//       csv.push([v.address, v.nameTag || " "]);
//     });
//     const csvContent = csv
//       .map((v) => {
//         return v.join(",");
//       })
//       .join("\n");
//     fs.writeFileSync(path.join(srcFolder, "all.csv"), csvContent);
//   });
// }

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

async function isEOA(address) {
  try {
    const code = await provider.getCode(address);
    if (code && code.length > 2) {
      return false;
    } else {
      return true;
    }
  } catch (error) {
    console.error("Error checking address code:", error);
    return false;
  }
}

async function main() {
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

  if (csvAddresses.length > 0) {
    for (let j = 0; j < csvAddresses.length; j++) {
      if (await isEOA(csvAddresses[j])) {

        console.log("eoa " + j);
        const eoaName = await ensNameScraper(csvAddresses[j].toLowerCase());
        if (eoaName != null) {
          eoaArray.push({ address: csvAddresses[j], eoaName: eoaName });
        }
      } else {
        console.log("contract " + j);
        const labels = await makeRequest(csvAddresses[j], SELECTOR_LIST[0]);
        const creator = await makeRequest(csvAddresses[j], SELECTOR_LIST[1]);
        const tokenInfo = await makeRequest(csvAddresses[j], SELECTOR_LIST[2]);
        const chains = await makeRequest(csvAddresses[j], SELECTOR_LIST[3]);
        
        const contractName = await getContractName(csvAddresses[j]);
        if (contractName != null) {
          contractArray.push({
            address: csvAddresses[j],
            contractName: contractName,
            contractData: {
              labels:labels,
              creator: creator,
              tokenInfo: tokenInfo,
              chains: chains,
            },
          });
        }
      }
    }
    const jsonContract = JSON.stringify(contractArray);
    const jsonEOA = JSON.stringify(eoaArray);

    fs.writeFileSync('contracts.json', jsonContract, 'utf8', err => {
      if (err) {
        console.error(err);
      }
      console.log("Success. Read contracts.json file");
    });

    fs.writeFileSync('eoa.json', jsonEOA, 'utf8', err => {
      if (err) {
        console.error(err);
      }
      console.log("Success. Read eoa.json file");
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
