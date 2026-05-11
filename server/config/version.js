import { readFileSync } from 'fs';

function readPackageVersion() {
  try {
    const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
    return packageJson.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export const appVersion = readPackageVersion();
