# BrainApp

Angular 21 foundation for the BrainApp rebuild tracked by YouTrack epic
`DEMO-44`. This initial slice implements `DEMO-46`: application architecture,
routing, responsive shell, design tokens, typed environments, Supabase client
setup, shared form feedback patterns, and PWA metadata.

## Development

```powershell
npm install
npm start
```

Open <http://localhost:4200>.

## Supabase configuration

Create `../.env` for local development with `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. Deployment platforms must expose those same
two variables to the build command. The generated Angular environment files
are ignored by Git. Only the public project URL and anonymous key enter browser
configuration; never configure a service-role key or another privileged secret.

Authentication behavior will be completed under `DEMO-47`. With no Supabase
configuration, the current foundation remains accessible as a UI preview and
the login screen explains what configuration is missing.

## Verification

```powershell
npm test -- --watch=false
npm run build
```

Production builds include the Angular service worker and web app manifest.

## Production deployment

Vercel uses [`vercel.json`](vercel.json) to build `dist/brain-app/browser`, send
extensionless routes to Angular for refresh-safe SPA navigation, and prevent
stale caching of the manifest and service worker. Hashed static assets receive
immutable caching. Configure these Vercel build variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Do not configure `SUPABASE_SERVICE_ROLE_KEY` or expose it to a browser build.
`npm run verify:production` verifies installable PWA artifacts and rejects
service-role references in JavaScript bundles. When Angular downloads a new
application version, BrainApp displays an update notice that activates it and
reloads the page.

After deployment, smoke-test `/login` and a direct authenticated route such as
`/rankings` in a new browser tab. Both URLs must return the Angular application,
and DevTools → Application must show the manifest and active service worker.

## UX parity reference

The authenticated route inventory, Supabase screen map, responsive visual
references, parity checklist, and known-behavior register are documented in
[`docs/authenticated-ux-parity.md`](docs/authenticated-ux-parity.md).
