"use client";
import React from "react";
import { useState } from "react";
const API = "/api/v1/products";
export default function Poster() {
  const [json, setJson] = useState(
    '{\n  "name": "Bulka",\n  "price": 1.5,\n  "quantity": 10,\n  "category_id": 1\n}'
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
  const post = () =>
    call(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: json,
    });
  return (
    <div style={{ display: "flex", flexDirection: "row", border: "2px solid black" }}>
      <textarea rows={6} value={json} onChange={(e) => setJson(e.target.value)} />
      <button onClick={post}>POST</button>
      <pre>{result}</pre>
    </div>
  );
}