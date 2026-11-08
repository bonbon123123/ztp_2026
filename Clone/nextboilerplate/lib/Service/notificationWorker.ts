import { processReadyNotifications } from "./notification";

const g = globalThis as typeof globalThis & { __notificationWorker?: NodeJS.Timeout };

/** Uruchamia cykliczne przetwarzanie gotowych powiadomień (jeden worker na proces serwera). */
export function runWorker(intervalSeconds = 5) {
  if (g.__notificationWorker) return; // już działa (np. po przeładowaniu w trybie dev)
  console.log(`[WORKER] Uruchomiono worker. Interwał: ${intervalSeconds} s`);

  let running = false; // kolejny tik nie startuje, dopóki poprzedni się nie skończy
  g.__notificationWorker = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const processed = await processReadyNotifications();
      if (processed) console.log(`[WORKER] Przetworzono ${processed} powiadomień.`);
    } catch (e) {
      console.error(`[WORKER] Wystąpił błąd: ${e}`);
    } finally {
      running = false;
    }
  }, intervalSeconds * 1000);
}
