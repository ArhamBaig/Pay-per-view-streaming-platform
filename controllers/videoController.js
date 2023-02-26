const multer = require('multer');
const dotenv = require('dotenv');
const crypto = require('crypto');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const video = require("../models/video")

const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");



dotenv.config();

const randomImageName = () => crypto.randomBytes(32).toString('hex');

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
  const videos = await video.find().sort({createdAt: -1});
  
  const error = req.session.error;
  delete req.session.error;

  for (let video of videos){
    video.video_url = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: bucketName,
      Key: video.video_id
    }),
    {expiresIn: 600}
  )
  
};
  res.render("videos", { videos:videos,err: error });
}

exports.video_upload_get = (req,res) => {
  const error = req.session.error;
  delete req.session.error;
  res.render("upload", { err: error });
}

exports.video_upload_post = async (req, res) => {

  video_id = randomImageName();
  const params = {
    Bucket: bucketName,
    Key: video_id,
    Body: req.file.buffer,
    ContentType: req.file.mimetype
  }

  const command = new PutObjectCommand(params)
  await s3.send(command);



  const newVideo = new video({
    channel_id: req.session.channel_id,
    video_id: video_id,
    video_title: req.body.title,
    video_description: req.body.description
  });
  await newVideo.save();
  req.session.isAuth = true;
  req.session.video_id = newVideo.video_id;
  res.redirect("/home")
};