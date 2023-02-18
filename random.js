const express = require('express');
const mysql = require('mysql2');
const ejs = require('ejs');
const path = require('path');
const bodyparser = require('body-parser');
const { resolve } = require('path');
const { reject } = require('lodash');
const multer = require('multer');
var mime = require('mime-types')
const app = express();
var mime = require('mime');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
const session = require('express-session');

const imageStorage = multer.diskStorage({
    // Destination to store image     
    destination: './images', 
      filename: (req, file, cb) => {
          cb(null, file.fieldname + '_' + Date.now() 
             + path.extname(file.originalname))
            // file.fieldname is name of the field (image)
            // path.extname get the uploaded file extension
    }
});
const imageUpload = multer({
    storage: imageStorage,
    limits: {
      fileSize: 1000000 // 1000000 Bytes = 1 MB
    },
    fileFilter(req, file, cb) {
      if (!file.originalname.match(/\.(png|jpg)$/)) { 
         // upload only png and jpg format
         return cb(new Error('Please upload a Image'))
       }
     cb(undefined, true)
  }
});
const videoStorage = multer.diskStorage({
    destination: './videos', // Destination to store video 
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '_' + Date.now() 
         + path.extname(file.originalname))
    }
});
const videoUpload = multer({
    storage: videoStorage,
    limits: {
    fileSize: 10000000 // 10000000 Bytes = 10 MB
    },
    fileFilter(req, file, cb) {
      // upload only mp4 and mkv format
      if (!file.originalname.match(/\.(mp4|MPEG-4|mkv)$/)) { 
         return cb(new Error('Please upload a video'))
      }
      cb(undefined, true)
   }
}); 

//Configuring express server
app.use(bodyparser.json());
var mysqlConnection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'MahraGiab786!',
    database: 'livemg',
    multipleStatements: true
});

app.use('/img', express.static(path.join(__dirname, 'views/img')));
app.use('/images', express.static(path.join(__dirname, 'views/images')));
app.use('/css', express.static(path.join(__dirname, 'views/css')));
app.use('/js', express.static(path.join(__dirname, 'views/js')));

//for connection in the databasew
mysqlConnection.connect((err) => {
    if (!err)
        console.log('Connection Established Successfully');
    else
        console.log('Connection Failed!' + JSON.stringify(err, undefined, 2));
});
const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Listening on port ${port}..`));


// queries from here on
//video upload
app.post('/uploadVideo', videoUpload.single('video'), (req, res) => {
    res.send(req.file)
 }, (error, req, res, next) => {
     res.status(400).send({ error: error.message })
 })
// For Single image upload
app.post('/uploadImage', imageUpload.single('image'), (req, res) => {
    res.send(req.file)
}, (error, req, res, next) => {
    res.status(400).send({ error: error.message })
}); 
// login page 
app.get('/login', (req, res) =>{
    res.render('login.ejs')
});

            
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    mysqlConnection.query(`SELECT User_id,password FROM login WHERE email = ?`, [email], (err, rows, fields) => {
        if (err) {
            console.log(err);
            res.status(500).json({ message: 'Internal Server Error' });
            return;
        }
        if (rows[0].password === password) {
            // req.session.isLoggedIn = true;
            res.json({ message: 'Login successful' });

          
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    });
});
app.post('/login', (req, res) => {
    const { first_name,last_name,email, password } = req.body;
    const query1 = `INSERT INTO User (first_name, last_name) VALUES (?, ?)`;
    const query2 = `INSERT INTO login (user_id,email, password) VALUES (SELECT(SELECT AUTO_INCREMENT FROM information_schema.TABLES WHERE TABLE_NAME = 'user' AND TABLE_SCHEMA = 'livemg'),?, ?) `;
    mysqlConnection.query(query1, [first_name, last_name], (err, rows, fields) => {
      if (err) {
        console.log(err);
        res.status(500).json({ message: 'Internal Server Error' });
        return;
      }
      res.json({ message: 'Insertion successful' });
    });

    mysqlConnection.query(query2, [email, password], (err, rows, fields) => {
        if (err) {
          console.log(err);
          res.status(500).json({ message: 'Internal Server Error' });
          return;
        }
        res.json({ message: 'Insertion successful' });
      });
  });
// user page
app.get('/users/:id', (req, res) => {

    let id = req.params.id;
    Promise.all([
        //first promise
        new Promise((resolve, reject) => {
            mysqlConnection.query(`SELECT first_name, last_name FROM user WHERE user_id=${id}`, (err, rows, fields) => {
                if (err) reject(err);
                resolve(rows);
            });
        }),
        // promise
        new Promise((resolve, reject) => {
            mysqlConnection.query(`SELECT * FROM content_creator WHERE user_id=${id}`, (err, rows, fields) => {
                if (err)
                    reject(err);
                else
                    if (rows.length > 0) {
                        resolve(rows);
                    }
                    else {
                        resolve("");
                    }
            });
        })
    ])
        .then(([users, credentials]) => {
            res.render('profile.ejs', { users, credentials });
        })
});
app.use(bodyparser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));



// home page 
    app.get('/home', (req, res) => {
        res.render('home.ejs', { title: 'Homepage' });
    });

app.get('/content-creator' , (req, res) => {
    res.render('content-creator.ejs', { title: 'Become a Content Creator' });
    
    // const user_id = req.session.user_id;
    // console.log(user_id);

});

