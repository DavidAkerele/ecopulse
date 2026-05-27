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

        // Load Supabase if environment variables are configured
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseAnonKey) {
          // @ts-expect-error set global keys
          window.SUPABASE_URL = supabaseUrl;
          // @ts-expect-error set global keys
          window.SUPABASE_ANON_KEY = supabaseAnonKey;
          
          await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js");
          if (cancelled) return;
          
          // @ts-expect-error global from CDN
          if (typeof window !== "undefined" && window.supabase?.createClient) {
            // @ts-expect-error global from CDN
            window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
          }
        }

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
      background: radial-gradient(circle at center, #0b1510 0%, #030504 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1);
      opacity: 1;
    }
    .preloader-overlay.fade-out {
      opacity: 0;
      pointer-events: none;
    }
    .preloader-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 36px 48px;
      background: rgba(11, 21, 16, 0.65);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(16, 185, 129, 0.15);
      border-radius: 24px;
      box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6), inset 0 0 20px rgba(16, 185, 129, 0.05);
      gap: 24px;
      animation: preloader-card-in 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .preloader-icon-wrap {
      position: relative;
      width: 90px;
      height: 90px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%);
      border-radius: 50%;
    }
    .preloader-icon {
      width: 44px;
      height: 44px;
      object-fit: contain;
      z-index: 3;
      filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.4));
      animation: logo-pulse 2s infinite ease-in-out;
    }
    .preloader-ring-outer {
      position: absolute;
      inset: 0;
      border: 2px solid transparent;
      border-top: 2px solid #10b981;
      border-right: 2px solid #10b981;
      border-radius: 50%;
      animation: preloader-spin-clockwise 1.8s cubic-bezier(0.5, 0.1, 0.5, 0.9) infinite;
      z-index: 2;
      filter: drop-shadow(0 0 3px rgba(16, 185, 129, 0.3));
    }
    .preloader-ring-inner {
      position: absolute;
      inset: 8px;
      border: 1.5px solid transparent;
      border-bottom: 1.5px solid #34d399;
      border-left: 1.5px solid #34d399;
      border-radius: 50%;
      animation: preloader-spin-counter 1.4s cubic-bezier(0.5, 0.1, 0.5, 0.9) infinite;
      z-index: 1;
      opacity: 0.7;
    }
    .preloader-text-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }
    .preloader-text {
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.25em;
      color: #34d399;
      text-shadow: 0 0 10px rgba(52, 211, 153, 0.3);
      animation: text-pulse 2s infinite ease-in-out;
    }
    .preloader-progress {
      width: 120px;
      height: 2px;
      background: rgba(16, 185, 129, 0.1);
      border-radius: 2px;
      overflow: hidden;
    }
    .preloader-progress-bar {
      height: 100%;
      width: 100%;
      background: linear-gradient(90deg, #10b981, #34d399);
      animation: progress-scan 2s infinite ease-in-out;
      transform-origin: left;
    }
    @keyframes preloader-card-in {
      from {
        opacity: 0;
        transform: translateY(10px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    @keyframes preloader-spin-clockwise {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes preloader-spin-counter {
      0% { transform: rotate(360deg); }
      100% { transform: rotate(0deg); }
    }
    @keyframes logo-pulse {
      0%, 100% { transform: scale(1); filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.3)); }
      50% { transform: scale(1.06); filter: drop-shadow(0 0 15px rgba(16, 185, 129, 0.6)); }
    }
    @keyframes text-pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }
    @keyframes progress-scan {
      0% { transform: scaleX(0); transform-origin: left; }
      49% { transform: scaleX(1); transform-origin: left; }
      50% { transform: scaleX(1); transform-origin: right; }
      100% { transform: scaleX(0); transform-origin: right; }
    }
  `;

  if (!mounted) {
    return (
      <div ref={ref}>
        <style dangerouslySetInnerHTML={{ __html: preloaderStyles }} />
        <div id="app-preloader" className="preloader-overlay">
          <div className="preloader-card">
            <div className="preloader-icon-wrap">
              <img src="/eco/favicon.png" className="preloader-icon" alt="Echo Pulse Logo" />
              <div className="preloader-ring-outer"></div>
              <div className="preloader-ring-inner"></div>
            </div>
            <div className="preloader-text-wrapper">
              <span className="preloader-text">INITIALIZING ECHO PULSE</span>
              <div className="preloader-progress">
                <div className="preloader-progress-bar"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref}>
      <style dangerouslySetInnerHTML={{ __html: preloaderStyles }} />
      <div id="app-preloader" className="preloader-overlay">
        <div className="preloader-card">
          <div className="preloader-icon-wrap">
            <img src="/eco/favicon.png" className="preloader-icon" alt="Echo Pulse Logo" />
            <div className="preloader-ring-outer"></div>
            <div className="preloader-ring-inner"></div>
          </div>
          <div className="preloader-text-wrapper">
            <span className="preloader-text">INITIALIZING ECHO PULSE</span>
            <div className="preloader-progress">
              <div className="preloader-progress-bar"></div>
            </div>
          </div>
        </div>
      </div>
      <div dangerouslySetInnerHTML={{ __html: ECO_BODY }} />
    </div>
  );
}
