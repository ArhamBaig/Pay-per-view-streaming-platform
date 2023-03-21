const Web3 = require('web3');
const contractABI = require('../ContractABI.json');
const contractAddress = '0x238143BfB5B7aF382a318142243d205928364861'; 

const web3 = new Web3('HTTP://127.0.0.1:7545'); // replace with your Infura project ID or local blockchain network URL
const contract = new web3.eth.Contract(contractABI, contractAddress);

