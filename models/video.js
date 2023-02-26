const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const shortid = require("shortid");


const videoSchema = new Schema({

  channel_id: {
    type: String,
    required: true
  },
  video_id: {
    type: String,
    required: true,
  },
  video_title: {
    type: String,
    require:true
  },
  video_description: {
    type: String,
    require: true
  },
  video_url: {
    type: String
  }

});


 module.exports = mongoose.model("Video", videoSchema);

