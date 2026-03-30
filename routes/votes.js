const express = require('express');
const db = require('../lib/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Vote on a suggestion
router.post('/:id/vote', requireAuth, (req, res) => {
  try {
    const suggestionId = parseInt(req.params.id, 10);
    if (isNaN(suggestionId)) return res.status(400).json({ error: 'Invalid ID' });

    const { value } = req.body;
    if (![1, -1, 0].includes(value)) {
      return res.status(400).json({ error: 'Value must be 1, -1, or 0' });
    }

    const suggestion = db.prepare('SELECT user_id FROM suggestions WHERE id = ?').get(suggestionId);
    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    if (suggestion.user_id === req.user.id) {
      return res.status(403).json({ error: 'Cannot vote on your own suggestion' });
    }

    if (value === 0) {
      db.prepare('DELETE FROM votes WHERE user_id = ? AND suggestion_id = ?')
        .run(req.user.id, suggestionId);
    } else {
      db.prepare(
        `INSERT INTO votes (user_id, suggestion_id, value) VALUES (?, ?, ?)
         ON CONFLICT(user_id, suggestion_id) DO UPDATE SET value = excluded.value`
      ).run(req.user.id, suggestionId, value);
    }

    // Return new score
    const { score } = db.prepare(
      'SELECT COALESCE(SUM(value), 0) AS score FROM votes WHERE suggestion_id = ?'
    ).get(suggestionId);

    res.json({ score, user_vote: value === 0 ? null : value });
  } catch (err) {
    console.error('Vote error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
