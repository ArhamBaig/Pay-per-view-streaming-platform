module.exports = (req, res, next) => {
  const videoStatus = req.body.status;
  if (videoStatus === 'paid') {
    const walletAddress = req.body.walletAddress; // Get the wallet address from the request body
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required for paid videos' });
    }
    req.session.walletAddress = walletAddress; // Store the wallet address in the session
  }
  next();
};