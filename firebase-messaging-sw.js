// Placeholder service worker for a future first-party push implementation.
// Production push should be wired through the app backend, Firebase Cloud Messaging,
// and APNs for iOS instead of loading third-party scripts.
self.addEventListener("push", (event) => {
    const data = event.data?.json?.() || {
        title: "Raven RP",
        body: "Новое уведомление"
    };

    event.waitUntil(
        self.registration.showNotification(data.title || "Raven RP", {
            body: data.body || "Новое уведомление",
            icon: data.icon || "/icon.png"
        })
    );
});
