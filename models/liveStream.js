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
  }
});


 module.exports = mongoose.model("liveStream", streamSchema);

