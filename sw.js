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
    "url": "webpack-runtime-7f56fe5f9c9f28f6c464.js"
  },
  {
    "url": "app-28f477e2ad28e534d890.js"
  },
  {
    "url": "component---node-modules-gatsby-plugin-offline-app-shell-js-48ea05bf111502e8cc94.js"
  },
  {
    "url": "index.html",
    "revision": "319db60b3db3b111d6d97470f5ad64a8"
  },
  {
    "url": "offline-plugin-app-shell-fallback/index.html",
    "revision": "9c244fbc646c2d19d073234a115f35eb"
  },
  {
    "url": "2.c5837b3d4c6e0cf10b8b.css"
  },
  {
    "url": "component---src-pages-index-jsx.7412962b6acad369f068.css"
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
    "url": "2-c7b16b0e3b885703a6f3.js"
  },
  {
    "url": "static/d/751/path---index-6a9-CJr7wmFxhoHOmjEBg2m9aPrPSlU.json",
    "revision": "c1814aa842bec54a43cdeb8c900acbbe"
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