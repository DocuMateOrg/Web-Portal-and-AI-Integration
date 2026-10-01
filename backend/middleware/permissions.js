const db = require('../db');

// permissionName: string
module.exports = function(permissionName) {
  return async function(req, res, next) {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    // check if any of user's groups has the permission
    const q = `SELECT 1 FROM user_groups ug
               JOIN group_permissions gp ON gp.group_id = ug.group_id
               JOIN permissions p ON p.id = gp.permission_id
               WHERE ug.user_id=$1 AND p.name=$2 LIMIT 1`;
    const r = await db.query(q, [userId, permissionName]);
    if (r.rows.length) return next();
    return res.status(403).json({ error: 'Forbidden' });
  }
}
