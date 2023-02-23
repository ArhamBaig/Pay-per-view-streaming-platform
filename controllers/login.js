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