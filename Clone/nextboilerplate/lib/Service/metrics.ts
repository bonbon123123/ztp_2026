import * as repo from "../Repository/notification";
import { NotificationChannel, NotificationStatus } from "../Model/notification";

const TOTALS: [NotificationStatus, string, string][] = [
  [NotificationStatus.SENT, "notifications_sent_total", "Number of sent notifications"],
  [NotificationStatus.FAILED, "notifications_failed_total", "Number of failed notifications"],
  [NotificationStatus.PENDING, "notifications_pending_total", "Number of pending notifications"],
  [NotificationStatus.CANCELLED, "notifications_cancelled_total", "Number of cancelled notifications"],
];

/** Buduje metryki w formacie tekstowym Prometheusa (exposition format 0.0.4). */
export async function buildMetrics(): Promise<string> {
  const rows = await repo.countByStatusAndChannel();
  const count = (status: string, channel?: string) =>
    rows
      .filter((r) => r.status === status && (!channel || r.channel === channel))
      .reduce((sum, r) => sum + r.count, 0);

  let text = "";
  for (const [status, name, help] of TOTALS) {
    text += `# HELP ${name} ${help}\n# TYPE ${name} gauge\n${name} ${count(status)}\n`;
  }

  text += "# HELP notifications_by_channel Number of notifications by status and channel\n";
  text += "# TYPE notifications_by_channel gauge\n";
  for (const status of Object.values(NotificationStatus)) {
    for (const channel of Object.values(NotificationChannel)) {
      text += `notifications_by_channel{status="${status}",channel="${channel}"} ${count(status, channel)}\n`;
    }
  }
  return text;
}
