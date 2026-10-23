"use client";
import React from "react";
import { useState } from "react";
const API = "/api/v1/products";
export default function Putter() {
  const [id, setId] = useState("");
  const [json, setJson] = useState(
    '{\n  "name": "Rogal",\n  "price": 4,\n  "quantity": 15,\n  "category_id": 1\n}'
  );
  const [result, setResult] = useState("");
  async function call(url: string, init?: RequestInit) {
    try {
      const res = await fetch(url, init);
      const data = await res.json();
      setResult(`${res.status}\n${JSON.stringify(data, null, 2)}`);
    } catch (e) {
      setResult(`Błąd: ${String(e)}`);
    }
  }
  const put = () =>
    call(`${API}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: json,
    });
  return (
    <div style={{ display: "flex", flexDirection: "row", border: "2px solid black" }}>
      <input value={id} onChange={(e) => setId(e.target.value)} placeholder="id" />
      <textarea rows={6} value={json} onChange={(e) => setJson(e.target.value)} />
      <button onClick={put} disabled={!id}>PUT</button>
      <pre>{result}</pre>
    </div>
  );
}