const dotenv = require("dotenv");
const crypto = require("crypto");
const VideoThumbnailGenerator = require("video-thumbnail-generator").default;
const fs = require("fs");
const video = require("../models/video");
const stream = require("../models/liveStream");
const axios = require("axios");
const sharp = require("sharp");
const http = require("http");


const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
// const { Upload } = require("@aws-sdk/lib-storage");
const AWS = require("aws-sdk")
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

const upload_s3 = new AWS.S3({
  region: bucketRegion,
  accessKeyId: accessKey,
  secretAccessKey: secretAccessKey,

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
  const latestVideos = await video.find({}).sort({ createdAt: -1 }).limit(8);
  const allVideos = await video.find({}).sort({ createdAt: -1 });
  const popularVideos = await video.find({}).sort({ views: -1 }).limit(8);
  const videos = latestVideos;
  const remainingVideos = allVideos.slice(8);
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

  for (let video of remainingVideos) {
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
        await stream.save();
      }
    } catch (error) {
      stream.check_stream = false;
      await stream.save();
    }
  }

  let streamExist;
  for (let stream of streams) {
    try {
      const response = await axios.get(stream.streamUrl);
      if (response.status == 200) {
        streamExist = true;
        break;
      }
    } catch (error) {
      streamExist = false;
    }
  }

  res.render("home", {
    videos: videos,
    err: error,
    streams: streams,
    username: req.session.username,
    streamExist: streamExist,
    remainingVideos,
    popularVideos
  });
};

exports.video_play_get = async (req, res) => {
  const error = req.session.error;
  delete req.session.error;
  const video_id = req.params.video_id;
  const self_user = await user.findOne({ username: req.session.username });
  const target_video = await video.findOne({ video_id: video_id });
  const target_user = await user.findOne({ username: target_video.username });

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
  );
  await target_user.save();
  // Increment views by 1
  target_video.views++;
  // Get the current date (without time)
  const today = new Date().toDateString();

  // Increment the daily view count only if the user hasn't viewed the video today
  if (!target_video.dailyViews.get(today)) {
    target_video.dailyViews.set(today, 1);
  } else {
    target_video.dailyViews.set(today, target_video.dailyViews.get(today) + 1);
  }

  await target_video.save();

  await target_video.save();
  console.log(target_video.views)
  let profilePicExist;
  try {
    const response = await axios.get(target_user.profilepic_url);
    if (response.status == 200) {
      profilePicExist = true;
    }
  } catch {
    profilePicExist = false;
  }

  res.render("play", {
    video_url: videoUrl,
    video: target_video,
    is_paid: is_paid,
    videoOwned: videoOwned,
    error: error,
    username: req.session.username,
    target_user,
    profilePicExist,
  });
};

