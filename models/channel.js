const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const shortid = require("shortid")

const channelSchema = new Schema({
  user_id: {
    type: String,
    required: true
  },
  channel_id: {
    type: String,
    required: true,
    unique: true,
    default:shortid.generate
  },
  channel_name: {
    type: String,
    required: true,
  }
});

module.exports = mongoose.model("Channel", channelSchema);