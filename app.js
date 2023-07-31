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
const paymentController = require('./controllers/paymentController');
const searchController = require('./controllers/searchController');
const adminController = require('./controllers/adminController');

//middleware
const uploadMiddleware = require("./middleware/multer");
const isAuth = require("./middleware/isAuth");
const metamaskMiddleware = require("./middleware/metamask");
const multerPfpMiddleware = require("./middleware/multer_pfp");
const isAdmin =  require("./middleware/isAdmin");
const http = require('http');

//mongodb connection
const connectDB = require("./config/db");
const port = 3000;
const mongoURI = config.get("mongoURI");

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);

app.use((req, res, next) => {
  req.io = io;
  next();
});

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

io.on('connection', (socket) => {
  console.log('A client connected.');
});


// Login Page
app.get("/login", userController.login_get);
app.post("/login", userController.login_post);

// Signup Page
app.get("/signup", userController.register_get);
app.post("/signup", userController.register_post);
app.post("/logout",isAuth, userController.logout_post);

//upload videos to s3
app.get("/upload",isAuth,videoController.video_upload_get);
app.post("/upload",isAuth,uploadMiddleware.single('video'),videoController.video_upload_post);

//get videos from s3
// app.get("/video_list",isAuth,videoController.videos_get);
app.get("/play/:video_id",isAuth,videoController.video_play_get);
app.get("/video/stream/:video_url",isAuth,videoController.video_stream_get);

//live stream through OBS
app.get("/live",isAuth,liveStreamController.live_get);
app.get("/liveStream/:username",isAuth,liveStreamController.liveStream_get);
app.get("/livedetails",isAuth,liveStreamController.live_details_get);
app.post("/livedetails",isAuth,liveStreamController.live_details_post);

//user profile
app.get("/profile/:username",videoController.profile_get);
app.post("/profile/:video_id",isAuth,videoController.delete_video);
app.post("/follow/:username",isAuth,videoController.follow_post);
app.post("/unfollow/:username",isAuth,videoController.unfollow_post);
app.post("/changeemail/:username",isAuth,videoController.change_email);
app.post("/changepassword/:username",isAuth,videoController.change_password);

//home
app.get("/home",isAuth,videoController.videos_get);
app.get("/search",isAuth,searchController.search_get);
app.get("/searchjson",isAuth,searchController.searchjson_get);

// app.get("/payment",isAuth,paymentController.payment_get);
app.post("/payment/:video_id",isAuth,paymentController.payment_post);
app.post("/streamPayment/:streamKey",isAuth,paymentController.livestream_payment_post);
app.post("/uploadprofilepic",multerPfpMiddleware.single("profile_pic"),isAuth,videoController.upload_profilepic_post);


app.get("/freevideos",isAuth,videoController.freevideo_get);
app.get("/exclusive",isAuth,videoController.exclusivevideo_get);
app.get("/ownedvideos",isAuth,videoController.ownedvideo_get);
app.get("/following",isAuth,videoController.following_get);
// app.get('/test',isAuth,liveStreamController.allStreams_get);

app.get("/admin/adminpanel",isAdmin,isAuth,adminController.adminpanel_get);
app.get("/admin/manageaccounts",isAdmin,isAuth,adminController.manageaccounts_get);
app.post("/account/delete/:user_id",isAdmin,isAuth,adminController.deleteprofile_post);

//errors
app.get("/stream-error",isAuth,liveStreamController.stream_error_get);
app.get("/*",isAuth,liveStreamController.error_404_get);

server.listen(port, () => console.log(`Listening on port ${port}..`));

module.exports = server;
module.exports = app;