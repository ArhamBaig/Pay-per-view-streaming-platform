const dotenv = require("dotenv");
const crypto = require("crypto");
const VideoThumbnailGenerator = require("video-thumbnail-generator").default;
const fs= require("fs");
const video = require("../models/video");
const stream = require("../models/liveStream");
const axios = require("axios");

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const moment = require("moment");
const user = require("../models/user");
dotenv.config();

const randomVideoName = () => crypto.randomBytes(32).toString("hex");

const bucketName = process.env.AWS_BUCKET_NAME;
const bucketRegion = process.env.AWS_BUCKET_REGION;
const accessKey = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;

const bucketName2 = process.env.AWS_TN_BUCKET_NAME;
const bucketRegion2 = process.env.AWS_TN_BUCKET_REGION;
const accessKey2 = process.env.AWS_TN_ACCESS_KEY;
const secretAccessKey2 = process.env.AWS_TN_SECRET_KEY;

const s3 = new S3Client({
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretAccessKey,
  },
  region: bucketRegion,
});

const stream_s3 = new S3Client({
  credentials: {
    accessKeyId: accessKey2,
    secretAccessKey: secretAccessKey2,
  },
  region: bucketRegion2,
});

//smart contracts imports
const Web3 = require("web3");
const contractABI = require("../ContractABI.json");
const contractAddress = "0x22E630bF3199f2765A2F760903cC0F96572815ED";

const web3 = new Web3(
  "https://sepolia.infura.io/v3/464394f410794ec3a8260f2c56823dec"
);

const contract = new web3.eth.Contract(contractABI, contractAddress);

exports.videos_get = async (req, res) => {
  const videos = await video.find({});
  const streams = await stream.find({});
  const error = req.session.error;
  delete req.session.error;

  for (let video of videos) {
    video.video_url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: bucketName,
        Key: video.video_id,
      })
    );

    video.thumbnail_url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: bucketName,
        Key: video.thumbnail_name,
      })
    );

    const elapsed = moment(video.createdAt).fromNow();
    video.elapsed = elapsed;
    video.save();
  }

  for (let stream of streams) {
    stream.streamUrl = await getSignedUrl(
      stream_s3,
      new GetObjectCommand({
        Bucket: bucketName2,
        Key: `${stream.streamKey}_720p.jpg`,
      })
    );
    stream.save();
  }

 
  for (let stream of streams) {
    try {
      const response = await axios.get(stream.streamUrl);
      if (response.status == 200) {
        stream.check_stream = true;
        await stream.save()
      }
    } catch (error) {
      stream.check_stream = false;
      await stream.save()
    }
  }

  let streamExist;
  for (let stream of streams){
    try{
    const response = await axios.get(stream.streamUrl);
    if (response.status == 200) {
      streamExist = true;
      break;
    }
    }catch(error){
      streamExist = false
    }
    } 


  res.render("home", { videos: videos, err: error, streams: streams,username: req.session.username, streamExist: streamExist});
};

exports.video_play_get = async (req, res) => {
  const error = req.session.error;
  delete req.session.error;
  const video_id = req.params.video_id;
  const self_user = await user.findOne({ username: req.session.username });
  const target_video = await video.findOne({ video_id: video_id });
  const target_user = await user.findOne({username: target_video.username});
  
  const user_video_token = self_user?.video_tokens || [];

  let videoOwned = false;
  if (user_video_token.includes(target_video.video_token)) {
    videoOwned = true;
  }

  let is_paid = false;
  if (target_video.video_status === "paid") {
    is_paid = true;
  }

  const videoUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: bucketName,
      Key: target_video.video_id,
    })
  );

  target_user.profilepic_url = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: bucketName,
      Key: `${target_user.user_id}.png`,
    })
  )
  target_user.save()

  res.render("play", {
    video_url: videoUrl,
    video: target_video,
    is_paid: is_paid,
    videoOwned: videoOwned,
    error: error,
    username: req.session.username,
    target_user
  });
};

