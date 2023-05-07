const Web3 = require("web3");
const dotenv = require("dotenv");
const contractABI = require("../ContractABI.json");
const contractAddress = "0x22E630bF3199f2765A2F760903cC0F96572815ED";
const web3 = new Web3("https://sepolia.infura.io/v3/464394f410794ec3a8260f2c56823dec"); 
const contract = new web3.eth.Contract(contractABI, contractAddress);
const {
  S3Client,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const liveStream = require('../models/liveStream');
const user = require('../models/user');
const crypto = require('crypto');
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
dotenv.config();

const bucketName = process.env.AWS_BUCKET_NAME;
const bucketRegion = process.env.AWS_BUCKET_REGION;
const accessKey = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;

const s3 = new S3Client({
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretAccessKey,
  },
  region: bucketRegion,
});


exports.live_details_get = (req,res) =>{
  res.render("livedetails",{username: req.session.username})
}

exports.live_details_post = async(req,res) => {
  const streamTitle = req.body.title;
  const streamStatus = req.body.status;
  let priceInWei;
  
  if (req.body.price == null) {
    priceInWei = 0;
  }
  else{
    const priceInEth = req.body.price/req.body.ethereumValue
    priceInWei = Math.ceil(priceInEth * 10 ** 18);
  }
  const randomVideoName = () => crypto.randomBytes(5).toString("hex").substring(0, 10);
  const streamKey = randomVideoName()

  const filter = {username: req.session.username}
  const update = {$set: {streamKey: streamKey, stream_status: streamStatus, stream_title: streamTitle, stream_price: priceInWei }}
  const options = {upsert: true, new: true };
  await liveStream.findOneAndUpdate(filter, update, options);
  if (req.body.status === "paid") {
    const account = web3.eth.accounts.privateKeyToAccount("0x" + req.body.privatekey);
    web3.eth.accounts.wallet.add(account);

    const streamPrice = priceInWei;
    const contractMethod = contract.methods.addVideoDetail(
      web3.utils.toBN(streamKey),
      streamPrice
    );
    const gas = await contractMethod.estimateGas({ from: req.body.address });
    const gasPrice = await web3.eth.getGasPrice();
    const data = contractMethod.encodeABI();

    const tx = {
      from: req.body.address,
      to: contract.options.address,
      gas,
      gasPrice,
      data,
    };

    const signedTx = await web3.eth.accounts.signTransaction(
      tx,
      req.body.privatekey
    );
    const receipt = await web3.eth.sendSignedTransaction(
      signedTx.rawTransaction
    );

    if (!receipt.status) {
      res.send(400).send(`live stream failed to upload to smart contract`);
    }
  }
  res.redirect('/live')
}

exports.live_get = async(req, res) => {
  const targetUser = await liveStream.findOne({username: req.session.username});
  res.render("live", { user: targetUser, username: req.session.username});
}

exports.liveStream_get = async(req,res) => {
    const target_stream = await liveStream.findOne({username: req.params.username})

    const target_user = await user.findOne({username: req.params.username})
    const streamKey = target_stream.streamKey;
    const self_user = await user.findOne({ username: req.session.username });
    const user_video_token = self_user?.video_tokens || [];
    let is_paid = false;
    if (target_stream.stream_status === "paid") {
      is_paid = true;
    }
    
    let video_owned = false;
    if (user_video_token.includes(streamKey)) {
      video_owned = true;
    }

    target_user.profilepic_url = await getSignedUrl(
      s3,
    new GetObjectCommand({
      Bucket: bucketName,
      Key: `${target_user.user_id}.png`,
    })
    )
    target_user.save()

    res.render("liveStream",
    {streamKey: streamKey,
       target_username: target_stream.username,
       username: req.session.username,
        streamTitle: target_stream.stream_title,
        isPaid: is_paid,
        videoOwned: video_owned,
        target_user
      }
      )
  }
