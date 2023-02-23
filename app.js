const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const config = require("config");
const mongodbsession = require('connect-mongodb-session')(session);
const loginController = require("./controllers/login");
// const homeController = require("./routes/home");
const isAuth = require("./middleware/isAuth");
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
app.set('view engine', 'ejs');
app.use(express.static('public'));

app.use('/public/stylesheets', express.static(path.join(__dirname, 'public/stylesheets')));
app.use('/public/javascripts', express.static(path.join(__dirname, 'public/javascripts')));

// Login Page
app.get("/login", loginController.login_get);
app.post("/login", loginController.login_post);

// Register Page
app.get("/register", loginController.register_get);
app.post("/register", loginController.register_post);

app.post("/logout", loginController.logout_post);

app.get("/home",isAuth,loginController.home_get);
app.listen(port, () => console.log(`Listening on port ${port}..`));

module.exports = app;