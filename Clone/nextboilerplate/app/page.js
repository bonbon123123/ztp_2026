import Image from "next/image";
import Getter from "./components/Getter";
import Poster from "./components/Poster";
import Putter from "./components/Putter";
import Deleter from "./components/Deleter";
import HistoryGetter from "./components/HistoryGetter";

export default function Home() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Getter />
      <Poster />
      <Putter />
      <Deleter />
      <HistoryGetter />
    </div>
  );
}