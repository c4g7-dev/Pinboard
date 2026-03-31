# Pinboard

A minimal, AMOLED-dark mod suggestion board for Minecraft modpacks. Users sign up with a username and 4-digit PIN, suggest mods (with automatic Open Graph link previews), and vote on each other's suggestions. Admins manage the workflow from suggestion to inclusion.

## Features

- **Mod Suggestions** — Users submit mod links with automatic OG preview cards (title, description, thumbnail)
- **Voting** — Upvote/downvote system so the community can prioritize suggestions
- **Status Workflow** — Admins can mark suggestions as Pending, Accepted, Added, or Rejected
- **Update Thread** — Changelog system for posting modpack updates with added/removed mod diffs
- **Suggestion Archiving** — Resolved suggestions (added/rejected) are automatically archived to the related update article instead of being deleted, preserving a full history
- **Download Hub** — Each update can include download links for CurseForge, Modrinth, and Prism Launcher with self-hosted file serving from `public/downloads/`
- **Dashboard Downloads Banner** — The main board shows a prominent "Latest Release" hero card with the modpack version title and platform download buttons
- **Admin Panel** — Manage users, edit/delete suggestions, full control
- **AMOLED Dark Theme** — Pure black background with oklch accent colors and gradient accents
- **CurseForge Support** — Uses cfwidget API to bypass Cloudflare for CurseForge link previews

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
- Edit suggestion text and status
- Set a suggestion's status to **Pending**, **Accepted**, **Added**, or **Rejected**
- Post **Update Articles** at `/updates` — changelog entries showing which mods were added/removed, with platform download links
- **Archive resolved suggestions** to an update — added/rejected suggestions are linked to the article and displayed with usernames under "Resolved Suggestions"
- Access the **Admin** panel (shield icon in the header)

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
