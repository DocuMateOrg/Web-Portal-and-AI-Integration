// Simple auth middleware: expects X-User-Id header
module.exports = function(req, res, next) {
  const userId = req.header('X-User-Id');
  if (!userId) return res.status(401).json({ error: 'Missing X-User-Id' });
  req.user = { id: Number(userId) };
  next();
};
