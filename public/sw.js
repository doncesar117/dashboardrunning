// Recibe los avisos push y abre la app (o el video) al tocarlos.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(d.title || "Running", {
      body: d.body || "",
      icon: "/icon",
      badge: "/icon",
      tag: d.tag,
      data: { url: d.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const external = /^https?:\/\//i.test(url) && new URL(url).origin !== self.location.origin;
      if (!external) {
        for (const c of list) {
          if ("focus" in c) return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
