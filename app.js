const express = require('express');
// const session = require('express-session');
const bodyParser = require('body-parser');
const mime = require('mime-types');
const path = require('path');
const mysql = require('mysql')
const app = express();
const loginRoute = require('./routes/login')
const homeRoute = require('./routes/home')
const uploadRoute = require('./routes/upload')
const port = 3000;

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));


app.use('./public/stylesheets', express.static(path.join(__dirname, 'public/stylesheets')));
// app.use('/css', express.static(path.join(__dirname, 'views/css')));

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '12345678',
  database: 'livemg'
});

app.use('/login',loginRoute);
app.use('/home',homeRoute);
app.use('/upload',uploadRoute);


app.listen(port, () => console.log(`Listening on port ${port}..`));