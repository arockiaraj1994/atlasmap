# Embedded backend sample

This folder is a straight-forward copy of the `mock-embedded` Spring Boot
service with package names flipped to `io.atlasmap.embedded`. Use it as the
starting point for running AtlasMap embedded inside your own backend.

## How to run

```bash
cd embedded/backend
../../mvnw spring-boot:run
```

The runtime exposes the AtlasMap REST API at `http://127.0.0.1:8686/v2/atlas/`
and serves the static UI bundle from `target/classes/public`, which is populated
by the Maven `dependency:unpack` goal.

## Customizing

- Edit the classes under `src/main/java/io/atlasmap/embedded` to plug in your
  own security, routing, or workspace logic.
- Update `application.yml` to change the port, CORS settings, or other platform
  options.
- Replace the UI bundle by pointing the dependency plugin to your own build
  artifact (or delete the plugin entirely if you host the UI elsewhere).
