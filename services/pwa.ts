/**
 * Installable-app support (PWA).
 * - registers public/sw.js in production builds so the app shell is cached
 * - lets the UI show an "Install app" button when the browser allows it
 */

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferredPrompt: InstallPromptEvent | null = null;
const listeners = new Set<(canInstall: boolean) => void>();
const notify = () => listeners.forEach((l) => l(Boolean(deferredPrompt)));

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // show our own button instead of the browser's mini-infobar
    deferredPrompt = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

export function registerServiceWorker() {
  if (!import.meta.env.PROD || typeof navigator === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration failed', err);
    });
  });
}

/** Subscribe to "can the app be installed right now?" Returns an unsubscribe function. */
export function onInstallAvailability(cb: (canInstall: boolean) => void) {
  listeners.add(cb);
  cb(Boolean(deferredPrompt));
  return () => {
    listeners.delete(cb);
  };
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  notify();
  return outcome === 'accepted';
}

/** iPhone/iPad Safari has no install prompt; people use Share → Add to Home Screen. */
export const isIosSafari = () =>
  typeof navigator !== 'undefined' &&
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !(window.navigator as any).standalone;
