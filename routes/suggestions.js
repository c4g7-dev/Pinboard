const express = require('express');
const db = require('../lib/db');
const { requireAuth } = require('../middleware/auth');
const { fetchOG } = require('../lib/og');

const router = express.Router();

// List suggestions
router.get('/', (req, res) => {
  try {
    const sort = req.query.sort === 'newest' ? 'newest' : 'score';
    const userId = req.session?.userId || null;

    const orderBy = sort === 'newest'
      ? 's.created_at DESC'
      : 'score DESC, s.created_at DESC';

    const rows = db.prepare(`
      SELECT
        s.id,
        s.mod_name,
        s.mod_url,
        s.og_title,
        s.og_desc,
        s.og_image,
        s.status,
        s.created_at,
        u.username,
        s.user_id,
        COALESCE(SUM(v.value), 0) AS score
      FROM suggestions s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN votes v ON v.suggestion_id = s.id
      WHERE s.update_id IS NULL
      GROUP BY s.id
      ORDER BY ${orderBy}
    `).all();

    // Attach current user's vote if logged in
    if (userId) {
      const userVotes = db.prepare(
        'SELECT suggestion_id, value FROM votes WHERE user_id = ?'
      ).all(userId);
      const voteMap = new Map(userVotes.map(v => [v.suggestion_id, v.value]));
      for (const row of rows) {
        row.user_vote = voteMap.get(row.id) || null;
      }
    } else {
      for (const row of rows) {
        row.user_vote = null;
      }
    }

    res.json(rows);
  } catch (err) {
    console.error('List suggestions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create suggestion
router.post('/', requireAuth, async (req, res) => {
  try {
    let { mod_name, mod_url } = req.body;

    if (!mod_name || typeof mod_name !== 'string') {
      return res.status(400).json({ error: 'Mod name is required' });
    }

    mod_name = mod_name.trim().slice(0, 100);

    if (!mod_name) {
      return res.status(400).json({ error: 'Mod name is required' });
    }

    // Validate URL if provided
    let og = { og_title: null, og_desc: null, og_image: null };
    if (mod_url && typeof mod_url === 'string') {
      mod_url = mod_url.trim();
      try {
        const parsed = new URL(mod_url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return res.status(400).json({ error: 'URL must be http or https' });
        }
      } catch {
        return res.status(400).json({ error: 'Invalid URL' });
      }
      og = await fetchOG(mod_url);
    } else {
      mod_url = null;
    }

    const result = db.prepare(
      `INSERT INTO suggestions (user_id, mod_name, mod_url, og_title, og_desc, og_image)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(req.user.id, mod_name, mod_url, og.og_title, og.og_desc, og.og_image);

    res.json({
      id: result.lastInsertRowid,
      mod_name,
      mod_url,
      og_title: og.og_title,
      og_desc: og.og_desc,
      og_image: og.og_image,
      username: req.user.username,
      user_id: req.user.id,
      status: 'pending',
      score: 0,
      user_vote: null,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Create suggestion error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete suggestion
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    const suggestion = db.prepare('SELECT user_id FROM suggestions WHERE id = ?').get(id);
    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    if (suggestion.user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    db.prepare('DELETE FROM suggestions WHERE id = ?').run(id);

    res.json({ ok: true });
  } catch (err) {
    console.error('Delete suggestion error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update suggestion status (admin only)
router.patch('/:id/status', requireAuth, (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    const { status } = req.body;
    if (!['pending', 'accepted', 'added', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const suggestion = db.prepare('SELECT id FROM suggestions WHERE id = ?').get(id);
    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    db.prepare('UPDATE suggestions SET status = ? WHERE id = ?').run(status, id);

    res.json({ id, status });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Edit suggestion (admin only)
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    const existing = db.prepare('SELECT * FROM suggestions WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    let { mod_name, mod_url } = req.body;

    if (mod_name !== undefined) {
      if (typeof mod_name !== 'string' || !mod_name.trim()) {
        return res.status(400).json({ error: 'Mod name cannot be empty' });
      }
      mod_name = mod_name.trim().slice(0, 100);
    } else {
      mod_name = existing.mod_name;
    }

    // Handle URL: fetch OG data if URL changed
    let og_title = existing.og_title;
    let og_desc = existing.og_desc;
    let og_image = existing.og_image;

    if (mod_url !== undefined) {
      if (mod_url && typeof mod_url === 'string') {
        mod_url = mod_url.trim();
        try {
          const parsed = new URL(mod_url);
          if (!['http:', 'https:'].includes(parsed.protocol)) {
            return res.status(400).json({ error: 'URL must be http or https' });
          }
        } catch {
          return res.status(400).json({ error: 'Invalid URL' });
        }
        // Only re-fetch OG if URL actually changed
        if (mod_url !== existing.mod_url) {
          const og = await fetchOG(mod_url);
          og_title = og.og_title;
          og_desc = og.og_desc;
          og_image = og.og_image;
        }
      } else {
        mod_url = null;
        og_title = null;
        og_desc = null;
        og_image = null;
      }
    } else {
      mod_url = existing.mod_url;
    }

    db.prepare(
      'UPDATE suggestions SET mod_name = ?, mod_url = ?, og_title = ?, og_desc = ?, og_image = ? WHERE id = ?'
    ).run(mod_name, mod_url, og_title, og_desc, og_image, id);

    res.json({ id, mod_name, mod_url, og_title, og_desc, og_image });
  } catch (err) {
    console.error('Edit suggestion error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
