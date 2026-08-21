# Invisi Fight

Invisi Fight is a desktop-first browser multiplayer game about hidden movement, private sonar detections, and committed shots. The static Phaser client is designed for GitHub Pages, while an authoritative Colyseus server owns every gameplay decision.

## Requirements

- Node.js 20 or newer (CI and deployment use Node 22)
- pnpm 11.19.0
- Current Chromium, Firefox, or Safari desktop browser

## Local setup

```powershell
pnpm.cmd install
Copy-Item client/.env.example client/.env.local
Copy-Item server/.env.example server/.env.local
pnpm.cmd dev
```

The client runs at `http://127.0.0.1:4173`; the server and health check run at `http://127.0.0.1:2567` and `/healthz`.

## Commands

```powershell
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd build
pnpm.cmd test:e2e
```

## Packages

- `client/` — Vite + Phaser browser client and DOM HUD.
- `server/` — Node + Colyseus authoritative multiplayer service.
- `shared/` — gameplay constants, validation schemas, and network contracts.
- `build-plan-artifacts/` — the supplied build specification and task index.

## Deployment

GitHub Pages publishes `client/dist` under `/Invisi_Fight/` after CI succeeds on `main`. Set Pages to **GitHub Actions** in the repository settings before the first deployment.

The production client defaults to `https://invisi-fight-server.onrender.com` and its secure WebSocket equivalent. If the Render service is given another URL, set the repository variables `VITE_SERVER_HTTP_URL` and `VITE_SERVER_WS_URL` before rebuilding the client.

[Deploy the authoritative server to Render](https://render.com/deploy?repo=https://github.com/aim4n-mohd/Invisi_Fight) using the included `render.yaml` blueprint. It builds the shared and server packages, serves the Colyseus transport, and exposes `/healthz`.

No account, database, analytics, ads, or payment service is used. Anonymous room session tokens are held in `sessionStorage` and never embedded in URLs.
