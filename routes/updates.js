const express = require('express');
const db = require('../lib/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// List all updates (newest first) — public for logged-in users
router.get('/', requireAuth, (req, res) => {
  try {
    const rows = db.prepare(
      'SELECT id, title, body, created_at FROM updates ORDER BY created_at DESC'
    ).all();
    res.json(rows);
  } catch (err) {
    console.error('List updates error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new update (admin only)
// Optionally clears resolved suggestions (status = added/rejected)
router.post('/', requireAdmin, (req, res) => {
  try {
    const { title, body, clearResolved } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!body || typeof body !== 'string' || !body.trim()) {
      return res.status(400).json({ error: 'Body is required' });
    }

    const result = db.prepare(
      'INSERT INTO updates (title, body) VALUES (?, ?)'
    ).run(title.trim().slice(0, 200), body.trim().slice(0, 10000));

    // Optionally clear resolved suggestions
    if (clearResolved) {
      db.prepare(
        "DELETE FROM suggestions WHERE status IN ('added', 'rejected')"
      ).run();
    }

    res.json({
      id: result.lastInsertRowid,
      title: title.trim().slice(0, 200),
      body: body.trim().slice(0, 10000),
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Create update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete an update (admin only)
router.delete('/:id', requireAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    const result = db.prepare('DELETE FROM updates WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Update not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Delete update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
