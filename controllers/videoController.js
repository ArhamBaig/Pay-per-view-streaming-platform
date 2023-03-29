const dotenv = require('dotenv');
const crypto = require('crypto');
const VideoThumbnailGenerator = require('video-thumbnail-generator').default;
const fs = require('fs');
const video = require("../models/video");
const stream = require('../models/liveStream');

const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const moment = require('moment');
const user = require('../models/user');
dotenv.config();

const randomVideoName = () => crypto.randomBytes(32).toString('hex');

const bucketName = process.env.AWS_BUCKET_NAME;
const bucketRegion = process.env.AWS_BUCKET_REGION;
const accessKey = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;

const bucketName2 = 'livemg-stream-tn';
const bucketRegion2 = `me-south-1`;
const accessKey2 = `AKIAVIGNE2FG6DLOWETN`;
const secretAccessKey2 = `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`;

const s3 = new S3Client({
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretAccessKey
  },
  region: bucketRegion,
});

const stream_s3 = new S3Client({
  credentials:{
    accessKeyId: accessKey2,
    secretAccessKey: secretAccessKey2
  },
  region: bucketRegion2
})

exports.videos_get = async (req, res) => {
  const videos = await video.find({})
  const streams = await stream.find({})
  console.log(streams)

  const error = req.session.error;
  delete req.session.error;

  for (let video of videos) {
    video.video_url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: bucketName,
        Key: video.video_id
      }),
    );

    video.thumbnail_url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: bucketName,
        Key: video.thumbnail_name
      }),
    );

    

    const elapsed = moment(video.createdAt).fromNow();
    video.elapsed = elapsed;
    video.save();
  };

  for (let stream of streams){
    stream.streamUrl = await getSignedUrl(
      stream_s3,
      new GetObjectCommand({
        Bucket: bucketName2,
        Key: `${stream.streamKey}_720p.jpg`
      })
    )
    stream.save();
  }
  

 

  res.render("home", { videos: videos, err: error, streams: streams });
};

exports.video_play_get = async (req, res) => {
  const videoID = req.params.video_id;
  const video_target = await video.findOne({ video_id: videoID });
  let is_paid = false;

  if (video_target.video_status === "paid") {
    is_paid = true;
  }
  const videoUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({
        Bucket: bucketName,
        Key: video_target.video_id
      })
    )
    res.render('play', { video_url: videoUrl, video: video_target, is_paid: is_paid });
}

exports.video_upload_get = (req, res) => {
  const error = req.session.error;
  delete req.session.error;
  res.render("upload", { err: error });
}

exports.video_upload_post = async (req, res) => {

  const video_id = randomVideoName();
  const thumbnail_name = `${video_id}`;

  const videoPath = `${video_id}.mp4`;
  fs.writeFileSync(videoPath, req.file.buffer);

  const generator = new VideoThumbnailGenerator({
    sourcePath: videoPath,
    thumbnailPath: './public/temp',

  });
  try {
    const thumbnail_gen = await generator.generate({
      numThumbs: 1,
      size: `1280x720`,
      timestamps: ['50%'],
      outputPrefix: thumbnail_name,
    });
    console.log('Thumbnail generated and saved');
    fs.unlinkSync(videoPath);
  } catch (err) {
    // Failed to generate thumbnail
    console.error('Error generating thumbnail:', err);

    // Delete temporary video file
    fs.unlinkSync(videoPath);
  }

  //convert image to buffer
  const imagePath = `public/temp/${thumbnail_name}-thumbnail-1280x720-0001.png`;
  const fileContent = fs.readFileSync(imagePath);

  const videoParams = {
    Bucket: bucketName,
    Key: video_id,
    Body: req.file.buffer,
    ContentType: req.file.mimetype
  };
  const imageParams = {
    Bucket: bucketName,
    Key: `${thumbnail_name}-thumbnail-1280x720-0001.png`,
    Body: fileContent,
    ContentType: 'image/png'
  };

  
  const video_command = new PutObjectCommand(videoParams)
  const image_command = new PutObjectCommand(imageParams)


  const newVideo = new video({
    username: req.session.username,
    video_id: video_id,
    video_title: req.body.title,
    video_description: req.body.description,
    video_status: req.body.status,
    price: req.body.price,
    thumbnail_name: `${thumbnail_name}-thumbnail-1280x720-0001.png`,
    createdAt: Date.now()
  });

  const filter = {username: req.session.username}
  const update = {walletAddress: req.body.address}
  await user.findOneAndUpdate(filter, update, { new: true })

  await s3.send(video_command);
  await s3.send(image_command);
  await newVideo.save();

  req.session.isAuth = true;
  req.session.video_id = newVideo.video_id;
  fs.unlinkSync(`public/temp/${thumbnail_name}-thumbnail-1280x720-0001.png`)
  res.redirect("/home")
};

exports.payment_post = async(req,res) => {
   
}



exports.profile_get = async (req,res) => {
  const username = req.params.username;
  

  const videos = await video.find({username: username});
  if(videos.length === 0){
    // req.session.error('user does not exist')
    res.send(`user does not exist`)
  }
  // const videos = await video.find({username: user_target});
  for (let video of videos) {
    video.thumbnail_url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: bucketName,
        Key: video.thumbnail_name
      }),
    );
    const elapsed = moment(video.createdAt).fromNow();
    video.elapsed = elapsed;
  }
  
  
  res.render('profile', {videos: videos, username:username});
}