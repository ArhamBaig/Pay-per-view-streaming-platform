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
  const error = req.session.error;
  delete req.session.error;
  res.render("livedetails",{error,username: req.session.username})
}

exports.live_details_post = async(req,res) => {
  const streamTitle = req.body.title;
  const streamStatus = req.body.status;
  if ( !streamTitle ) {
    req.session.error = "Please fill in all the required fields.";
    return res.redirect("/livedetails");
  }

  let priceInWei;
  let priceInDollars;

  if (req.body.price == null) {
    priceInWei = 0;
    priceInDollars = 0;
  }
  else{
    const priceInEth = req.body.price/req.body.ethereumValue
    priceInWei = Math.ceil(priceInEth * 10 ** 18);
    priceInDollars = req.body.price;
  }
  const randomVideoName = () => crypto.randomBytes(5).toString("hex").substring(0, 10);
  const streamKey = randomVideoName()

  const filter = {username: req.session.username}
  const update = {$set: {streamKey: streamKey, stream_status: streamStatus, stream_title: streamTitle, stream_price: priceInWei, priceInDollars:priceInDollars }}
  const options = {upsert: true, new: true };
  await liveStream.findOneAndUpdate(filter, update, options);
  if (req.body.status === "paid") {
    try{
    const privateKey = req.body.privatekey;
    const uploaderAddress = req.body.address;

    if (!web3.utils.isAddress(uploaderAddress)) {
      req.session.error = "Invalid wallet credentials";
      return res.redirect(`/livedetails`);
    }

    if (!/^[0-9a-fA-F]{64}$/.test(privateKey)) {
      req.session.error = "Invalid private key";
      return res.redirect(`/livedetails`);
    }

    const account = web3.eth.accounts.privateKeyToAccount("0x" + privateKey);
    web3.eth.accounts.wallet.add(account);

    const streamPrice = Math.ceil(priceInWei * 0.7);
    if (account.address.toLowerCase() !== uploaderAddress.toLowerCase()) {
      req.session.error = "Private key does not match the wallet address";
      return res.redirect(`/livedetails`);
    }

    const contractMethod = contract.methods.addVideoDetail(
      web3.utils.toBN(streamKey),
      web3.utils.toBN(streamPrice)
    );
    const gas = await contractMethod.estimateGas({ from: uploaderAddress });
    const gasPrice = await web3.eth.getGasPrice();
    const data = contractMethod.encodeABI();

    const tx = {
      from: uploaderAddress,
      to: contract.options.address,
      gas,
      gasPrice,
      data,
    };

    const signedTx = await web3.eth.accounts.signTransaction(
      tx,
      privateKey
    );
    const receipt = await web3.eth.sendSignedTransaction(
      signedTx.rawTransaction
    );
    }
    catch(error){
      req.session.error = error.message
      res.redirect("/livedetails")
    }
  }

  const username = req.session.username;
  await user.findOneAndUpdate(
    { username },
    { $addToSet: { video_tokens: streamKey } },
    { new: true }
  );

  res.redirect('/live')
}

exports.live_get = async(req, res) => {
  const targetUser = await liveStream.findOne({username: req.session.username});


  res.render("live", { user: targetUser, username: req.session.username});
}

exports.stream_error_get = (req,res) => {
  delete req.session.error;
  res.render("stream-error")
}

exports.error_404_get = (req, res) => {
  res.render("error")
};

exports.liveStream_get = async(req,res) => {
  const error = req.session.error;
  delete req.session.error;
  const target_stream = await liveStream.findOne({username: req.params.username})
  let streamExist;
  try {
    const response = await axios.get(target_stream.streamUrl);
    if (response.status == 200) {
      streamExist = true;
    }
  } catch (error) {
    streamExist = false;
    res.redirect("/stream-error");
  }

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

    let profilePicExist;
    try {
      const response = await axios.get(target_user.profilepic_url);
      if (response.status == 200) {
        profilePicExist = true;
      }
    } catch {
      profilePicExist = false;
    }

    res.render("liveStream",
    {streamKey: streamKey,
       target_username: target_stream.username,
       username: req.session.username,
        streamTitle: target_stream.stream_title,
        isPaid: is_paid,
        videoOwned: video_owned,
        target_user,
        error: error,
        profilePicExist,
      }
      )
  }
