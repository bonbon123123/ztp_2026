"use client";
import { useEffect, useRef } from "react";

// Swagger UI ładowany z CDN (swagger-ui-react nie renderował się pod Turbopackiem / Next 16)
const VERSION = "5.17.14";
const BASE = `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${VERSION}`;

declare global {
  interface Window {
    SwaggerUIBundle?: (opts: Record<string, unknown>) => unknown;
  }
}

// Jedna obietnica na URL — przy podwójnym useEffect (StrictMode) drugi przebieg czeka na ten sam load
const loading = new Map<string, Promise<void>>();

function loadOnce(tag: "script" | "link", url: string) {
  if (!loading.has(url)) {
    loading.set(
      url,
      new Promise<void>((resolve, reject) => {
        const el = document.createElement(tag);
        if (tag === "script") (el as HTMLScriptElement).src = url;
        else Object.assign(el as HTMLLinkElement, { rel: "stylesheet", href: url });
        el.onload = () => resolve();
        el.onerror = () => reject(new Error(`Nie udało się załadować ${url}`));
        document.head.appendChild(el);
      })
    );
  }
  return loading.get(url)!;
}

export default function SwaggerDocs({ url }: { url: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadOnce("link", `${BASE}/swagger-ui.css`), loadOnce("script", `${BASE}/swagger-ui-bundle.js`)])
      .then(() => {
        if (!cancelled && ref.current && window.SwaggerUIBundle) {
          window.SwaggerUIBundle({ url, domNode: ref.current });
        }
      })
      .catch((e) => {
        if (ref.current) ref.current.textContent = String(e);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return <div ref={ref} style={{ background: "white", minHeight: "100vh" }} />;
}
