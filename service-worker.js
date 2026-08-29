self.addEventListener("push", event => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  event.waitUntil(
    self.registration.showNotification(
      data.title || "Quiz Me This, BDL, Quiz Me That",
      {
        body:
          data.body ||
          "A new Daily Quiz question is ready.",
        data: {
          url: data.url || "./"
        }
      }
    )
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();

  const url =
    event.notification.data?.url || "./";

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true
      })
      .then(windowClients => {
        for (const client of windowClients) {
          if ("focus" in client) {
            if ("navigate" in client) {
              client.navigate(url);
            }

            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
