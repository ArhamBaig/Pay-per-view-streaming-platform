const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const mongodbsession = require('connect-mongodb-session')(session);
const app = express();
const loginRoute = require('./routes/login')
const homeRoute = require('./routes/home')
const uploadRoute = require('./routes/upload')
const port = 3001;
const uri = 'mongodb+srv://arham:K1ik6fEnCmdbltBp@fypcluster.4kxq8ox.mongodb.net/livemg'

mongoose.set('strictQuery',false);

mongoose.connect(uri,{
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then((res)=>{
  console.log('mongoDB is connected');
});


const store = new mongodbsession({
  uri:uri,
  collection:"mySessions"
})

app.use(
  session({
  secret: 'somekey',
  resave: false,
  saveUninitialized: false,
  store: store,
}));

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));

app.use('/public/stylesheets', express.static(path.join(__dirname, 'public/stylesheets')));
app.use('/public/javascripts', express.static(path.join(__dirname, 'public/javascripts')));

app.use('/login',loginRoute.router);
app.use('/home',homeRoute);
app.use('/upload',uploadRoute);

app.get("/",(req,res)=>{
  req.session.isAuth = true;
  console.log(req.session);
  res.send("hello world")
  console.log(req.session.id)
});

app.listen(port, () => console.log(`Listening on port ${port}..`));

module.exports = app;