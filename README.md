# The Makers Bazar — Frontend

Next.js storefront and marketplace portals for The Makers Bazar.

## Requirements

- Node.js 22.12 or newer
- npm 10 or newer
- A running Makers Bazar backend with Vendure Shop API, Admin API, and Socket.IO endpoints

## Local setup

```bash
npm install
cp .env.example apps/web/.env.local
npm run dev
```

The frontend runs at `http://localhost:3001` by default.

## Production

Set the values documented in `.env.example`, then run:

```bash
npm ci
npm run build
npm run start
```

On Hostinger, use Node.js 22, the repository root as the application root, `npm run build` as the build command, and `.next` as the output directory.

The backend is intentionally maintained in a separate repository. Do not add API secrets, databases, uploaded private files, or backend source code to this repository.
