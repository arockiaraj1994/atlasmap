# Embedded AtlasMap Starter

This directory now contains a minimal end-to-end setup for running AtlasMap in
embedded mode—your app owns both the runtime engine and the UI.

```
embedded/
├── backend/   # Spring Boot service hosting the AtlasMap REST API
└── frontend/  # Vite + React host that renders the AtlasMap component
```

## Backend runtime (`embedded/backend`)

The backend project is a copy of `mock-embedded` with package names switched to
`io.atlasmap.embedded`. Run it with:

```bash
cd embedded/backend
../../mvnw spring-boot:run
```

This exposes the AtlasMap REST API at `http://127.0.0.1:8686/v2/atlas/` and also
serves a static UI bundle from `target/classes/public/`. Customize the Spring
components under `src/main/java/io/atlasmap/embedded` to hook in your own
security, persistence, or workspace lifecycle.

## Frontend integration (`embedded/frontend`)

The frontend sample is a lightweight React + Vite project that renders the
AtlasMap component directly. Install dependencies and start the dev server:

```bash
cd embedded/frontend
yarn install
yarn dev
```

It proxies `/v2/atlas/**` calls to `http://127.0.0.1:8686`, so when the backend
sample is running the UI immediately works. Take a look at `src/App.tsx` to see
how `AtlasmapProvider` is configured and transplant that pattern into your own
UI shell.

Environment variables:

- `VITE_ATLASMAP_BASE_URL` – override the REST base URL (defaults to
  `http://127.0.0.1:8686/v2/atlas/`).
- `VITE_ATLASMAP_WORKSPACE` – workspace ID string (defaults to `standalone`).

With both samples running you get a fully embedded AtlasMap experience. From
there replace the provided Spring Boot and React shells with your application
code while keeping the configuration pattern intact.
