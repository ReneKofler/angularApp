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

Set `supabaseUrl` and `supabaseAnonKey` in the environment files under
`src/environments`. Only the public project URL and anonymous key may be added
to browser configuration. Never add a service-role key or another privileged
secret.

Authentication is implemented under `DEMO-47`: email/password sign-in, persisted
session restoration, protected and guest-only routes, safe return URLs, token
expiry handling, and logout. Public signup is intentionally not exposed. With no
Supabase configuration, protected routes redirect to login and the screen
explains what configuration is missing.

## Verification

```powershell
npm test -- --watch=false
npm run build
npm run e2e
```

Playwright runs desktop and mobile Chrome projects. Local runs use installed
Chrome; CI installs pinned Playwright Chromium. For authenticated local tests,
copy `.env.e2e.example` to `.env.e2e` and provide a dedicated test account:

```text
E2E_EMAIL=test-account@example.com
E2E_PASSWORD=test-account-password
```

The ignored `.env.e2e` file is loaded on Windows and Linux. Optional
`E2E_SUPABASE_URL` and `E2E_SUPABASE_ANON_KEY` values can override the local
Angular configuration. CI environment variables take precedence. Without test
credentials, public, routing, responsive, accessibility, and theme tests still
run while authentication is skipped. Authenticated coverage restores sessions,
persists and restores the test account's theme setting, and verifies logout.
Use `npm run e2e:ui` or `npm run e2e:debug` for investigation.

Production builds include the Angular service worker and web app manifest.
