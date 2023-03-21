const liveStream = require('../models/liveStream');
const shortid = require('shortid');
const request = require('request');
const Client = require('ssh2').Client;


exports.live_get = async(req, res) => {
  let targetUser;
  
  if (req.session.username) {
    // If the user has already created a streamKey, find it
    targetUser = await liveStream.findOne({username: req.session.username});
    
    if (!targetUser) {
      // If the user is creating streamKey for the first time, create a streamKey
      const newliveStream = new liveStream ({
        username: req.session.username,
        streamKey: shortid.generate(),
      });
      
      await newliveStream.save();
      targetUser = newliveStream;
    }
  } else {
    // If the user is not logged in, redirect them to the login page
    return res.redirect('/login');
  }

  res.render("live", { user: targetUser });
}

exports.liveStream_get = async(req,res) => {
    const user_target = await liveStream.findOne({username: req.params.username})
    const streamKey = user_target.streamKey;
  
    res.render("liveStream" ,{streamKey: streamKey, username: user_target.username})
  }

exports.allStreams_get = async(req,res) =>{
  const conn = new Client();
  conn.on('ready', () => {
    console.log('SSH connection established.');
  
    conn.exec('ls /var/www/', (err, stream) => {
      if (err) throw err;
  
      let data = '';
      stream.on('data', (chunk) => {
        data += chunk;
      });
  
      stream.on('close', (code, signal) => {
        console.log(`Process exited with code ${code} and signal ${signal}.`);
        console.log(`Directories in /var/www/hls: ${data}`);
      });
    });
  });
  
  conn.on('error', (err) => {
    console.error(`Error connecting via SSH: ${err}`);
  });
  
  conn.connect({
    host: '13.234.67.46',
    port: 22,
    username: 'ubuntu',
    privateKey: require('fs').readFileSync(`./my-key.ppk`),
  });


  res.render('test');
}

