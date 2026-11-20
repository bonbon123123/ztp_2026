"use client";
import React from "react";
import { useState } from "react";
const API = "/api/v1/auth";
export default function AuthPanel() {
  const [registerJson, setRegisterJson] = useState(
    '{\n  "email": "jan.kowalski@example.com",\n  "password": "StrongPass1!",\n  "confirm_password": "StrongPass1!",\n  "first_name": "Jan",\n  "last_name": "Kowalski"\n}'
  );
  const [loginJson, setLoginJson] = useState(
    '{\n  "email": "jan.kowalski@example.com",\n  "password": "StrongPass1!"\n}'
  );
  const [result, setResult] = useState("");
  // cookie auth_token jest HttpOnly — przeglądarka dołącza je sama, JS go nie widzi
  async function call(url: string, init?: RequestInit) {
    try {
      const res = await fetch(url, init);
      const text = await res.text();
      setResult(`${res.status}\n${text ? JSON.stringify(JSON.parse(text), null, 2) : ""}`);
    } catch (e) {
      setResult(`Błąd: ${String(e)}`);
    }
  }
  const post = (path: string, body?: string) =>
    call(`${API}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
  return (
    <div style={{ display: "flex", flexDirection: "column", border: "2px solid black" }}>
      <b>Konto (identity)</b>
      <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
        <textarea rows={7} cols={45} value={registerJson} onChange={(e) => setRegisterJson(e.target.value)} />
        <button onClick={() => post("register", registerJson)}>Zarejestruj</button>
        <textarea rows={7} cols={40} value={loginJson} onChange={(e) => setLoginJson(e.target.value)} />
        <button onClick={() => post("login", loginJson)}>Zaloguj</button>
      </div>
      <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
        <button onClick={() => call(`${API}/me`)}>Kim jestem (/me)</button>
        <button onClick={() => post("logout")}>Wyloguj</button>
        <button onClick={() => setResult("")}>clear</button>
      </div>
      <pre>{result}</pre>
    </div>
  );
}
