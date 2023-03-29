const Web3 = require('web3');
const contractABI = require('../ContractABI.json');
const contractAddress = '0x238143BfB5B7aF382a318142243d205928364861'; 

const web3 = new Web3('https://goerli.infura.io/v3/a20f5f30b1a94924b6442672c9c13275'); // replace with your Infura project ID or local blockchain network URL
const contract = new web3.eth.Contract(contractABI, contractAddress);

exports.payment_get = (req,res) => {
    res.render('payment')
}

exports.payment_post = (req,res) => {
const viewerAddress = `0x361B8F0e0f58028fE4CDdc618e23744B04da4D1e`
const uploaderAddress = `0xD20457ECd19fA46fb5D8E00835dC59d055474751`
const videoId = 12
const cost = 500


contract.methods.buyVideo(videoId).send({
    from: viewerAddress,
    to: uploaderAddress,
    value: cost,
    gas: 500000,
    gasPrice: 1000000000
  }).then((receipt) => {
    console.log(receipt);
  }).catch((error) => {
    console.log(error);
  });

}