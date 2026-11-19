# Reportlah!

Reportlah is a QodeFest Public Good prototype. It groups duplicate reports about a local problem and drafts one report with the complaint count, dates, and missing evidence.

This repository contains the starting Next.js app and the [project blueprint](BLUEPRINT-reportlah.md). The complaint workflow, Telegram intake, and agency MCP endpoint are in development.

## Live app

- Resident: https://reportlah.m-naim.workers.dev
- Admin: https://reportlah.m-naim.workers.dev/manager

Both pages share one backend, so a complaint sent from the resident page appears on the admin page within three seconds.

The deployed app is in [`web/`](web/): Next.js on Cloudflare Workers, Qwen through an OpenAI-compatible endpoint, one D1 row for state, three.js for the 3D stack. See [`web/README.md`](web/README.md) and [`web/VERSIONS.md`](web/VERSIONS.md).

The [`reportlah/`](reportlah/) directory is the starting app and report engine.

## Run locally

From the reportlah directory, run npm ci and npm run dev. Open http://localhost:3000.
