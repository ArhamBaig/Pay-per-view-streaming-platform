const dotenv = require('dotenv');
const crypto = require('crypto');
const VideoThumbnailGenerator = require('video-thumbnail-generator').default;
const fs = require('fs');




const video = require("../models/video")

const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const Ffmpeg = require('fluent-ffmpeg');



dotenv.config();

const randomVideoName = () => crypto.randomBytes(32).toString('hex');

const bucketName = process.env.AWS_BUCKET_NAME;
const bucketRegion = process.env.AWS_BUCKET_REGION;
const accessKey = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;



const s3 = new S3Client({
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretAccessKey
  },
  region: bucketRegion,


});


exports.videos_get = async (req, res) => {
  const videos = await video.find({ channel_name: "arham's channel" });
  const error = req.session.error;
  delete req.session.error;

  for (let video of videos) {

    video.video_url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: bucketName,
        Key: video.video_id
      }),
      { expiresIn: 600 }
    );
  };

  res.render("video_list", { videos: videos, err: error });
};



exports.video_upload_get = (req, res) => {
  const error = req.session.error;
  delete req.session.error;
  res.render("upload", { err: error });
}

exports.video_upload_post = async (req, res) => {
  if (!req.session.channel_name) {
    req.session.error = "You have to create a channel first";
    return res.redirect("/channel");
  };

  const video_id = randomVideoName();
  const thumbnail_name = `${video_id}.png`;

  const videoPath = `${video_id}.mp4`;
  fs.writeFileSync(videoPath, req.file.buffer);

  const generator = new VideoThumbnailGenerator({
    sourcePath: videoPath,
    thumbnailPath: './public/temp',
  });
  try {
    const thumbnail_gen = await generator.generate({
      numThumbs: 1,
      size:`1280x720`,
      timestamps: ['50%'],
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
  const imagePath = `public/temp/01fbc32f6f32a56dd133feabedc80bf16e18b4a8fc5284f441deecc25ddb6b62-thumbnail-1280x720-0001.png`;
  const fileContent = fs.readFileSync(imagePath);
  
  const videoParams = {
    Bucket: bucketName,
    Key: video_id,
    Body: req.file.buffer,
    ContentType: req.file.mimetype
  };
  const imageParams = {
    Bucket: bucketName,
    Key: video_id,
    Body: fileContent,
    ContentType: 'image/png'
  };

  console.log(req.file.buffer);
  const video_command = new PutObjectCommand(videoParams)
  const image_command = new PutObjectCommand(imageParams)

  
  const newVideo = new video({
    channel_name: req.session.channel_name,
    video_id: video_id,
    video_title: req.body.title,
    video_description: req.body.description
  });



  await s3.send(video_command);
  await s3.send(image_command);
  await newVideo.save();

  req.session.isAuth = true;
  req.session.video_id = newVideo.video_id;

  res.redirect("/home")
};