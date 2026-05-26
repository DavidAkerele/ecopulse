import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ECO_BODY } from "@/lib/ecoBody";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EcoPulse: The Carbon-Aware AI Sandbox" },
      {
        name: "description",
        content:
          "EcoPulse: A sleek developer and consumer sandbox revealing the real-time environmental cost of interacting with large language models (LLMs) using UK National Grid live coefficients.",
      },
      {
        name: "keywords",
        content:
          "AI carbon footprint, sustainable computing, green software, carbon intensity API, LLM energy calculator",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@300;400;500;600;700&display=swap",
      },
      { rel: "stylesheet", href: "/eco/styles.css" },
      { rel: "stylesheet", href: "/eco/overrides.css" },
      { rel: "preload", as: "image", href: "/eco/bg.png", fetchpriority: "high" },
    ],
  }),
  component: Index,
});

function Index() {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !ref.current) return;

    let cancelled = false;
    const loadScript = (src: string) =>
      new Promise<void>((resolve, reject) => {
        const existing = document.querySelector(`script[data-eco="${src}"]`);
        if (existing) return resolve();
        const s = document.createElement("script");
        s.src = src;
        s.async = false;
        s.dataset.eco = src;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Failed to load " + src));
        document.body.appendChild(s);
      });

    (async () => {
      try {
        await loadScript("https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js");
        if (cancelled) return;
        // @ts-expect-error global from CDN
        if (typeof window !== "undefined" && window.lucide?.createIcons) {
          // @ts-expect-error global from CDN
          window.lucide.createIcons();
        }
        await loadScript("/eco/app.js");
        if (cancelled) return;
        document.dispatchEvent(new Event("DOMContentLoaded"));
        // @ts-expect-error global from CDN
        window.lucide?.createIcons?.();
      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted]);

  if (!mounted) {
    return <div ref={ref} />;
  }
  return <div ref={ref} dangerouslySetInnerHTML={{ __html: ECO_BODY }} />;
}
