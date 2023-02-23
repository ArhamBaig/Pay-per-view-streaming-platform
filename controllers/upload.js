const express = require('express');
const router = express();
const ejs = require('ejs');
const path = require('path');
const fs = require('fs')
const multer = require('multer')

router.set('view engine', 'ejs');
router.use(express.static('./public'));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === "image") {
            if (
                file.mimetype === 'image/png' ||
                file.mimetype === 'image/jpg' ||
                file.mimetype === 'image/jpeg' ||
                file.mimetype === 'image/gif'
            ) { // check file type to be png, jpeg, or jpg
                cb(null, '../uploadedimages');
            } else {
                cb(null, false); // else fails
            }
        }
        else if (file.fieldname === "video") {
            if (
                file.mimetype === 'video/mp4'
            ) { // check file type to be pdf, doc, or docx
                cb(null, '../uploadedvideos');
            } else {
                cb(null, false); // else fails
            }
        }
    },
    filename: (req, file, cb) => {
        let ext = path.extname(file.originalname);
        let name = path.basename(file.originalname, ext);
        let i = 1;
        let newName = `image${i}${ext}`;
        while (fs.existsSync(`../uploadedimages/${newName}`) || fs.existsSync(`../uploadedvideos/${newName}`)) {
            i++;
            newName = `image${i}${ext}`;
        }
        cb(null, newName);
    }

});

const Upload = multer({
    storage: storage,
    limits: {
        fileSize: 10000000 // 1000000 Bytes = 1 MB
    }
}).fields(
    [
        {
            name: 'image',
            maxCount: 1
        },
        {
            name: 'video', maxCount: 1
        }
    ]
);



router.get('', (req, res) => {
    res.render('../views/upload.ejs', { title: 'Upload videos' });

    fs.stat('./uploadedimages/', (err, stats) => {
        if (err) {
            console.log(`No access to directory: ${err}`);
        }
        else {
            console.log(`permissions: ${stats.mode}`);
        }
    });
});

router.post('/uploadvideo', Upload, (req, res) => {

    res.send(req.files);

});

module.exports = router;