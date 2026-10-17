"use client";
import React from "react";
import { useState } from "react";
 
const API = "/api/v1/products";
 
export default function ProductsPanel() {
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
 
  const getAll = () => call(API);
  const getById = () => call(`${API}/${id}`);
  const clear = () => setResult("");
 
  return (
    <div style={{ display: "flex",   flexDirection: "column" }}>
      <button onClick={getAll}>GET wszystkie</button>
      
      <button onClick={clear}>clear</button>
      <div style={{ display: "flex", 
  flexDirection: "row",  border: "2px solid black" }}>
        
        <input value={id} onChange={(e) => setId(e.target.value)} placeholder="id" />
        <button onClick={getById} disabled={!id}>GET po ID</button>
      </div>
      <pre>{result}</pre>
    </div>
  );
}