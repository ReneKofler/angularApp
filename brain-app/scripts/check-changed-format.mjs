import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

let base = 'HEAD~1';
try {
  git('rev-parse', '--verify', 'origin/main');
  base = git('merge-base', 'HEAD', 'origin/main');
} catch {
  // A shallow/local checkout can still validate its most recent change.
}

const supported = /\.(?:css|html|js|json|md|mjs|scss|ts|ya?ml)$/;
const files = git('diff', '--name-only', '--diff-filter=ACMR', base, '--', '.')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((file) => file.replace(/^brain-app\//, ''))
  .filter((file) => supported.test(file));

if (!files.length) {
  console.log('No changed source files require formatting checks.');
  process.exit(0);
}

const prettier = fileURLToPath(
  new URL('../node_modules/prettier/bin/prettier.cjs', import.meta.url),
);
execFileSync(process.execPath, [prettier, '--check', ...files], { stdio: 'inherit' });
