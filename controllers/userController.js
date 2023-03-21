const bcrypt = require("bcryptjs");
const User = require("../models/User");
const shortid = require("shortid");
const dotenv = require('dotenv');

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

  req.session.isAuth = true;
  req.session.username = user.username;
  req.session.user_id = user.user_id;
  {if (!user.channel_name){
    
  }
  req.session.channel_name = user.channel_name;}
  res.redirect("/home");
};

exports.register_get = (req, res) => {
  const error = req.session.error;
  delete req.session.error;
  res.render("signup", { err: error });
};

exports.register_post = async (req, res) => {
  const { username, email, password1, password2} = req.body;
 
  let user = await User.findOne({ email });

  if (user) {
    req.session.error = "User already exists";
    return res.redirect("/signup");
  }

  if (password1 != password2){
    req.session.error = `Passwords do not match`;
    return res.redirect("/signup");
  }

  const hasdPsw = await bcrypt.hash(password1, 12);

  user = new User({
    
    username,
    email,
    password: hasdPsw,
  });

  error = req.session.error;
  await user.save();
  req.session.isAuth = true;
  res.render("login",{err: error});
};

exports.live_get = async(req,res) => {
  const user_target = await User.findOne({username: req.session.username})
  console.log(user_target)  
  if (!user_target.streamKey){
    user_target.streamKey = shortid.generate();
    user_target.save();
  }
  const streamKey = user_target.streamKey;

  res.render("live" ,{streamKey: streamKey})
}

exports.live_video_get = async(req,res) => {
  const user_target = await User.findOne({username: req.params.username})
  const streamKey = user_target.streamKey;

  res.render("live_video" ,{streamKey: streamKey, username: user_target.username})
}

exports.home_get = (req, res) => {
  const username = req.session.username;
  res.render("home", { name: username });
};

exports.logout_post = (req, res) => {
  req.session.destroy((err) => {
    if (err) throw err;
    res.redirect("/login");
  });
};

exports.card_info_get = (req,res)=>{
  res.render('credit')
}

exports.card_info_post = async (req,res)=>{
  try {
    const { name, cardNumber, expDate,  cvc, address } = req.body;
    const customer = await stripe.customers.create({
      name,
      email,
      source: {
        object: 'card',
        number: cardNumber,
        exp_date: expDate,
        cvc: cvc,
        address: address
      }
    })
    const target_user = User.find({username: req.session.username});
    target_user.card_status = customer.id;
    await target_user.save()
    res.status(201).send('Creator added successfully');
  }
 catch (err) {
  console.error(err);
  res.status(500).send('Server error');
}
}
