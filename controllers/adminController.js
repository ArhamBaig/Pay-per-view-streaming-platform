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


exports.adminpanel_get = async(req,res) => {
    const videos = await video.find({})
    const users = await user.find({})
    const livestreams = await liveStream.find({})
    let paidVideosCount = 0;
    let freeVideosCount = 0;

    videos.forEach((video)=>{
       
        if (video.video_status == "paid"){
            paidVideosCount ++
        }
    })
    videos.forEach((video)=>{
        if (video.video_status == "free"){
            freeVideosCount ++
        }
    })

      // Get the date 5 days ago
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      
      
      // Group videos by date
      const groupedVideos = {};
      videos.forEach((video) => {
        const createdAt = new Date(video.createdAt).toDateString();
      
        if (createdAt <= fiveDaysAgo.toDateString()) {
          if (!groupedVideos[createdAt]) {
            groupedVideos[createdAt] = 1;
          } else {
            groupedVideos[createdAt]++;
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
      const groupedUser = {}
      users.forEach((user)=>{
        const createdAt = new Date(user.createdAt).toDateString();
        if (createdAt <= fiveDaysAgo.toDateString()) {
          if (!groupedUser[createdAt]) {
            groupedUser[createdAt] = 1;
          } else {
            groupedUser[createdAt]++;
          }
        }
      })
      

      const userData = [];
      for (let i = 4; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toDateString();
        const count = groupedUser[dateString] || 0;
        userData.push({ date: dateString, count });
      }
      console.log(userData)
      const lastFiveUserCount = userData.reduce((accumulator, currentValue) => {
        return accumulator + currentValue.count;
      }, 0);
      const lastFiveUserData = userData.map((item) => item.count);
      console.log(lastFiveUserData)

    res.render("adminpanel",{paidVideosCount,freeVideosCount,videos,labels,data,usersCount,lastFiveUserCount,livestreamsCount,lastFiveUserData})
}