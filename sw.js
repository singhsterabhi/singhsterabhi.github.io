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
    "url": "webpack-runtime-eea103626686d88fd903.js"
  },
  {
    "url": "app-28f477e2ad28e534d890.js"
  },
  {
    "url": "component---node-modules-gatsby-plugin-offline-app-shell-js-48ea05bf111502e8cc94.js"
  },
  {
    "url": "index.html",
    "revision": "7ec9ed2481df467349e5327331f45ead"
  },
  {
    "url": "offline-plugin-app-shell-fallback/index.html",
    "revision": "8c316f1b4c078c228acdf007c8dec070"
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
    "url": "2-941b5d66829f7218f671.js"
  },
  {
    "url": "static/d/298/path---index-6a9-CNsXg7wE18xNsMbDImJjb2mD1E.json",
    "revision": "680ee9e073014c0cff0f85b7db717489"
  },
  {
    "url": "component---src-pages-404-jsx-1f6de5aad0a93a17b6d9.js"
  },
  {
    "url": "static/d/808/path---404-html-516-62a-aC5w3JzQGIH6nQf7jXl3ofoEfw.json",
    "revision": "9706eb9640d3930d2cc3e2838e5c0fa0"
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