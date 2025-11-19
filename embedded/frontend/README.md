# Embedded frontend sample

Minimal Vite + React UI that renders the AtlasMap component inside your own
application shell.

## Setup

```bash
cd embedded/frontend
yarn install
# or npm install / pnpm install
```

The project depends on the local `ui/packages/atlasmap*` workspaces through file
references so you automatically work with your latest sources.

## Run in development mode

```bash
yarn dev
```

The dev server listens on `http://127.0.0.1:5173/` and proxies `/v2/atlas/**`
requests to `http://127.0.0.1:8686`, which matches the backend sample.

Environment variables:

- `VITE_ATLASMAP_BASE_URL` – override the REST base URL when proxying is not
  enough (defaults to the URL above).
- `VITE_ATLASMAP_WORKSPACE` – workspace ID to open (defaults to `standalone`).

## Build for production

```bash
yarn build
yarn preview   # optional smoke test of the static build
```

Serve the generated `dist/` folder with your preferred static server.
