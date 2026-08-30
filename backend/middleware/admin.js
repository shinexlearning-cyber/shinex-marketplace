const adminMiddleware = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.user.is_admin) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    next();
};

module.exports = adminMiddleware;