import SwaggerDocs from "../components/SwaggerDocs";

export const metadata = { title: "Notifications API" };

export default function NotificationsDocs() {
  return <SwaggerDocs url="/api/docs/notifications" />;
}
