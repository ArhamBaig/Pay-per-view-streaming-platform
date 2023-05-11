const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const streamSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique:true
  },

  streamKey: {
    type: String
  },
  streamUrl: {
    type: String
  },
  stream_title: {
    type: String
  },
  stream_status: {
    type: String,
    enum: ['paid','free'],
    require: true
  }, 
  stream_price: {
    type: Number, 
    default: 0 
  },
  check_stream: {
    type: Boolean,
  },
  priceInDollars: {
    type: Number,
    default: 0
  }
});


 module.exports = mongoose.model("liveStream", streamSchema);

