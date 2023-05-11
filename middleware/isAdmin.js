module.exports = (req, res, next) => {

    if (req.session.isAdmin) {
      next();
    } else {
      req.session.error = "Permission denied";
      res.redirect("/login");
    }
  };