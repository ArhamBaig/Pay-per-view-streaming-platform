//libraries
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const config = require("config");
const mongodbsession = require('connect-mongodb-session')(session);

//controllers
const userController = require("./controllers/userController");
const videoController = require("./controllers/videoController");
const liveStreamController = require('./controllers/liveStreamController');

//middleware
const uploadMiddleware = require("./middleware/multer");
const isAuth = require("./middleware/isAuth");
const cardMiddleware = require("./middleware/card_info")

//mongodb connection
const connectDB = require("./config/db");
const port = 3000;
const mongoURI = config.get("mongoURI");

const app = express();

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
app.use('/public/images', express.static(path.join(__dirname, 'public/images')));

// Login Page
app.get("/login", userController.login_get);
app.post("/login", userController.login_post);

// Signup Page
app.get("/signup", userController.register_get);
app.post("/signup", userController.register_post);
app.post("/logout", userController.logout_post);

//upload videos to s3
app.get("/upload",isAuth,videoController.video_upload_get);
app.post("/upload",isAuth,uploadMiddleware.single('video'),cardMiddleware,videoController.video_upload_post);

//get videos from s3
// app.get("/video_list",isAuth,videoController.videos_get);
app.get("/play/:video_id",isAuth,videoController.video_play_get);

//live stream through OBS
app.get("/live",isAuth,liveStreamController.live_get);
app.get("/liveStream/:username",isAuth,liveStreamController.liveStream_get);

//user profile
app.get("/profile/:username",videoController.profile_get);
app.get("/home",isAuth,videoController.videos_get);


app.get("/credit",isAuth,userController.card_info_get);
app.post("/credit",isAuth,userController.card_info_post);

// app.get('/test',isAuth,liveStreamController.allStreams_get);
app.listen(port, () => console.log(`Listening on port ${port}..`));

module.exports = app;