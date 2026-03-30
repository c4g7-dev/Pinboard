const express = require('express');
const db = require('../lib/db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// List all users (admin only)
router.get('/users', requireAdmin, (req, res) => {
  try {
    const users = db.prepare(
      'SELECT id, username, is_admin, created_at FROM users ORDER BY created_at ASC'
    ).all();
    res.json(users);
  } catch (err) {
    console.error('Admin list users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a user (admin only, cannot delete self)
router.delete('/users/:id', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // CASCADE handles suggestions and votes
    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    res.json({ ok: true });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
