const bcrypt = require("bcryptjs");
const User = require("../models/user");
const shortid = require("shortid");
const dotenv = require('dotenv');
const moment = require('moment');

dotenv.config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.home_page = (req,res)=>{
  res.render("home");
}


exports.login_get = (req,res) => {
  const error = req.session.error;
  delete req.session.error;
  res.render("login",{err:error});
}

exports.login_post = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    req.session.error = "Invalid Credentials";
    return res.redirect("/login");
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    req.session.error = "Invalid Credentials";
    return res.redirect("/login");
  }
  if(email == "admin@gmail.com") {
    req.session.isAdmin = true;
    req.session.isAuth = true;
    return res.redirect("/admin/adminpanel");
  }
  
  req.session.isAdmin = false;
  req.session.isAuth = true;
  req.session.username = user.username;
  req.session.user_id = user.user_id;
  
  res.redirect("/home");
};

exports.register_get = (req, res) => {
  const error = req.session.error;
  delete req.session.error;
  res.render("signup", { err: error });
};

exports.register_post = async (req, res) => {
  const { username, email, password1, password2 } = req.body;
 
  let user = await User.findOne({ email });

  if (user) {
    req.session.error = "User already exists";
    return res.redirect("/signup");
  }

  if (password1 != password2){
    req.session.error = `Passwords do not match`;
    return res.redirect("/signup");
  }

  const hashedPsw = await bcrypt.hash(password1, 12);

  user = new User({
    username,
    email,
    password: hashedPsw,
    createdAt: Date.now(),
  });

  error = req.session.error;
  await user.save();
  req.session.isAuth = true;
  res.render("login", { err: error });
};

exports.live_get = async(req,res) => {
  const user_target = await User.findOne({username: req.session.username})
 
  if (!user_target.streamKey){
    user_target.streamKey = shortid.generate();
    user_target.save();
  }
  const streamKey = user_target.streamKey;

  res.render("live" ,{streamKey: streamKey})
}

exports.logout_post = (req, res) => {
  req.session.destroy((err) => {
    if (err) throw err;
    res.redirect("/login");
  });
};


