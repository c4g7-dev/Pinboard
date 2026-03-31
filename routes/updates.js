const express = require('express');
const db = require('../lib/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// List all updates (newest first) with their archived suggestions
router.get('/', requireAuth, (req, res) => {
  try {
    const rows = db.prepare(
      'SELECT id, title, body, downloads, created_at FROM updates ORDER BY created_at DESC'
    ).all();

    // Attach archived suggestions to each update
    const stmtSugg = db.prepare(`
      SELECT s.id, s.mod_name, s.mod_url, s.status, u.username
      FROM suggestions s
      JOIN users u ON u.id = s.user_id
      WHERE s.update_id = ?
      ORDER BY s.status ASC, s.mod_name ASC
    `);
    for (const row of rows) {
      row.suggestions = stmtSugg.all(row.id);
      row.downloads = row.downloads ? JSON.parse(row.downloads) : null;
    }

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
    const { title, body, clearResolved, downloads } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!body || typeof body !== 'string' || !body.trim()) {
      return res.status(400).json({ error: 'Body is required' });
    }

    // Validate downloads object if provided
    let downloadsJson = null;
    if (downloads && typeof downloads === 'object') {
      const clean = {};
      for (const key of ['curseforge', 'modrinth', 'prism']) {
        if (downloads[key] && typeof downloads[key] === 'string') {
          const url = downloads[key].trim();
          if (url) {
            try {
              const parsed = new URL(url);
              if (['http:', 'https:'].includes(parsed.protocol)) {
                clean[key] = url;
              }
            } catch { /* skip invalid URLs */ }
          }
        }
      }
      if (Object.keys(clean).length > 0) downloadsJson = JSON.stringify(clean);
    }

    const result = db.prepare(
      'INSERT INTO updates (title, body, downloads) VALUES (?, ?, ?)'
    ).run(title.trim().slice(0, 200), body.trim().slice(0, 10000), downloadsJson);

    // Optionally archive resolved suggestions to this update
    if (clearResolved) {
      db.prepare(
        "UPDATE suggestions SET update_id = ? WHERE status IN ('added', 'rejected') AND update_id IS NULL"
      ).run(result.lastInsertRowid);
    }

    res.json({
      id: result.lastInsertRowid,
      title: title.trim().slice(0, 200),
      body: body.trim().slice(0, 10000),
      downloads: downloadsJson ? JSON.parse(downloadsJson) : null,
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
