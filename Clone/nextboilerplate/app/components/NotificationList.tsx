"use client";
import React, { useCallback, useEffect, useState } from "react";

const API = "/api/v1/notifications";

type Notification = {
  id: number;
  content: string;
  channel: string;
  recipient: string;
  scheduled_at: string;
  timezone: string;
  status: string;
  product_id: number | null;
};

function local(utc: string, tz: string) {
  try {
    return new Date(utc).toLocaleString("pl-PL", { timeZone: tz });
  } catch {
    return "?";
  }
}

export default function NotificationList() {
  const [items, setItems] = useState<Notification[]>([]);
  const [message, setMessage] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch(API);
    if (res.ok) setItems(await res.json());
  }, []);

  // auto-odświeżanie co 5 s (widać, jak worker sam zmienia PENDING → SENT); checkbox je wstrzymuje
  useEffect(() => {
    const first = setTimeout(load, 0); // pierwsze pobranie zaraz po wyrenderowaniu
    const t = autoRefresh ? setInterval(load, 5000) : undefined;
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [autoRefresh, load]);

  async function sendNow(id: number) {
    const res = await fetch(`${API}/${id}/send-now`, { method: "POST" });
    const data = await res.json();
    setMessage(`${res.status} ${res.ok ? `#${id} → ${data.status}` : data.error}`);
    await load();
  }

  async function processReady() {
    const res = await fetch(`${API}/process-ready`, { method: "POST" });
    const data = await res.json();
    setMessage(`${res.status} ${res.ok ? `przetworzono: ${data.processed_count}` : data.error}`);
    await load();
  }

  async function cancel(id: number) {
    const res = await fetch(`${API}/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    const data = await res.json();
    setMessage(`${res.status} ${res.ok ? `#${id} → ${data.status}` : data.error}`);
    await load();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, border: "2px solid black", padding: 8 }}>
      <strong>Powiadomienia</strong>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={load}>Odśwież</button>
        <button onClick={processReady}>Przetwórz gotowe</button>
        <label>
          <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
          auto-odświeżanie (5 s)
        </label>
        <span>{message}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>id</th><th>treść</th><th>kanał</th><th>odbiorca</th>
            <th>zaplanowane (UTC)</th><th>lokalnie</th><th>produkt</th><th>status</th><th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((n) => (
            <tr key={n.id}>
              <td>{n.id}</td>
              <td>{n.content}</td>
              <td>{n.channel}</td>
              <td>{n.recipient}</td>
              <td>{n.scheduled_at}</td>
              <td>{local(n.scheduled_at, n.timezone)} ({n.timezone})</td>
              <td>{n.product_id ?? "-"}</td>
              <td>{n.status}</td>
              <td>
                {n.status === "PENDING" && (
                  <>
                    <button onClick={() => sendNow(n.id)}>Wyślij teraz</button>{" "}
                    <button onClick={() => cancel(n.id)}>Anuluj</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
