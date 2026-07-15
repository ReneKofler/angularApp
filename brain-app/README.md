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
```

Production builds include the Angular service worker and web app manifest.
