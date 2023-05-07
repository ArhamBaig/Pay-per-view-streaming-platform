const multer = require('multer');

// Initialize multer middleware
const upload = multer({dest: './public/temp'});
module.exports = upload;

