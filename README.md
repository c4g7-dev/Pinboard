# Pinboard

A minimal, AMOLED-dark mod suggestion board. Users sign up with a username and 4-digit PIN, suggest mods (with automatic Open Graph link previews), and vote on each other's suggestions. Admins can mark suggestions as **Accepted** or **Added**.

## Tech Stack

- **Backend:** Node.js, Express 5, SQLite (better-sqlite3)
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4
- **Auth:** Username + 4-digit PIN, bcrypt-hashed, server-side sessions

## Quick Start

```bash
# Install backend dependencies
npm install

# Install frontend dependencies and build
cd client && npm install && npm run build && cd ..

# Start the server
node server.js
```

The app runs on `http://localhost:3000` by default. Set the `PORT` environment variable to change it.

## Admin Access

**The first user to register automatically becomes the admin.** There is no separate admin setup — just open the app, register an account, and you're the admin.

As an admin you can:

- Delete any suggestion or user
- Access the **Admin** panel (shield icon in the header)
- Set a suggestion's status to **Accepted** (green checkmark) or **Added** (green package icon) using the dropdown on each suggestion card

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `SESSION_SECRET` | Random per-start | Session signing secret (set a fixed value in production) |

## Deploy to a Server

```bash
# On the server: install Node.js 22+, then:
mkdir -p /opt/pinboard
# Copy project files (excluding node_modules, *.db, .git)
rsync -avz --exclude node_modules --exclude '*.db' --exclude .git . user@server:/opt/pinboard/
ssh user@server "cd /opt/pinboard && npm install --production"
```

Create a systemd service (`/etc/systemd/system/pinboard.service`):

```ini
[Unit]
Description=Pinboard
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/pinboard
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=80
Environment=SESSION_SECRET=your-secret-here

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable --now pinboard
```

## License

MIT
