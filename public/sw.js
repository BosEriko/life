const CACHE_NAME = "life-tracker-shell-v2";
const OFFLINE_URL = "/offline.html";
const PRECACHED_AT_KEY = "/__sw/precached-at";
const PRECACHE_INTERVAL = 6 * 60 * 60 * 1000;
const APP_PAGES_URL = "/offline-pages.json";
const RSC_VARIANT_HEADERS = ["next-router-prefetch", "next-router-segment-prefetch"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(precache(true));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "refresh-shell") event.waitUntil(precache(false));
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon") ||
    url.pathname === "/favicon.ico" ||
    url.pathname === "/manifest.json"
  );
}

function isRscRequest(request, url) {
  return request.headers.get("rsc") === "1" || url.searchParams.has("_rsc");
}

function pageKey(url) {
  return new URL(url.pathname, url.origin).toString();
}

function rscKey(request, url) {
  const key = new URL(url.pathname, url.origin);
  key.searchParams.set("__sw", "rsc");
  for (const name of RSC_VARIANT_HEADERS) {
    const value = request.headers.get(name);
    if (value) key.searchParams.set(name, value);
  }
  return key.toString();
}

function assetPaths(html) {
  const matches = html.match(/\/?_next\/static\/[A-Za-z0-9_\-.~%/]+/g) ?? [];
  return [...new Set(matches.map((path) => (path.startsWith("/") ? path : `/${path}`)))].filter(
    (path) => !path.endsWith("/"),
  );
}

async function loadAppPages() {
  try {
    const response = await fetch(APP_PAGES_URL, { cache: "no-cache" });
    const pages = response.ok ? await response.json() : [];
    return Array.isArray(pages) ? pages.filter((page) => typeof page === "string" && page.startsWith("/")) : [];
  } catch {
    return [];
  }
}

async function precache(force) {
  const cache = await caches.open(CACHE_NAME);
  if (!force) {
    const last = await cache.match(PRECACHED_AT_KEY);
    if (last && Date.now() - Number(await last.text()) < PRECACHE_INTERVAL) return;
  }

  const assets = new Set();
  const appPages = await loadAppPages();
  const pages = await Promise.allSettled(
    [OFFLINE_URL, ...appPages].map(async (path) => {
      const response = await fetch(path, { cache: "no-cache" });
      if (!response.ok || response.redirected) throw new Error(`Could not precache ${path}`);
      if (path !== OFFLINE_URL) for (const asset of assetPaths(await response.clone().text())) assets.add(asset);
      await cache.put(path, response);
    }),
  );

  await Promise.allSettled(
    [...assets].map(async (path) => {
      if (await cache.match(path, { ignoreSearch: true })) return;
      const response = await fetch(path);
      if (response.ok) await cache.put(path, response);
    }),
  );

  if (appPages.length > 0 && pages.some((result) => result.status === "fulfilled")) {
    await cache.put(PRECACHED_AT_KEY, new Response(String(Date.now())));
  }
}

async function handleNavigation(request, url) {
  try {
    const response = await fetch(request);
    if (response.ok && !response.redirected) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(pageKey(url), copy));
    }
    return response;
  } catch {
    const cache = await caches.open(CACHE_NAME);
    return (
      (await cache.match(pageKey(url), { ignoreVary: true })) ??
      (await cache.match(OFFLINE_URL)) ??
      Response.error()
    );
  }
}

async function handleRsc(request, url) {
  const key = rscKey(request, url);
  try {
    const response = await fetch(request);
    if (response.ok && !response.redirected) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(key, copy));
    }
    return response;
  } catch (error) {
    const cached = await (await caches.open(CACHE_NAME)).match(key, { ignoreVary: true });
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request, url));
    return;
  }

  if (isRscRequest(request, url)) {
    if (!url.pathname.startsWith("/s/")) event.respondWith(handleRsc(request, url));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      }),
    );
  }
});
