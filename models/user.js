const mongoose = require("mongoose");
const Schema = mongoose.Schema;
// const AutoIncrement = require("mongoose-sequence")(mongoose);
const shortid = require("shortid");



const userSchema = new Schema({
  user_id: {
    type: String,
    default: shortid.generate,
    unique: true
  },
  username: {
    type: String,
    required: true,
    unique:true
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  streamKey: {
    type: String
  },
  card_status: {
    type: Boolean
  }
});


 module.exports = mongoose.model("User", userSchema);

