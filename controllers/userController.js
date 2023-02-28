const bcrypt = require("bcryptjs");

const User = require("../models/User");

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
  res.render("register", { err: error });
};

exports.register_post = async (req, res) => {
  const { username, email, password } = req.body;

  let user = await User.findOne({ email });

  if (user) {
    req.session.error = "User already exists";
    return res.redirect("/register");
  }

  const hasdPsw = await bcrypt.hash(password, 12);

  user = new User({
    
    username,
    email,
    password: hasdPsw,
  });


  await user.save();
  req.session.isAuth = true;
  res.redirect("/login");
};

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


exports.channel_get = (req, res) => {
  const error = req.session.error;
  delete req.session.error;
  res.render("channel",{err:error});
};

exports.channel_post = async (req, res) => {
  const { channel_name } = req.body;
  const user_id = req.session.user_id;
  
  try {
    const user = await User.findOne({ user_id });
      console.log(user)

      // Check if the creator name already exists in the database
      const existingName = await User.findOne({ channel_name });

      if (existingName) {
          req.session.error = "Channel name already exists.";
          return res.redirect("/channel");
      }
      console.log(channel_name);
      user.channel_name = channel_name;

      console.log(user);
      await user.save();
      req.session.success = "Channel name saved successfully";
      req.session.isAuth = true;
      req.session.channel_name = user.channel_name;
      res.redirect("/home");
      }
      catch (err) {
          req.session.error = err.message;
          res.redirect("/channel");
        }
      };
// router.use(express.static('./public'));
// router.get('', (req, res) => {
//   res.render('../views/login.ejs')
// });

// router.post("/login", async (req,res)=>{
//   const {email,password} =req.body;
//   const user = await loginSchema.findOne({email});

//   if(!user){
//     req.session.error = "Invalid Credentials";
//     return res.redirect("/login")
//   }
//   const isMatch = await bcrypt.compare(password,user.password);

//   if(!isMatch){
//     req.session.error = "Invalid Credentials";

//     return res.redirect("/login")
//   }
  
//   req.session.isAuth = true;
//   req.session.email = user.email;
//   res.redirect("/home")


// })
// router.get("/home",isAuth,(req,res)=>{
//   res.render("home")
// });

// router.get()

// loginModel = mongoose.model("Login",loginSchema);

// module.exports = {
//   router: router,
//   loginModel: loginModel
// }