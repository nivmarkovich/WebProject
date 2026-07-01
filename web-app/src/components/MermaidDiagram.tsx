'use client';

import { useEffect, useRef } from 'react';

// Mermaid is browser-only — this component must be 'use client'
export default function MermaidDiagram() {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false); // prevent double-render in StrictMode

  useEffect(() => {
    // Guard against StrictMode double-invocation and stale async callbacks
    let cancelled = false;
    if (renderedRef.current) return;

    const el = containerRef.current;
    if (!el) return;

    import('mermaid').then((m) => {
      if (cancelled || !containerRef.current) return;

      const mermaid = m.default;
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          primaryColor: '#1e293b',
          primaryBorderColor: '#06b6d4',
          primaryTextColor: '#ffffff',
          lineColor: '#06b6d4',
          background: '#0f172a',
          mainBkg: '#1e293b',
          nodeBorder: '#06b6d4',
          clusterBkg: '#1e293b',
          titleColor: '#ffffff',
          edgeLabelBackground: '#1e293b',
        },
        fontFamily: 'Rubik, Segoe UI, sans-serif',
      });

      containerRef.current.removeAttribute('data-processed');
      mermaid.run({ nodes: [containerRef.current] }).catch((err: unknown) => {
        // Silently swallow Mermaid DOM errors (e.g., StrictMode race conditions)
        console.warn('Mermaid render skipped:', err);
      });

      renderedRef.current = true;
    }).catch((err: unknown) => {
      console.warn('Mermaid import failed:', err);
    });

    return () => {
      cancelled = true;
      renderedRef.current = false;
    };
  }, []);

  const diagram = `graph LR
    A["🚨 אירוע חירום<br/>דום לב מזוהה"] -->|התראה| B("📡 שידור כפול")
    B --> C["LoRa Mesh<br/>Meshtastic"]
    B --> D["SMS / Push<br/>סלולרי"]
    C --> E{"מתנדבים<br/>ברדיוס"}
    D --> E
    E -->|"ניתוב אופניים חכם<br/>OpenRouteService"| F["🫀 מתנדב מגיע<br/>עם AED"]

    classDef default fill:#1e293b,stroke:#06b6d4,stroke-width:2px,color:#fff;
    classDef alert fill:#991b1b,stroke:#ef4444,stroke-width:2px,color:#fff;
    classDef success fill:#065f46,stroke:#10b981,stroke-width:2px,color:#fff;
    classDef decision fill:#1e3a5f,stroke:#06b6d4,stroke-width:2px,color:#fff;

    class A alert;
    class F success;
    class E decision;`;

  return (
    <div className="w-full overflow-x-auto flex justify-center py-4">
      <div
        className="mermaid text-sm"
        ref={containerRef}
        dir="ltr"
        style={{ minWidth: '500px' }}
      >
        {diagram}
      </div>
    </div>
  );
}
