const APP_SERVICE_WORKER_PATH = "/app-sw.js";
const STALE_APP_SERVICE_WORKER_PATHS = ["/sw.js"];
const ALL_APP_SERVICE_WORKER_PATHS = [APP_SERVICE_WORKER_PATH, ...STALE_APP_SERVICE_WORKER_PATHS];

const isLovablePreviewHost = (hostname: string) =>
  hostname.startsWith("id-preview--") ||
  hostname.startsWith("preview--") ||
  hostname === "lovableproject.com" ||
  hostname.endsWith(".lovableproject.com") ||
  hostname === "lovableproject-dev.com" ||
  hostname.endsWith(".lovableproject-dev.com") ||
  hostname === "beta.lovable.dev" ||
  hostname.endsWith(".beta.lovable.dev");

const isInIframe = () => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

const isServiceWorkerAtPath = (registration: ServiceWorkerRegistration, paths: string[]) => {
  const workers = [registration.active, registration.installing, registration.waiting];

  return workers.some((worker) => {
    if (!worker?.scriptURL) return false;

    try {
      return paths.includes(new URL(worker.scriptURL).pathname);
    } catch {
      return false;
    }
  });
};

const unregisterAppServiceWorkers = async (paths: string[]) => {
  if (!("serviceWorker" in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((registration) => isServiceWorkerAtPath(registration, paths))
      .map((registration) => registration.unregister()),
  );
};

const shouldRefuseServiceWorker = () => {
  if (!import.meta.env.PROD) return true;
  if (isInIframe()) return true;
  if (isLovablePreviewHost(window.location.hostname)) return true;

  const params = new URLSearchParams(window.location.search);
  return params.get("sw") === "off";
};

export const registerAppServiceWorker = async () => {
  if (!("serviceWorker" in navigator)) return;

  if (shouldRefuseServiceWorker()) {
    await unregisterAppServiceWorkers(ALL_APP_SERVICE_WORKER_PATHS);
    return;
  }

  try {
    await unregisterAppServiceWorkers(STALE_APP_SERVICE_WORKER_PATHS);
    const registration = await navigator.serviceWorker.register(APP_SERVICE_WORKER_PATH, {
      scope: "/",
      updateViaCache: "none",
    });
    await registration.update();
  } catch (error) {
    console.warn("AdaptivePrep service worker registration failed", error);
  }
};