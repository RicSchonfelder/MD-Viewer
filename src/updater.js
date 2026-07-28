import { invoke } from '@tauri-apps/api/core';
import { confirm, message } from '@tauri-apps/plugin-dialog';
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
      latestUrl: data.html_url,
      assets: data.assets,
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

async function installUpdate(result) {
  const assets = result.assets || [];
  const nsisAsset = assets.find(a =>
    a.name.endsWith('-setup.exe') || a.name.endsWith('x64-setup.exe')
  );

  if (nsisAsset) {
    const downloadUrl = nsisAsset.browser_download_url;

    const shouldUpdate = await confirm(
      i18n.t('update.available', { version: result.latestVersion, current: result.currentVersion }),
      {
        title: i18n.t('update.title'),
        kind: 'info',
        okLabel: i18n.t('update.update'),
        cancelLabel: i18n.t('update.later'),
      }
    );

    if (!shouldUpdate) return;

    try {
      await invoke('download_and_install', { url: downloadUrl });
      await message(i18n.t('update.installed'), { title: 'MD Viewer', kind: 'info' });
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().close();
    } catch (err) {
      console.error('Auto-update failed:', err);
      await message(i18n.t('update.downloadFailed') + '\n' + err, {
        title: 'MD Viewer', kind: 'error',
      });
    }
  } else {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(result.latestUrl);
  }
}

export { checkForUpdates, installUpdate };