exports.video_upload_get = (req, res) => {
  const error = req.session.error;
  delete req.session.error;

  res.render("upload", { err: error,username: req.session.username });
};

exports.video_upload_post = async (req, res) => {
  const video_id = randomVideoName();
  const thumbnail_name = `${video_id}`;
  let priceInWei;

  if (req.body.price == null) {
    priceInWei = 0;
  } else {
    const priceInEth = req.body.price / req.body.ethereumValue;
    priceInWei = Math.ceil(priceInEth * 10 ** 18);
  }
  const videoPath = `${video_id}.mp4`;
  fs.writeFileSync(videoPath, req.file.buffer);

  const generator = new VideoThumbnailGenerator({
    sourcePath: videoPath,
    thumbnailPath: "./public/temp",
  });

  const thumbnail_gen = await generator.generate({
    numThumbs: 1,
    size: `1280x720`,
    timestamps: ["50%"],
    outputPrefix: thumbnail_name,
  });

  fs.unlinkSync(videoPath);

  const imagePath = `public/temp/${thumbnail_name}-thumbnail-1280x720-0001.png`;
  const fileContent = fs.readFileSync(imagePath);

  const videoParams = {
    Bucket: bucketName,
    Key: video_id,
    Body: req.file.buffer,
    ContentType: req.file.mimetype,
  };
  const imageParams = {
    Bucket: bucketName,
    Key: `${thumbnail_name}-thumbnail-1280x720-0001.png`,
    Body: fileContent,
    ContentType: "image/png",
  };

  const video_command = new PutObjectCommand(videoParams);
  const image_command = new PutObjectCommand(imageParams);

  const newVideo = new video({
    username: req.session.username,
    video_id: video_id,
    video_title: req.body.title,
    video_description: req.body.description,
    video_status: req.body.status,
    price: priceInWei,
    thumbnail_name: `${thumbnail_name}-thumbnail-1280x720-0001.png`,
    createdAt: Date.now(),
  });

  if (req.body.status === "paid") {
    const account = web3.eth.accounts.privateKeyToAccount(
      "0x" + req.body.privatekey
    );
    web3.eth.accounts.wallet.add(account);
    const video_price = priceInWei;

    const contractMethod = contract.methods.addVideoDetail(
      web3.utils.toBN(video_id),
      video_price
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
      res.send(400).send(`video failed to upload to smart contract`);
    }
  }

  await s3.send(video_command);
  await s3.send(image_command);
  await newVideo.save();
  
  if (req.body.status === "paid") {
    const username = req.session.username;
    const videoToken = newVideo.video_token;
    await user.findOneAndUpdate(
      { username },
      { $addToSet: { video_tokens: videoToken } },
      { new: true }
    );
    }
  req.session.isAuth = true;
  req.session.video_id = newVideo.video_id;
  fs.unlinkSync(`public/temp/${thumbnail_name}-thumbnail-1280x720-0001.png`);
  res.redirect("/home");
};

exports.profile_get = async (req, res) => {
  const username = req.params.username;
  const current_user = await user.findOne({username: req.session.username});
  const profile_user = await user.findOne({username: username});
  const current_user_following = current_user.following;
  
  let profileOwner = false;
  if (req.session.username == req.params.username){
    profileOwner = true;
  }

  let isFollowed = false;
  if (current_user_following.includes(req.params.username)){
    isFollowed = true;
  }
  
  const videos = await video.find({ username: username });
  
  for (let video of videos) {
    video.thumbnail_url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: bucketName,
        Key: video.thumbnail_name,
      })
    );
    const elapsed = moment(video.createdAt).fromNow();
    video.elapsed = elapsed;
  }
  profile_user.profilepic_url = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: bucketName,
      Key: `${profile_user.user_id}.png`
    })
  )
  profile_user.save()
  let profilePicExist;
  try{
  const response = await axios.get(profile_user.profilepic_url);
    if(response.status == 200) {
      profilePicExist = true;
    }
  }
  catch {
    profilePicExist = false;
  }

  const target_user = await user.findOne({ username: username });
  const followersCount = target_user.followers.length;

  res.render("profile", 
  { videos: videos, 
    target_username: username, 
    profileOwner: profileOwner, 
    isFollowed: isFollowed, 
    followersCount:followersCount,
    profile_pic: profile_user.profilepic_url,
    username: req.session.username,
    target_user: profile_user,
    profilePicExist
  });
};

