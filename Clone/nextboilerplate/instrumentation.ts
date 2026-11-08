// Wywoływane raz przy starcie serwera Next.js — uruchamia worker powiadomień w tle aplikacji
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runWorker } = await import("./lib/Service/notificationWorker");
    runWorker(Number(process.env.NOTIFICATION_WORKER_INTERVAL ?? 5));
  }
}
