"use strict";

/**
 * Possible selectors mapping
 * 0 #ContentPlaceHolder1_divLabels - etherscan labels
 * 1 #ContentPlaceHolder1_trContract - contract creator
 * 2 #ContentPlaceHolder1_tr_tokeninfo - token info with logo
 * 3 #ContentPlaceHolder1_divMultichainAddress - if contract deployed in other chains
 */

import { parse } from "node-html-parser";
import axios from "axios";

const ETHERSCAN = "https://etherscan.io";

const SELECTOR_LIST = [
  "#ContentPlaceHolder1_divLabels",
  "#ContentPlaceHolder1_trContract div",
  "#ContentPlaceHolder1_tr_tokeninfo div",
  "#ContentPlaceHolder1_divMultichainAddress div div div ul",
];

async function getChains(data) {
  let arr = [];
  if (data.length > 0) {
    for (let i = 0; i < data.length; i++) {
      const link = data[i].childNodes[0].attributes.href;
      let logo, name;
      for (let j = 0; j < data[i].childNodes[0].childNodes.length; j++) {
        const element = data[i].childNodes[0].childNodes[j];
        if (element.rawTagName === "img") {
          logo = element.attributes.src;
        }
        if (element.rawTagName === "span") {
          name = element.childNodes[0]._rawText;
        }
      }
      arr.push({ link: link, logo: logo, name: name });
    }
    if (arr.length > 0) return arr;
  }
}

async function getCreator(data) {
  let arr = [];
  let deployer, deployerPath, txAddress, txPath;
  if (data.length > 0) {
    for (let i = 0; i < data.length; i++) {
      if (data[i].rawTagName === "a") {
        if (i == 1) {
          deployer = data[i].childNodes[0]._rawText;
          deployerPath = data[i].attributes.href;
        } else {
          txAddress = data[i].childNodes[0]._rawText;
          txPath = data[i].attributes.href;
        }
      }
    }
    arr.push({
      deployer: deployer,
      deployerPath: ETHERSCAN + deployerPath,
      txAddress: txAddress,
      txPath: ETHERSCAN + txPath,
    });
  }
  if (arr.length > 0) return arr;
}

async function getTokenInfo(data) {
  let arr = [];
  if (data.length > 0) {
    for (let i = 0; i < data.length; i++) {
      if (data[i].rawTagName === "a") {
        const tokenName = data[i].childNodes[i]._rawText;
        const tokenPath = data[i].attributes.href;
        if (data[i].childNodes.length > 0) {
          for (let j = 0; j < data[i].childNodes.length; j++) {
            const elem = data[i].childNodes[j];
            if (elem.rawTagName === "img") {
              arr.push({
                tokenName: tokenName,
                tokenPath: ETHERSCAN + tokenPath,
                img: ETHERSCAN + elem.attributes.src,
              });
            }
          }
        }
      }
    }
  }
  if (arr.length > 0) return arr;
}

async function getLabels(data) {
  let arr = [];
  if (data.length > 0) {
    for (let i = 0; i < data.length; i++) {
      if (data[i].rawTagName === "a" || data[i].rawTagName === "span") {
        const getLabel =
          data[i].querySelector("div span").childNodes[0]._rawText;
        if (getLabel != "") {
          arr.push(getLabel);
        }
      }
    }

    if (arr.length > 0) return arr;
  }
}

const makeRequest = async (address, selector) => {
  const response = await axios.get(`https://etherscan.io/address/${address}`);
  try {
    const root = parse(response.data);
    const data = root.querySelector(selector).childNodes;
    switch (selector) {
      case SELECTOR_LIST[0]:
        return await getLabels(data);
      case SELECTOR_LIST[1]:
        return await getCreator(data);
      case SELECTOR_LIST[2]:
        return await getTokenInfo(data);
      case SELECTOR_LIST[3]:
        return await getChains(data);
      default:
        break;
    }
  } catch (e) {
    return "empty";
  }
};

export default makeRequest;
