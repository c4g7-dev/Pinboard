const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const crypto = require('crypto');

const authRoutes = require('./routes/auth');
const suggestionsRoutes = require('./routes/suggestions');
const votesRoutes = require('./routes/votes');
const adminRoutes = require('./routes/admin');
const updatesRoutes = require('./routes/updates');

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers (relaxed CSP for inline styles and external OG images)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "https:", "http:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      upgradeInsecureRequests: null,
    },
  },
}));

// Body parsing
app.use(express.json());

// Session
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: path.join(__dirname) }),
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set true behind HTTPS reverse proxy
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
}));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests, slow down' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests, slow down' },
});

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Static files (production: serve built React app)
const clientDist = path.join(__dirname, 'client', 'dist');
app.use(express.static(clientDist));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/suggestions', suggestionsRoutes);
app.use('/api/suggestions', votesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/updates', updatesRoutes);

// 404 for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// SPA fallback
app.use((req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Pinboard running on http://localhost:${PORT}`);
});
