const adminMiddleware = (req, res, next) => {
  // Check if user exists and is admin
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (!req.user.is_admin) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Administrator privileges required.'
    });
  }

  next();
};

module.exports = adminMiddleware;
