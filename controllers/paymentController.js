const Web3 = require("web3");
const contractABI = require("../ContractABI.json");
const contractAddress = "0x22E630bF3199f2765A2F760903cC0F96572815ED";
const web3 = new Web3(
  "https://sepolia.infura.io/v3/464394f410794ec3a8260f2c56823dec"
);
const contract = new web3.eth.Contract(contractABI, contractAddress);

const video = require("../models/video");
const user = require("../models/user");
const liveStream = require("../models/liveStream");
exports.payment_get = (req, res) => {
  const error = req.session.error;
  delete req.session.error;
  res.render("payment", { error: error });
};

exports.payment_post = async (req, res) => {
  const video_id = req.params.video_id;
  try {
    const buyerAddress = req.body.address;
    const privateKey = req.body.privateKey;

    if (!/^[0-9a-fA-F]{64}$/.test(privateKey)) {
      req.session.error = "Invalid private key";
      return res.redirect(`/play/${video_id}`);
    }

    if (!web3.utils.isAddress(buyerAddress)) {
      req.session.error = "Invalid wallet credentials";
      return res.redirect(`/play/${video_id}`);
    }

    const target_video = await video.findOne({ video_id: video_id });
    const account = web3.eth.accounts.privateKeyToAccount("0x" + privateKey);
    web3.eth.accounts.wallet.add(account);

    if (account.address.toLowerCase() !== buyerAddress.toLowerCase()) {
      req.session.error = "Private key does not match the wallet address";
      return res.redirect(`/play/${video_id}`);
    }

    const contractMethod = contract.methods.buyVideo(web3.utils.toBN(video_id));
    const gas = await contractMethod.estimateGas({
      from: buyerAddress,
      value: target_video.price,
    });
    const gasPrice = await web3.eth.getGasPrice();
    const buyerBalance = await web3.eth.getBalance(buyerAddress);

    const data = contractMethod.encodeABI();
  
    const tx = {
      from: buyerAddress,
      to: contract.options.address,
      gas,
      gasPrice,
      data,
      value: target_video.price,
    };
    const totalPrice = gasPrice + tx.value;

    const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
    const receipt = await web3.eth.sendSignedTransaction(
      signedTx.rawTransaction
    );

    if (receipt.status) {
      const videoToken = target_video.video_token;
      const username = req.session.username;

      await user.findOneAndUpdate(
        { username },
        { $addToSet: { video_tokens: videoToken } },
        { new: true }
      );
    } else {
      req.session.error = "Transaction failed.";
      return res.redirect(`/play/${video_id}`);
    }
    res.redirect(`/play/${video_id}`);
  } catch (error) {
    req.session.error = `Insufficient funds`;
    res.redirect(`/play/${video_id}`);
  }
};

exports.livestream_payment_post = async (req, res) => {
  const buyerAddress = req.body.address;
  const privateKey = req.body.privateKey;
  const streamKey = req.params.streamKey;
  const target_stream = await liveStream.findOne({ streamKey: streamKey });
  try {
    if (!/^[0-9a-fA-F]{64}$/.test(privateKey)) {
      req.session.error = "Invalid private key";
      return res.redirect(`/liveStream/${target_stream.username}`);
    }

    if (!web3.utils.isAddress(buyerAddress)) {
      req.session.error = "Invalid wallet credentials";
      return res.redirect(`/liveStream/${target_stream.username}`);
    }

    
    const account = web3.eth.accounts.privateKeyToAccount("0x" + privateKey);
    web3.eth.accounts.wallet.add(account);

    if (account.address.toLowerCase() !== buyerAddress.toLowerCase()) {
      req.session.error = "Private key does not match the wallet address";
      return res.redirect(`/liveStream/${target_stream.username}`);
    }

    const contractMethod = contract.methods.buyVideo(
      web3.utils.toBN(streamKey)
    );
    const gas = await contractMethod.estimateGas({
      from: buyerAddress,
      value: target_stream.stream_price,
    });
    const gasPrice = await web3.eth.getGasPrice();
    const data = contractMethod.encodeABI();
    const buyerBalance = await web3.eth.getBalance(buyerAddress);

    const tx = {
      from: buyerAddress,
      to: contract.options.address,
      gas,
      gasPrice,
      data,
      value: target_stream.stream_price,
    };
    const totalPrice = parseInt(gasPrice) + parseInt(tx.value);

    const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
    const receipt = await web3.eth.sendSignedTransaction(
      signedTx.rawTransaction
    );

    if (receipt.status) {
      const username = req.session.username;

      await user.findOneAndUpdate(
        { username },
        { $addToSet: { video_tokens: streamKey } },
        { new: true }
      );
    } else {
      req.session.error = "Transaction failed.";
      return res.redirect(`/play/${video_id}`);
    }
    res.redirect(`/liveStream/${target_stream.username}`);
  } catch (error) {
    req.session.error = `Insufficient funds`;
    res.redirect(`/liveStream/${target_stream.username}`);
  }
};
