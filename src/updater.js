import { openUrl } from '@tauri-apps/plugin-opener';
import i18n from './i18n.js';

const REPO = 'RicSchonfelder/MD-Viewer';
const CURRENT_VERSION = '1.0.0';

async function checkForUpdates(notifyUpToDate = false) {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`);

    if (res.status === 404) {
      return { available: false, message: i18n.t('update.upToDate') };
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const latestTag = data.tag_name.replace(/^v/i, '');
    const current = CURRENT_VERSION;

    const latestParts = latestTag.split('.').map(Number);
    const currentParts = current.split('.').map(Number);

    let available = false;
    for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
      const l = latestParts[i] || 0;
      const c = currentParts[i] || 0;
      if (l > c) { available = true; break; }
      if (l < c) break;
    }

    return {
      available,
      latestVersion: latestTag,
      currentVersion: current,
      htmlUrl: data.html_url,
      message: available
        ? i18n.t('update.available', { version: latestTag, current })
        : i18n.t('update.upToDate'),
    };
  } catch (err) {
    console.error('Update check failed:', err);
    return {
      available: false,
      error: true,
      message: i18n.t('update.checkFailed'),
    };
  }
}

async function installUpdate(url) {
  await openUrl(url);
}

export { checkForUpdates, installUpdate };
