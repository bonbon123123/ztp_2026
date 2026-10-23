"use client";
import React from "react";
import { useState } from "react";
const API = "/api/v1/products";
export default function Deleter() {
  const [id, setId] = useState("");
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
  const del = () => call(`${API}/${id}`, { method: "DELETE" });
  return (
    <div style={{ display: "flex", flexDirection: "row", border: "2px solid black" }}>
      <input value={id} onChange={(e) => setId(e.target.value)} placeholder="id" />
      <button onClick={del} disabled={!id}>DELETE</button>
      <pre>{result}</pre>
    </div>
  );
}