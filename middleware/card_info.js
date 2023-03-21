module.exports = (req, res, next) => {
    // Check if video is paid
    if (req.body.status === 'paid') {
      // Check if user has card on file
      if (req.user.card_status) {
        // User has card on file, proceed to next middleware
        return next();
      } else {
        // User does not have card on file, redirect to credit page
        return res.redirect('/credit');
      }
    } else {
      // Video is free, proceed to next middleware
      return next();
    }
  };
  