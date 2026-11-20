import fs from 'node:fs';
import { execSync } from 'node:child_process';

if (!fs.existsSync('android')) {
  execSync('npx cap add android', { stdio: 'inherit' });
}
