import Getter from "./components/Getter";
import Poster from "./components/Poster";
import Putter from "./components/Putter";
import Deleter from "./components/Deleter";
import HistoryGetter from "./components/HistoryGetter";
import NotificationPoster from "./components/NotificationPoster";
import NotificationList from "./components/NotificationList";
import AuthPanel from "./components/AuthPanel";

export default function Home() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 16 }}>
        <a href="/product-docs" style={{ textDecoration: "underline" }}>Dokumentacja produktów</a>
        <a href="/notifications-docs" style={{ textDecoration: "underline" }}>Dokumentacja powiadomień</a>
        <a href="/identity-docs" style={{ textDecoration: "underline" }}>Dokumentacja identity</a>
      </div>
      <AuthPanel />
      <Getter />
      <Poster />
      <Putter />
      <Deleter />
      <HistoryGetter />
      <NotificationPoster />
      <NotificationList />
    </div>
  );
}
