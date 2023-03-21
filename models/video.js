const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const shortid = require("shortid");


const videoSchema = new Schema({

  video_id: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    require: true
  },

  video_title: {
    type: String,
    require:true
  },
  video_description: {
    type: String,
    require: true
  },
  thumbnail_name: {
    type: String,
    require: true
  },
  video_status: {
    type: String,
    enum: ['paid','free'],
    require: true
  }, 
  price:{ 
  type: Number, 
  default: 0 
  },
  video_url: {
    type: String,
    require:true
  },
  thumbnail_url: {
    type:String,
    require: true
  },
  createdAt: {
    type: Date,
  },
  video_token: {
    type:String
  }
});

videoSchema.pre('save', function(next) {
  if (this.video_status === 'paid' && !this.video_token) {
    // Generate video token using shortid
    this.video_token = shortid.generate();
  }
  next();
});

 module.exports = mongoose.model("Video", videoSchema);

