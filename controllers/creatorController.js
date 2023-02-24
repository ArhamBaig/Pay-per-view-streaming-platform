
const creator = require("../models/Creator");


exports.creator_get = (req,res) => {
    const error = req.session.error;
    delete req.session.error;
    res.render("creator",{err:error});
  }

exports.creator_post = async(req,res)=> {
    const {creator_name} =req.body;
    const user_id = req.session.user_id;

    creator = new creator({
        user_id,
        creator_id,
        creator_name
    })

}