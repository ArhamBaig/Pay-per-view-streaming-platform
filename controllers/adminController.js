const dotenv = require("dotenv");
const crypto = require("crypto");
const VideoThumbnailGenerator = require("video-thumbnail-generator").default;
const fs = require("fs");
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
const liveStream = require("../models/liveStream");
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

exports.adminpanel_get = async (req, res) => {
  const videos = await video.find({});
  const users = await user.find({});
  const livestreams = await liveStream.find({});
  let paidVideosCount = 0;
  let freeVideosCount = 0;

  videos.forEach((video) => {
    if (video.video_status == "paid") {
      paidVideosCount++;
    }
  });
  videos.forEach((video) => {
    if (video.video_status == "free") {
      freeVideosCount++;
    }
  });

 // Get the date 5 days ago
const fiveDaysAgo = new Date();
fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

// Group videos by date
const groupedVideos = {};

videos.forEach((video) => {
  const createdAt = new Date(video.createdAt);

  // Check if the video was created within the last 5 days
  if (createdAt >= fiveDaysAgo) {
    const createdAtDateString = createdAt.toDateString();

    if (!groupedVideos[createdAtDateString]) {
      groupedVideos[createdAtDateString] = 1;
    } else {
      groupedVideos[createdAtDateString]++;
    }
  }
});
  // Create the labels (dates) and data (video counts) for the chart
  const labels = [];
  const data = [];

  for (let i = 4; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateString = `${date.toLocaleString("default", {
      month: "short",
    })} ${date.getDate()}`;
    labels.push(dateString);
    data.push(groupedVideos[date.toDateString()] || 0);
  }

  const usersCount = users.length;
  const livestreamsCount = livestreams.length;
  const groupedUser = {};
  
  users.forEach((user) => {
    const createdAt = new Date(user.createdAt);
  
    // Check if the user was created within the last 5 days
    if (createdAt >= fiveDaysAgo) {
      const createdAtDateString = createdAt.toDateString();
  
      if (!groupedUser[createdAtDateString]) {
        groupedUser[createdAtDateString] = 1;
      } else {
        groupedUser[createdAtDateString]++;
      }
    }
  });
  
  const userData = [];
  for (let i = 4; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
  
    const dateString = date.toDateString();
  
    const count = groupedUser[dateString] || 0;
  
    userData.push({ date: dateString, count });
  }
  
  const lastFiveUserCount = userData.reduce((accumulator, currentValue) => {
    return accumulator + currentValue.count;
  }, 0);
  const lastFiveUserData = userData.map((item) => item.count);
  

  //===========================================================================================

// Get all video views data and calculate the count of views per day
const groupedVideoViews = {};

videos.forEach((video) => {
  video.dailyViews.forEach((views, date) => {
    const createdAtDateString = new Date(date).toDateString();

    if (!groupedVideoViews[createdAtDateString]) {
      groupedVideoViews[createdAtDateString] = views;
    } else {
      groupedVideoViews[createdAtDateString] += views;
    }
  });
});

// Create the data (video views count) for the chart
const videoViewsData = [];

for (let i = 4; i >= 0; i--) {
  const date = new Date();
  date.setDate(date.getDate() - i);
  const dateString = date.toDateString();
  videoViewsData.push(groupedVideoViews[dateString] || 0);
}

console.log(groupedVideoViews)
  //===========================================================================================

  res.render("adminpanel", {
    paidVideosCount,
    freeVideosCount,
    videos,
    labels,
    data,
    usersCount,
    lastFiveUserCount,
    livestreamsCount,
    lastFiveUserData,
    lastFiveUserData,
    videoViewsData,
  });
};

exports.manageaccounts_get = async (req, res) => {
  const accounts = await user.find({ username: { $ne: "admin" } });
  res.render("manageaccounts", {accounts});
};

exports.deleteprofile_post = async (req, res) => {
  const user_id = req.params.user_id;
  const target_user = await user.findOne({ user_id: user_id });

  const result = await user.deleteOne({ user_id: user_id });

  const target_videos = await video.find({ username: target_user.username });
  target_videos.forEach(async (target_video) => {
    const video_id = target_video.video_id;
    await video.deleteOne({ video_id: video_id });

    const videoParams = {
      Bucket: bucketName,
      Key: video_id,
    };

    const thumbnailParams = {
      Bucket: bucketName,
      Key: `${video_id}-thumbnail-.png`,
    };

    const videoCommand = new DeleteObjectCommand(videoParams);
    const thumbnailCommand = new DeleteObjectCommand(thumbnailParams);

    s3.send(videoCommand)
    s3.send(thumbnailCommand)
  });

  res.redirect("/admin/manageaccounts");
};
