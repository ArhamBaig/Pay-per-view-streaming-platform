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
  }
});



 module.exports = mongoose.model("Video", videoSchema);

