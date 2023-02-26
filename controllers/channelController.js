const Channel = require("../models/Channel");


exports.channel_get = (req, res) => {
    const error = req.session.error;
  delete req.session.error;
    res.render("channel",{err:error});
}

exports.channel_post = async (req, res) => {
    const { channel_name } = req.body;
    const user_id = req.session.user_id;

    try {
        // Check if the user has already created a creator name
        const existingChannel = await Channel.findOne({ user_id });

        if (existingChannel) {
            req.session.error = "You have already created a channel";
            return res.redirect("/channel");
        }
        // Check if the creator name already exists in the database
        const existingName = await Channel.findOne({ channel_name });

        if (existingName) {
            req.session.error = "Channel name already exists.";
            return res.redirect("/channel");
        }

        const newChannel = new Channel({
            user_id,
            channel_name,
          });
        await newChannel.save();
        req.session.isAuth = true;
        req.session.channel_id = newChannel.channel_id;
        res.redirect("/home");
        }
        catch (err) {
            req.session.error = err.message;
            res.redirect("/channel");
          }
        };