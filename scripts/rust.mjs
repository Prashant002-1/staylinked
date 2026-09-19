import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { delimiter, join } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const localCargo = join(root, '.tools/cargo');
const useLocal = existsSync(join(localCargo, 'bin/cargo'));
const env = useLocal
  ? {
      ...process.env,
      CARGO_HOME: localCargo,
      RUSTUP_HOME: join(root, '.tools/rustup'),
      PATH: join(localCargo, 'bin') + delimiter + process.env.PATH,
    }
  : process.env;
const child = spawn(useLocal ? join(localCargo, 'bin/cargo') : 'cargo', process.argv.slice(2), {
  cwd: root,
  env,
  stdio: 'inherit',
});
child.on('error', () => {
  console.error(
    'Rust is required. Install the stable toolchain from https://rustup.rs, then retry.',
  );
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
