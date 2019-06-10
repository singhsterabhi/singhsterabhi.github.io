/**
 * Welcome to your Workbox-powered service worker!
 *
 * You'll need to register this file in your web app and you should
 * disable HTTP caching for this file too.
 * See https://goo.gl/nhQhGp
 *
 * The rest of the code is auto-generated. Please don't update this file
 * directly; instead, make changes to your Workbox build configuration
 * and re-run your build process.
 * See https://goo.gl/2aRDsh
 */

importScripts("workbox-v3.6.2/workbox-sw.js");
workbox.setConfig({modulePathPrefix: "workbox-v3.6.2"});

workbox.core.setCacheNameDetails({prefix: "gatsby-plugin-offline"});

workbox.skipWaiting();
workbox.clientsClaim();

/**
 * The workboxSW.precacheAndRoute() method efficiently caches and responds to
 * requests for URLs in the manifest.
 * See https://goo.gl/S9QRab
 */
self.__precacheManifest = [
  {
    "url": "webpack-runtime-f20ff4b02b9dfd4b797f.js"
  },
  {
    "url": "app-28f477e2ad28e534d890.js"
  },
  {
    "url": "component---node-modules-gatsby-plugin-offline-app-shell-js-48ea05bf111502e8cc94.js"
  },
  {
    "url": "index.html",
    "revision": "17ac60b63393bb5fd5bfa546c85a21d6"
  },
  {
    "url": "offline-plugin-app-shell-fallback/index.html",
    "revision": "214711f2ec4fed04a5c811d243ed8aba"
  },
  {
    "url": "2.eac03220ef9302b061c7.css"
  },
  {
    "url": "component---src-pages-index-jsx.69a945a11e23dfafac91.css"
  },
  {
    "url": "component---src-pages-index-jsx-e881c6e64332726a68f3.js"
  },
  {
    "url": "1-740e9185b167855eff2b.js"
  },
  {
    "url": "0-e8bad8b4cd735b129e6a.js"
  },
  {
    "url": "3-bcc5a5bb2e43550447e1.js"
  },
  {
    "url": "2-ba6b0d2630c34197f695.js"
  },
  {
    "url": "static/d/329/path---index-6a9-Q9k2YZB3qPa623vwumbhMHS7k.json",
    "revision": "b408706966bb47bef879885b794956de"
  },
  {
    "url": "component---src-pages-404-jsx-1f6de5aad0a93a17b6d9.js"
  },
  {
    "url": "static/d/879/path---404-html-516-62a-CAiy3iEDWURhB934IS7rXlIA.json",
    "revision": "d9863a6bda377e090eda9f4885d86c12"
  },
  {
    "url": "static/d/520/path---offline-plugin-app-shell-fallback-a-30-c5a-NZuapzHg3X9TaN1iIixfv1W23E.json",
    "revision": "c2508676a2f33ea9f1f0bf472997f9a0"
  }
].concat(self.__precacheManifest || []);
workbox.precaching.suppressWarnings();
workbox.precaching.precacheAndRoute(self.__precacheManifest, {});

workbox.routing.registerNavigationRoute("/offline-plugin-app-shell-fallback/index.html", {
  whitelist: [/^[^?]*([^.?]{5}|\.html)(\?.*)?$/],
  blacklist: [/\?(.+&)?no-cache=1$/],
});

workbox.routing.registerRoute(/\.(?:png|jpg|jpeg|webp|svg|gif|tiff|js|woff|woff2|json|css)$/, workbox.strategies.staleWhileRevalidate(), 'GET');
workbox.routing.registerRoute(/^https:/, workbox.strategies.networkFirst(), 'GET');
"use strict";

/* global workbox */
self.addEventListener("message", function (event) {
  var api = event.data.api;

  if (api === "gatsby-runtime-cache") {
    var resources = event.data.resources;
    var cacheName = workbox.core.cacheNames.runtime;
    event.waitUntil(caches.open(cacheName).then(function (cache) {
      return Promise.all(resources.map(function (resource) {
        return cache.add(resource).catch(function (e) {
          // ignore TypeErrors - these are usually due to
          // external resources which don't allow CORS
          if (!(e instanceof TypeError)) throw e;
        });
      }));
    }));
  }
});