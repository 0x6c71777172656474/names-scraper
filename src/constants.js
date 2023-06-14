
/**
 * Possible selectors mapping
 * 0 #ContentPlaceHolder1_divLabels - etherscan labels
 * 1 #ContentPlaceHolder1_trContract - contract creator
 * 2 #ContentPlaceHolder1_tr_tokeninfo - token info with logo
 * 3 #ContentPlaceHolder1_divMultichainAddress - if contract deployed in other chains
 * 4 #nav_tabs - tabs in contract section
 * 5 query to find a Contract name
 */
export const SELECTOR_LIST = [
  "#ContentPlaceHolder1_divLabels",
  "#ContentPlaceHolder1_trContract div",
  "#ContentPlaceHolder1_tr_tokeninfo div",
  "#ContentPlaceHolder1_divMultichainAddress div div div ul",
  "ul#nav_tabs",
  'div:contains("Contract Name:") span.fw-bold',
];
export const ETHERSCAN = "https://etherscan.io";