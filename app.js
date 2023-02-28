const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const config = require("config");
const mongodbsession = require('connect-mongodb-session')(session);
const userController = require("./controllers/userController");
const uploadMiddleware = require("./middleware/multer");

// const homeController = require("./routes/home");


const isAuth = require("./middleware/isAuth");

const channelController = require("./controllers/channelController");
const videoController = require("./controllers/videoController");
const app = express();

const connectDB = require("./config/db");
const port = 3000;
const mongoURI = config.get("mongoURI");
connectDB();

const store = new mongodbsession({
  uri:mongoURI,
  collection:"mySessions"
});

app.use(
  session({
  secret: 'somekey',
  resave: false,
  saveUninitialized: false,
  store: store,
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());


app.set('view engine', 'ejs');
app.use(express.static('public'));

app.use('/public/stylesheets', express.static(path.join(__dirname, 'public/stylesheets')));
app.use('/public/javascripts', express.static(path.join(__dirname, 'public/javascripts')));

// Login Page
app.get("/login", userController.login_get);
app.post("/login", userController.login_post);

// Register Page
app.get("/register", userController.register_get);
app.post("/register", userController.register_post);

app.post("/logout", userController.logout_post);

app.get("/channel",isAuth,userController.channel_get);
app.post("/channel",isAuth,userController.channel_post);

// app.get("/videos",isAuth,videoController.videos_get);
app.get("/upload",isAuth,videoController.video_upload_get);
app.post("/upload",isAuth,uploadMiddleware.single('video'),videoController.video_upload_post);

app.get("/videos",isAuth,videoController.videos_get);
app.get("/home",isAuth,userController.home_get);
app.listen(port, () => console.log(`Listening on port ${port}..`));

module.exports = app;