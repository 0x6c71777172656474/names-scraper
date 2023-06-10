require("dotenv").config();
const ethers = require("ethers");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const csvParser = require("csv-parser");
// const { stringify } = require("csv-stringify");

const ABI = require("./data_files/ens_abi.json");
const CSV = "./data_files/example.csv";

let csvAddresses = [];
let completeArr = [];
const folders = ["data_files"];
const csv = [["address", "contractName", "eoaName"]];

const provider = new ethers.providers.WebSocketProvider(
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

    fs.createReadStream(csvFilePath)
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
        const eoaName = await ensNameScraper(csvAddresses[j].toLowerCase());
        if (eoaName != null) {
          completeArr.push({ address: csvAddresses[j], eoaName: eoaName });
        }
      } else {
        const contractName = await getContractName(csvAddresses[j]);
        if (contractName != null) {
          completeArr.push({
            address: csvAddresses[j],
            contractName: contractName,
          });
        }
      }
    }
    console.log(JSON.stringify(completeArr, null, 2));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