exports.video_stream_get = (req, res) => {
  // Ensure there is a range given for the video
  const range = req.headers.range;
  if (!range) {
    res.status(400).send("Requires Range header");
  }
  const videoUrl = req.params.video_url;
  const videoPath = videoUrl;
  const videoSize = fs.statSync(videoUrl).size;

  // Parse Range
  // Example: "bytes=32324-"
  const CHUNK_SIZE = 10 ** 6; // 1MB
  const start = Number(range.replace(/\D/g, ""));
  const end = Math.min(start + CHUNK_SIZE, videoSize - 1);

  // Create headers
  const contentLength = end - start + 1;
  const headers = {
    "Content-Range": `bytes ${start}-${end}/${videoSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": contentLength,
    "Content-Type": "video/mp4",
  };

  // HTTP Status 206 for Partial Content
  res.writeHead(206, headers);

  // create video read stream for this particular chunk
  const videoStream = fs.createReadStream(videoPath, { start, end });

  // Stream the video chunk to the client
  videoStream.pipe(res);
};

exports.video_upload_get = (req, res) => {
  const error = req.session.error;
  delete req.session.error;

  res.render("upload", { error, username: req.session.username });
};

exports.video_upload_post = async (req, res) => {
  req.io.emit("uploadStarted","x");
  const video_id = randomVideoName();
  const thumbnail_name = `${video_id}`;
  const videoFile = req.file;
  const videoTitle = req.body.title;
  const videoDescription = req.body.description;

  if (!videoFile || !videoTitle || !videoDescription) {
    req.session.error = "Please fill in all the required fields.";
    return res.redirect("/upload");
  }
  if (videoFile.mimetype !== "video/mp4") {
    req.session.error = "Please upload a valid MP4 video file.";
    return res.redirect("/upload");
  }

  let priceInWei;
  let priceInDollars;
  if (req.body.price == null) {
    priceInWei = 0;
    priceInDollars = 0;
  } else {
    const priceInEth = req.body.price / req.body.ethereumValue;
    priceInWei = Math.ceil(priceInEth * 10 ** 18);
    priceInDollars = req.body.price;
  }
  const videoPath = `${video_id}.mp4`;
  if (req.file) {
    fs.writeFileSync(videoPath, req.file.buffer);
  } else {
    // Handle the case when no file is selected
    req.session.error = "No video file selected";
    return res.redirect("/upload");
  }

  const generator = new VideoThumbnailGenerator({
    sourcePath: videoPath,
    thumbnailPath: "./public/temp",
  });

  const thumbnail_gen = await generator.generate({
    numThumbs: 1,
    size: `640x360`,
    timestamps: ["50%"],
    outputPrefix: thumbnail_name,
  });

  const imagePath = `public/temp/${thumbnail_name}-thumbnail-640x360-0001.png`;

  // Compress the thumbnail using sharp
  const compressedImagePath = `public/temp/${thumbnail_name}-thumbnail.png`;
  await sharp(imagePath)
    .png({ quality: 20 }) // Adjust the quality as needed (0-100)
    .toFile(compressedImagePath);

  fs.unlinkSync(videoPath);
  fs.unlinkSync(imagePath);

  const fileContent = fs.readFileSync(compressedImagePath);

  const videoParams = {
    Bucket: bucketName,
    Key: video_id,
    Body: req.file.buffer,
    ContentType: req.file.mimetype,
  };
  const imageParams = {
    Bucket: bucketName,
    Key: `${thumbnail_name}-thumbnail.png`,
    Body: fileContent,
    ContentType: "image/png",
  };

 // Create a managed upload instance
 const videoUpload = new AWS.S3.ManagedUpload({
  params: videoParams,
  service: upload_s3,
});

// Listen to the 'httpUploadProgress' event to track progress
videoUpload.on('httpUploadProgress', (progress) => {
  const uploadedBytes = progress.loaded;
  const totalBytes = progress.total;
  const percentage = Math.round((uploadedBytes / totalBytes) * 100);
  
  // Emit the progress percentage to the client-side
  req.io.emit('uploadProgress', percentage);
  if (percentage == 100){
    req.io.emit('uploadComplete', percentage);
  }
});

  const image_command = new PutObjectCommand(imageParams);
  const video_command = new PutObjectCommand(videoParams);

  const newVideo = new video({
    username: req.session.username,
    video_id: video_id,
    video_title: req.body.title,
    video_description: req.body.description,
    video_status: req.body.status,
    price: priceInWei,
    priceInDollars: priceInDollars,
    thumbnail_name: `${thumbnail_name}-thumbnail.png`,
    createdAt: Date.now(),
  });

  if (req.body.status === "paid") {
    try {
      req.io.emit('paymentStarted', "payment");
      const privateKey = req.body.privatekey;
      const uploaderAddress = req.body.address;

      if (!web3.utils.isAddress(uploaderAddress)) {
        req.session.error = "Invalid wallet credentials";
        return res.redirect(`/upload`);
      }

      if (!/^[0-9a-fA-F]{64}$/.test(privateKey)) {
        req.session.error = "Invalid private key";
        return res.redirect(`/upload`);
      }

      const account = web3.eth.accounts.privateKeyToAccount("0x" + privateKey);
      web3.eth.accounts.wallet.add(account);
      const video_price = Math.ceil(priceInWei * 0.7);
      

      if (account.address.toLowerCase() !== uploaderAddress.toLowerCase()) {
        req.session.error = "Private key does not match the wallet address";
        return res.redirect(`/upload`);
      }
      const contractMethod = contract.methods.addVideoDetail(
        web3.utils.toBN(video_id),
        web3.utils.toBN(video_price)
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

      const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
      const receipt = await web3.eth.sendSignedTransaction(
        signedTx.rawTransaction
      );
      req.io.emit('paymentFinished', "payment");
    } catch (error) {
      req.session.error = error.message;
      return res.redirect("/upload");
    }
  }

  await newVideo.save();
  const username = req.session.username;
  const videoToken = newVideo.video_token;

  await user.findOneAndUpdate(
    { username },
    { $addToSet: { video_tokens: videoToken } },
    { new: true }
  );

  videoUpload.send(async(err, data) => {
    if (err) {
      console.error('Error uploading video:', err);
      return res.redirect('/upload');
    }
  
    await s3.send(image_command);
    await newVideo.save();
  
    // Wait for any other necessary operations
  
    req.session.isAuth = true;
    req.session.video_id = newVideo.video_id;
    fs.unlinkSync(`public/temp/${thumbnail_name}-thumbnail.png`);
    res.redirect("/home")
  });
};

exports.profile_get = async (req, res) => {
  try {
    const error = req.session.error;
    delete req.session.error;
    const username = req.params.username;
    const current_user = await user.findOne({ username: req.session.username });
    const profile_user = await user.findOne({ username: username });
    const current_user_following = current_user?.following || [];

    let profileOwner = false;
    if (req.session.username == req.params.username) {
      profileOwner = true;
    }

    let isFollowed = false;
    if (current_user_following.includes(req.params.username)) {
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
        Key: `${profile_user.user_id}.png`,
      })
    );
    profile_user.save();
    let profilePicExist;
    try {
      const response = await axios.get(profile_user.profilepic_url);
      if (response.status == 200) {
        profilePicExist = true;
      }
    } catch {
      profilePicExist = false;
    }

    const target_user = await user.findOne({ username: username });
    const followersCount = target_user.followers.length;

    res.render("profile", {
      videos: videos,
      target_username: username,
      profileOwner: profileOwner,
      isFollowed: isFollowed,
      followersCount: followersCount,
      profile_pic: profile_user.profilepic_url,
      username: req.session.username,
      target_user: profile_user,
      profilePicExist,
      current_user,
      error: error,
      isAdmin: req.session.isAdmin,
    });
  } catch (error) {
    res.status(404).render("error", {
      errorStatus: "404 - Not Found",
      errorMessage: "Oops, something went wrong!",
    });
  }
};
exports.delete_video = async (req, res) => {
  const username = req.session.username;
  const video_id = req.params.video_id;
  const result = await video.deleteOne({ video_id: video_id });
  console.log(video_id)
  const videoParams = {
    Bucket: bucketName,
    Key: video_id,
  };

  const thumbnailParams = {
    Bucket: bucketName,
    Key: `${video_id}-thumbnail.png`,
  };

  const videoCommand = new DeleteObjectCommand(videoParams);
  const thumbnailCommand = new DeleteObjectCommand(thumbnailParams);
  s3.send(videoCommand);
  s3.send(thumbnailCommand);

  res.redirect(`/admin/manageaccounts`);
};

exports.follow_post = async (req, res) => {
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
  res.redirect(`/profile/${follower}`);
};

exports.unfollow_post = async (req, res) => {
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

  res.redirect(`/profile/${follower}`);
};

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
    const profilePicParams = {
      Bucket: bucketName,
      Key: newFileName,
      ContentType: "image/png",
      Body: imageData,
    };

    const profilePic_command = new PutObjectCommand(profilePicParams);
    await s3.send(profilePic_command);
    res.redirect(`profile/${username}`);
  } catch (error) {
    res.status(500).send("Error uploading profile picture.");
  }
};

exports.following_get = async (req, res) => {
  const username = await user.findOne({ username: req.session.username });

  if (!username.following) {
    res.render("following", {
      username: req.session.username,
      following: [],
      followers_videos: [],
      followers_following: [],
    });
    return;
  }

  const followingArray = [];
  username.following.forEach((follow) => {
    followingArray.push(follow);
  });

  const followers_following = await user.find({
    username: { $in: followingArray },
  });
  const followers_video = await video.find({
    username: { $in: followingArray },
  });

  followers_following.forEach(async (follower) => {
    follower.profilepic_url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: bucketName,
        Key: `${follower.user_id}.png`,
      })
    );
    follower.save();
  });
  followers_following.forEach(async (follower) => {
    try {
      const response = await axios.get(follower.profilepic_url);
      if (response.status == 200) {
        follower.profilepic_exist = true;
        follower.save();
      }
    } catch {
      follower.profilepic_exist = false;
      follower.save();
    }
  });
  res.render("following", {
    username: req.session.username,
    following: followingArray,
    followers_videos: followers_video,
    followers_following: followers_following,
  });
};

exports.freevideo_get = async (req, res) => {
  const videos = await video.find({});
  for (let video of videos) {
    const elapsed = moment(video.createdAt).fromNow();
    video.elapsed = elapsed;
    video.save();
  }
  res.render("freevideos", { username: req.session.username, videos: videos });
};

exports.exclusivevideo_get = async (req, res) => {
  const videos = await video.find({});
  for (let video of videos) {
    const elapsed = moment(video.createdAt).fromNow();
    video.elapsed = elapsed;
    video.save();
  }
  res.render("exclusive", { username: req.session.username, videos: videos });
};

exports.ownedvideo_get = async (req, res) => {
  const cur_user = await user.findOne({ username: req.session.username });
  const videos = await video.find({
    video_token: { $in: cur_user.video_tokens },
  });
  for (let video of videos) {
    const elapsed = moment(video.createdAt).fromNow();
    video.elapsed = elapsed;
    video.save();
  }
  res.render("ownedvideos", { username: req.session.username, videos: videos });
};

const bcrypt = require("bcryptjs");

exports.change_email = async (req, res) => {
  const username = await user.findOne({ username: req.session.username });
  if (username.email == req.body.oldemail) {
    const emailExists = await user.findOne({ email: req.body.newemail });

    if (emailExists) {
      req.session.error =
        "Email already exists. Please choose a different email.";
      return res.redirect(`/profile/${username.username}`);
    }

    const newemail = req.body.newemail;
    username.email = newemail;
    username.save();
    res.redirect(`/profile/${username.username}`);
  } else {
    req.session.error = `incorrect email`;
    res.redirect(`/profile/${username.username}`);
  }
};

exports.change_password = async (req, res) => {
  const username = await user.findOne({ username: req.session.username });
  if (await bcrypt.compare(req.body.oldpassword, username.password)) {
    const newpassword = req.body.newpassword;
    if (newpassword == req.body.confirmnewpassword) {
      username.password = await bcrypt.hash(newpassword, 12);
      username.save();
      res.redirect(`/profile/${username.username}`);
    } else {
      req.session.error = `passwords do not match`;
      res.redirect(`/profile/${username.username}`);
    }
  } else {
    req.session.error = `incorrect password`;
    res.redirect(`/profile/${username.username}`);
  }
};
