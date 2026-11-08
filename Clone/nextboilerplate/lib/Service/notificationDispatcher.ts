import { NotificationChannel, type Notification } from "../Model/notification";
import { sendEmailNotification, sendPushNotification } from "./notificationDelivery";

/** Wybiera mechanizm wysyłki na podstawie kanału powiadomienia. */
export async function dispatchNotification(n: Notification): Promise<void> {
  switch (n.channel) {
    case NotificationChannel.EMAIL:
      return sendEmailNotification(n);
    case NotificationChannel.PUSH:
      return sendPushNotification(n);
    default:
      throw new Error(`Nieobsługiwany kanał powiadomienia: ${n.channel}`);
  }
}
