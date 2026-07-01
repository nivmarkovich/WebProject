'use client';

import dynamic from 'next/dynamic';

// dynamic() with ssr:false must live inside a Client Component.
// This wrapper is that client boundary — page.tsx imports this file directly.
const MermaidDiagram = dynamic(() => import('./MermaidDiagram'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-48 flex items-center justify-center text-slate-500">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        טוען תרשים...
      </div>
    </div>
  ),
});

export default function MermaidWrapper() {
  return <MermaidDiagram />;
}
