import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ECO_BODY } from "@/lib/ecoBody";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Echo Pulse" },
      {
        name: "description",
        content:
          "Echo Pulse: A sleek developer and consumer platform revealing the real-time environmental cost of interacting with large language models (LLMs) using UK National Grid live coefficients.",
      },
      {
        name: "keywords",
        content:
          "AI carbon footprint, sustainable computing, green software, carbon intensity API, LLM energy calculator",
      },
      { property: "og:title", content: "Echo Pulse" },
      {
        property: "og:description",
        content:
          "A sleek developer and consumer platform revealing the real-time environmental cost of interacting with large language models (LLMs) using UK National Grid live coefficients.",
      },
      { property: "og:image", content: "/eco/bg.png" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Echo Pulse" },
      {
        name: "twitter:description",
        content:
          "Reveal the real-time environmental cost of interacting with LLMs using UK National Grid live coefficients.",
      },
      { name: "twitter:image", content: "/eco/bg.png" },
    ],
    links: [
      { rel: "icon", href: "/eco/favicon.png", type: "image/png" },
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

    const loadTiktoken = () =>
      new Promise<void>((resolve) => {
        const existing = document.querySelector(`script[data-eco="tiktoken"]`);
        if (existing) {
          // @ts-expect-error check global
          if (typeof window !== "undefined" && window.jsTiktokenLoaded) {
            return resolve();
          }
          document.addEventListener('tiktoken-ready', () => resolve(), { once: true });
          return;
        }
        const s = document.createElement("script");
        s.type = "module";
        s.dataset.eco = "tiktoken";
        s.textContent = `
          import { getEncoding, encodingForModel } from 'https://cdn.jsdelivr.net/npm/js-tiktoken@1.0.21/+esm';
          window.getEncoding = getEncoding;
          window.encodingForModel = encodingForModel;
          window.jsTiktokenLoaded = true;
          document.dispatchEvent(new CustomEvent('tiktoken-ready'));
        `;
        document.body.appendChild(s);
        // @ts-expect-error check global
        if (typeof window !== "undefined" && window.jsTiktokenLoaded) {
          resolve();
        } else {
          document.addEventListener('tiktoken-ready', () => resolve(), { once: true });
        }
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
        
        // Wait for tiktoken to load first
        await loadTiktoken();
        if (cancelled) return;

        await loadScript("/eco/app.js");
        if (cancelled) return;
        document.dispatchEvent(new Event("DOMContentLoaded"));
        // @ts-expect-error global from CDN
        window.lucide?.createIcons?.();

        const preloader = document.getElementById("app-preloader");
        if (preloader) {
          preloader.classList.add("fade-out");
          setTimeout(() => {
            preloader.remove();
          }, 500);
        }
      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted]);

  const preloaderStyles = `
    .preloader-overlay {
      position: fixed;
      inset: 0;
      background: #050806;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      opacity: 1;
    }
    .preloader-overlay.fade-out {
      opacity: 0;
      pointer-events: none;
    }
    .preloader-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }
    .preloader-icon-wrap {
      position: relative;
      width: 72px;
      height: 72px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .preloader-icon {
      width: 48px;
      height: 48px;
      object-fit: contain;
      z-index: 2;
      animation: logo-bounce 2s infinite ease-in-out;
    }
    .preloader-ring {
      position: absolute;
      inset: 0;
      border: 2px solid rgba(16, 185, 129, 0.1);
      border-top-color: #10b981;
      border-radius: 50%;
      animation: preloader-spin 1.2s infinite linear;
      z-index: 1;
    }
    .preloader-text {
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.15em;
      color: #10b981;
      opacity: 0.8;
      animation: preloader-fade 1.5s infinite ease-in-out;
    }
    @keyframes preloader-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes logo-bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }
    @keyframes preloader-fade {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.85; }
    }
  `;

  if (!mounted) {
    return (
      <div ref={ref}>
        <style dangerouslySetInnerHTML={{ __html: preloaderStyles }} />
        <div id="app-preloader" className="preloader-overlay">
          <div className="preloader-content">
            <div className="preloader-icon-wrap">
              <img src="/eco/favicon.png" className="preloader-icon" alt="Echo Pulse Logo" />
              <div className="preloader-ring"></div>
            </div>
            <span className="preloader-text">INITIALIZING ECHO PULSE</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref}>
      <style dangerouslySetInnerHTML={{ __html: preloaderStyles }} />
      <div id="app-preloader" className="preloader-overlay">
        <div className="preloader-content">
          <div className="preloader-icon-wrap">
            <img src="/eco/favicon.png" className="preloader-icon" alt="Echo Pulse Logo" />
            <div className="preloader-ring"></div>
          </div>
          <span className="preloader-text">INITIALIZING ECHO PULSE</span>
        </div>
      </div>
      <div dangerouslySetInnerHTML={{ __html: ECO_BODY }} />
    </div>
  );
}
