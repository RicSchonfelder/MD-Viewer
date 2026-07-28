import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const version = process.env.npm_package_version || '1.0.0';
const bundleDir = 'src-tauri/target/release/bundle';
const rootDir = process.cwd();

function getPlatformBundles() {
  const bundles = [];
  const nsisDir = join(rootDir, bundleDir, 'nsis');
  const msiDir = join(rootDir, bundleDir, 'msi');

  if (existsSync(nsisDir)) {
    const files = readdirSync(nsisDir).filter(f => f.endsWith('.exe'));
    files.forEach(f => bundles.push({ platform: 'windows-x86_64', file: join(nsisDir, f) }));
  }
  if (existsSync(msiDir)) {
    const files = readdirSync(msiDir).filter(f => f.endsWith('.msi'));
    files.forEach(f => bundles.push({ platform: 'windows-x86_64', file: join(msiDir, f) }));
  }
  return bundles;
}

function signBundle(filePath) {
  const keyPath = process.env.TAURI_SIGNING_PRIVATE_KEY_PATH || join(process.env.HOME || process.env.USERPROFILE, '.tauri', 'md-viewer.key');
  const password = process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD || 'md-viewer-2026';
  if (!existsSync(keyPath)) {
    console.error('Private key not found at:', keyPath);
    return null;
  }
  try {
    const result = execSync(
      `npx tauri signer sign -k "${keyPath}" -p "${password}" -f "${filePath}"`,
      { cwd: rootDir, encoding: 'utf8' }
    );
    return result.trim();
  } catch (e) {
    console.error('Signing failed:', e.message);
    return null;
  }
}

function generateUpdateJson() {
  const platforms = {};
  const nsisDir = join(rootDir, bundleDir, 'nsis');
  const msiDir = join(rootDir, bundleDir, 'msi');

  if (existsSync(nsisDir)) {
    const files = readdirSync(nsisDir).filter(f => f.endsWith('.exe'));
    files.forEach(f => {
      const fp = join(nsisDir, f);
      const sig = signBundle(fp);
      if (sig) {
        platforms['windows-x86_64'] = {
          signature: sig,
          url: `https://github.com/RicSchonfelder/MD-Viewer/releases/download/v${version}/${f}`,
        };
      }
    });
  }

  const updateJson = {
    version,
    notes: `See https://github.com/RicSchonfelder/MD-Viewer/releases/tag/v${version}`,
    pub_date: new Date().toISOString(),
    platforms,
  };

  const outDir = join(rootDir, 'release-artifacts');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'update.json'), JSON.stringify(updateJson, null, 2));
  console.log('Generated release-artifacts/update.json');
}

const { readdirSync, mkdirSync } = await import('fs');
generateUpdateJson();
