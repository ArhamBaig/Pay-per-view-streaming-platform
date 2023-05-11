const liveStream = require('../models/liveStream');
const user = require('../models/user');
const video = require('../models/video')
const moment = require("moment");

exports.search_get = async(req,res) => {
    const query = req.query.query;
    const regex = new RegExp(`.*${query}.*`, 'i');
    try {
        const videos = await video.find({ video_title: { $regex: '^' + req.query.query, $options: 'i' } }).limit(10);
        const suggestions = videos.map(video => ({
            type: 'video',
            label: video.video_title,
        }));
        
        const users = await user.find({ username: { $regex: '^' + req.query.query, $options: 'i' } }).limit(10);
        users.forEach((user)=>{
            user.profilepic_url = user.profilepic_url || '/images/profilepic.png';
        })

        const suggested_users = users.map(user => ({
          type: 'user',
          label: user.username,
          profilepic_url: user.profilepic_url
        }));
        
        const suggested_videos = await video.find({ video_title: { $in: suggestions.map(suggestion => suggestion.label) } });
    
        suggested_videos.forEach((video)=>{
            const elapsed = moment(video.createdAt).fromNow();
            video.elapsed = elapsed;
        })

        const suggested_results = [...suggested_videos, ...suggested_users];
        res.render('search', {username: req.session.username,query:query, suggestions:suggestions, suggested_results: suggested_results});
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }    
}

exports.searchjson_get = async (req, res) => {
  const query = req.query.query;
  const regex = new RegExp(`.*${query}.*`, 'i');
  try {
    const videos = await video.find({ video_title: { $regex: '^' + req.query.query, $options: 'i' } }).limit(10);
    const videoSuggestions = videos.map((video) => ({
      type: 'video',
      label: video.video_title,
    }));

    const users = await user.find({ username: { $regex: '^' + req.query.query, $options: 'i' } }).limit(10);
    const userSuggestions = users.map((user) => ({
      type: 'user',
      label: user.username,
      profilepic_url: user.profilepic_url,
    }));

    const suggestions = [...videoSuggestions, ...userSuggestions];
    res.status(200).json(suggestions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};