# Frontend — Next.js (TypeScript) + Tailwind CSS

This folder contains the frontend application for the RAG app (Next.js + TypeScript + Tailwind).

## Overview

- Purpose: UI for uploading PDFs, browsing/indexing documents, and querying with the RAG chat interface.
- Tech: Next.js (App Router), TypeScript (strict), Tailwind CSS.

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm, yarn, or pnpm
- Backend running and reachable (see `NEXT_PUBLIC_API_URL` env var)

## Environment

Set environment variables in `.env.local` (not committed):

- `NEXT_PUBLIC_API_URL` — Base URL of the backend API (e.g. `http://localhost:3000/api`)

Adjust other env values as needed (auth provider, Cloud config).

## Install

Install dependencies:

```bash
npm install
# or
# yarn
# pnpm install
```

## Development

Run the dev server:

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Build & Start

Build and start production:

```bash
npm run build
npm run start
```

## Lint & Format

Run lint and format (if scripts exist in package.json):

```bash
npm run lint
npm run format
```

## Tests

If there are unit/e2e tests available, run:

```bash
npm test
```

## Docker (optional)

There are Docker artifacts at the repository root. To run the full stack with Docker Compose, prefer the root-level `docker-compose.yml` that includes backend and frontend.

## Manual Quick Test

1. Start the backend (see backend/README.md).
2. Start the frontend: `npm run dev`.
3. Upload a sample PDF through the UI, wait for indexing, then ask a question in the chat UI referencing the uploaded document.

## What’s Done

- Basic developer README for the frontend added.

## Next Steps (suggestions)

- Document required env vars in the repo-level README.
- Add CI checks for lint/build.
- Add more detailed frontend architecture notes and component map.

---