exports.delete_video = async(req,res) =>{
const username = req.session.username
const video_id = req.params.video_id
const result = await video.deleteOne({video_id: video_id });

const videoParams = {
  Bucket: bucketName,
  Key: video_id,
}

const thumbnailParams = {
  Bucket: bucketName,
  Key: `${video_id}-thumbnail-1280x720-0001.png`
}

const videoCommand = new DeleteObjectCommand(videoParams);
const thumbnailCommand = new DeleteObjectCommand(thumbnailParams);
s3.send(videoCommand)
s3.send(thumbnailCommand)

res.redirect(`/profile/${username}`)
}

exports.follow_post = async(req,res) => {
  const follower = req.params.username;
  const username = req.session.username;
  
  await user.findOneAndUpdate(
          { username },
          { $addToSet: { following: follower } },
          { new: true }
        );

  await user.findOneAndUpdate(
          { username: follower },
          { $addToSet: { followers: username } },
          { new: true }
        );
  res.redirect(`/profile/${follower}`)
}

exports.unfollow_post = async(req,res) => {
  const follower = req.params.username;
  const username = req.session.username;
  
  await user.findOneAndUpdate(
          { username },
          { $pull: { following: follower } },
          { new: true }
        );
  
  await user.findOneAndUpdate(
          { username: follower },
          { $pull: { followers: username } },
          { new: true }
        );

  res.redirect(`/profile/${follower}`)
}

exports.upload_profilepic_post = async (req, res) => {
  const username = req.session.username;
  const cur_user = await user.findOne({ username: username });
  try {
    // Rename the uploaded file
    const tempFilePath = req.file.path;
    const newFileName = `${cur_user.user_id}.png`;
    const newFilePath = `${req.file.destination}/${newFileName}`;

    await fs.promises.rename(tempFilePath, newFilePath);

      const imageData = fs.readFileSync(newFilePath);
      console.log(imageData)
      const profilePicParams = {
        Bucket: bucketName,
        Key: newFileName,
        ContentType: "image/png",
        Body: imageData,
      };

      const profilePic_command = new PutObjectCommand(profilePicParams);
      await s3.send(profilePic_command);
      res.redirect(`profile/${username}`);
    ;
  } catch (error) {
    console.log(error);
    res.status(500).send("Error uploading profile picture.");
  }
};

exports.following_get = async(req,res) => {
  const username = await user.findOne({username: req.session.username});
  const followingArray = [];
  username.following.forEach((follow)=>{
    followingArray.push(follow);
  }); 
  


  const followers_following = await user.find({ username: { $in: followingArray } });
  const followers_video = await video.find({username: {$in: followingArray}})

  followers_following.forEach(async(follower)=>{
    follower.profilepic_url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: bucketName,
        Key: `${follower.user_id}.png`
      })
    )
    follower.save()
  })
  
  res.render("following",{username: req.session.username, following: followingArray, followers_videos: followers_video, followers_following:followers_following});
}

exports.freevideo_get = async(req,res)=> {
  const videos = await video.find({})
  res.render("freevideos",{username : req.session.username , videos: videos})
}

exports.exclusivevideo_get = async(req,res)=> {
  const videos = await video.find({})
  res.render("exclusive",{username : req.session.username , videos: videos})
}

exports.ownedvideo_get = async(req,res)=> {
  const cur_user = await user.findOne({username: req.session.username});
  const videos = await video.find({video_token: {$in: cur_user.video_tokens}})
  res.render("ownedvideos",{username : req.session.username , videos: videos})
}