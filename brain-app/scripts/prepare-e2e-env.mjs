import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const localUrl = new URL('../src/environments/environment.local.ts', import.meta.url);
const exampleUrl = new URL('../src/environments/environment.local.example.ts', import.meta.url);

if (!existsSync(fileURLToPath(localUrl))) {
  let source = readFileSync(exampleUrl, 'utf8');
  if (process.env['E2E_SUPABASE_URL']) {
    source = source.replace(
      "supabaseUrl: ''",
      `supabaseUrl: ${JSON.stringify(process.env['E2E_SUPABASE_URL'])}`,
    );
  }
  if (process.env['E2E_SUPABASE_ANON_KEY']) {
    source = source.replace(
      "supabaseAnonKey: ''",
      `supabaseAnonKey: ${JSON.stringify(process.env['E2E_SUPABASE_ANON_KEY'])}`,
    );
  }
  writeFileSync(localUrl, source, { mode: 0o600 });
  console.log('Created ignored E2E environment configuration.');
}
