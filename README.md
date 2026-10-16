# The Makers Bazar — Frontend

Next.js storefront and marketplace portals for The Makers Bazar.

## Requirements

- Node.js 22.12 or newer
- Bun 1.3 or newer
- A running Makers Bazar backend with Vendure Shop API, Admin API, and Socket.IO endpoints

## Local setup

```bash
bun install
cp .env.example apps/web/.env.local
bun run dev
```

The frontend runs at `http://localhost:3001` by default.

## Production

Set the values documented in `.env.example`, then run:

```bash
bun install --frozen-lockfile
bun run build
bun run start
```

The backend is intentionally maintained in a separate repository. Do not add API secrets, databases, uploaded private files, or backend source code to this repository.
