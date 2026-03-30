const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../lib/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const PIN_RE = /^[0-9]{4}$/;
const SALT_ROUNDS = 10;

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, pin } = req.body;

    if (!username || !USERNAME_RE.test(username)) {
      return res.status(400).json({ error: 'Username must be 3-20 characters (letters, numbers, underscore)' });
    }
    if (!pin || !PIN_RE.test(pin)) {
      return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const pinHash = await bcrypt.hash(pin, SALT_ROUNDS);

    // First user becomes admin
    const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
    const isAdmin = userCount === 0 ? 1 : 0;

    const result = db.prepare(
      'INSERT INTO users (username, pin_hash, is_admin) VALUES (?, ?, ?)'
    ).run(username, pinHash, isAdmin);

    req.session.userId = result.lastInsertRowid;

    res.json({ id: result.lastInsertRowid, username, is_admin: isAdmin });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, pin } = req.body;

    if (!username || !pin) {
      return res.status(400).json({ error: 'Username and PIN required' });
    }

    const user = db.prepare('SELECT id, username, pin_hash, is_admin FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or PIN' });
    }

    const match = await bcrypt.compare(pin, user.pin_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or PIN' });
    }

    req.session.userId = user.id;

    res.json({ id: user.id, username: user.username, is_admin: user.is_admin });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// Current user
router.get('/me', requireAuth, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username, is_admin: req.user.is_admin });
});

module.exports = router;
