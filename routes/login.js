const express = require('express');
const router = express();
const ejs = require('ejs');
const path = require('path');

router.set('view engine', 'ejs');


router.use(express.static('./public'));
router.get('', (req, res) => {
  res.render('../views/login.ejs')
});


module.exports = router;