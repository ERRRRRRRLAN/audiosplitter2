/*! coi-serviceworker v0.1.7 - Guido Zuidhof, licensed under MIT */
let coepCredentialless = false;
if (typeof window === 'undefined') {
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

  self.addEventListener("message", (ev) => {
    if (!ev.data) {
      return;
    } else if (ev.data.type === "deregister") {
      self.registration.unregister();
    } else if (ev.data.type === "coepCredentialless") {
      coepCredentialless = ev.data.value;
    }
  });

  self.addEventListener("fetch", function (event) {
    if (event.request.cache === "only-if-cached" && event.request.mode !== "same-origin") {
      return;
    }

    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 0) {
            return response;
          }

          const newHeaders = new Headers(response.headers);
          newHeaders.set("Cross-Origin-Embedder-Policy", coepCredentialless ? "credentialless" : "require-corp");
          if (!coepCredentialless) {
            newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
          }

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        })
        .catch((e) => console.error(e))
    );
  });
} else {
  (() => {
    const reloadedBySelf = window.sessionStorage.getItem("coiReloadedBySelf");
    window.sessionStorage.removeItem("coiReloadedBySelf");
    const coepDegrading = (window.sessionStorage.getItem("coiCoepDegrading") === "true");
    window.sessionStorage.removeItem("coiCoepDegrading");

    const coepCredentialless = (window.sessionStorage.getItem("coiCoepCredentialless") === "true");
    window.sessionStorage.removeItem("coiCoepCredentialless");

    if (reloadedBySelf) {
      console.log("coi-serviceworker: Reloaded by self.");
      return;
    }

    if (window.crossOriginIsolated) {
        console.log("coi-serviceworker: Cross Origin Isolated.");
        return;
    }

    console.log("coi-serviceworker: Registering Service Worker.");
    const n = navigator;
    if (n.serviceWorker && n.serviceWorker.controller) {
      n.serviceWorker.controller.postMessage({
        type: "coepCredentialless",
        value: coepCredentialless
      });
    }

    n.serviceWorker.register(window.document.currentScript.src).then(
      (registration) => {
        console.log("coi-serviceworker: Registered Service Worker.");
        registration.addEventListener("updatefound", () => {
          console.log("coi-serviceworker: Reloading because of a new version.");
          window.location.reload();
        });

        if (registration.active && !n.serviceWorker.controller) {
          console.log("coi-serviceworker: Reloading because of a controller change.");
          window.location.reload();
        }
      },
      (err) => {
        console.error("coi-serviceworker: Registration failed: ", err);
      }
    );
  })();
}
