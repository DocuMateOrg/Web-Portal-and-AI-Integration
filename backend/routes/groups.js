const express = require('express');
const router = express.Router();
const db = require('../db');

// Create a group
router.post('/', async (req, res) => {
  const { name, description } = req.body;
  const r = await db.query('INSERT INTO groups(name,description) VALUES($1,$2) RETURNING *', [name, description]);
  res.json(r.rows[0]);
});

// Create permission
router.post('/permissions', async (req, res) => {
  const { name, description } = req.body;
  const r = await db.query('INSERT INTO permissions(name,description) VALUES($1,$2) RETURNING *', [name, description]);
  res.json(r.rows[0]);
});

// Assign user to group
router.post('/:groupId/users/:userId', async (req, res) => {
  await db.query('INSERT INTO user_groups(user_id, group_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [req.params.userId, req.params.groupId]);
  res.json({ message: 'Assigned' });
});

// Assign permission to group
router.post('/:groupId/permissions/:permId', async (req, res) => {
  await db.query('INSERT INTO group_permissions(group_id, permission_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [req.params.groupId, req.params.permId]);
  res.json({ message: 'Permission assigned' });
});

module.exports = router;
