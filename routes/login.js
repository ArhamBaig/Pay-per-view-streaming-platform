const express = require('express');
const router = express();
const path = require('path');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcryptjs')

const loginSchema = new Schema({
  email:{
    type: String,
    required: true,
    unique: true
  },
  password:{
    type: String,
    required: true
  }
});
// middleware for session authentication
const isAuth = (req, res, next)=>{
  if(req.session.isAuth){
    next()
  }
  else{
    res.redirect('/login')
  }
}

router.set('view engine', 'ejs');


router.use(express.static('./public'));
router.get('', (req, res) => {
  res.render('../views/login.ejs')
});

router.post("/login", async (req,res)=>{
  const {email,password} =req.body;
  const user = await loginSchema.findOne({email});

  if(!user){
    req.session.error = "Invalid Credentials";
    return res.redirect("/login")
  }
  const isMatch = await bcrypt.compare(password,user.password);

  if(!isMatch){
    req.session.error = "Invalid Credentials";
    
    return res.redirect("/login")
  }
  
  req.session.isAuth = true;
  req.session.email = user.email;
  res.redirect("/home")


})
router.get("/home",isAuth,(req,res)=>{
  res.render("home")
})
// module.exports = router;
loginModel = mongoose.model("Login",loginSchema);
// module.exports = mongoose.model("Login",loginSchema);

module.exports = {
  router: router,
  loginModel: loginModel
}