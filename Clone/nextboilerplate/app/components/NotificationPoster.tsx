"use client";
import React, { useState } from "react";

const API = "/api/v1/notifications";

export default function NotificationPoster() {
  const [content, setContent] = useState("Przypomnienie o zajęciach");
  const [channel, setChannel] = useState("EMAIL");
  const [recipient, setRecipient] = useState("student@example.com");
  const [scheduledAt, setScheduledAt] = useState("");
  const [timezone, setTimezone] = useState("Europe/Warsaw");
  const [productId, setProductId] = useState("");
  const [result, setResult] = useState("");

  async function post() {
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          channel,
          recipient,
          scheduled_at: scheduledAt,
          timezone,
          product_id: productId ? Number(productId) : null,
        }),
      });
      const data = await res.json();
      setResult(`${res.status}\n${JSON.stringify(data, null, 2)}`);
    } catch (e) {
      setResult(`Błąd: ${String(e)}`);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "row", gap: 8, border: "2px solid black", padding: 8 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <strong>Nowe powiadomienie</strong>
        <input value={content} onChange={(e) => setContent(e.target.value)} placeholder="treść" />
        <select value={channel} onChange={(e) => setChannel(e.target.value)}>
          <option value="EMAIL">EMAIL</option>
          <option value="PUSH">PUSH</option>
        </select>
        <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="odbiorca" />
        <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        <input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="strefa, np. Europe/Warsaw" />
        <input value={productId} onChange={(e) => setProductId(e.target.value)} placeholder="product_id (opcjonalnie)" />
        <button onClick={post}>POST</button>
      </div>
      <pre>{result}</pre>
    </div>
  );
}
