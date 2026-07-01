// Homepage — LoRa Defi Emergency Network Simulator
import Link from 'next/link';
// MermaidWrapper is a Client Component that owns the dynamic(ssr:false) call.
// A Server Component cannot call dynamic() with ssr:false directly.
import MermaidWrapper from '@/components/MermaidWrapper';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-10 w-72 h-72 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-500" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            {/* Status badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-light text-sm text-cyan-300 mb-8 animate-fade-in">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              רשת הצלה פעילה 24/7
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold leading-tight mb-6 animate-slide-in-up">
              <span className="bg-gradient-to-r from-white via-white to-slate-300 bg-clip-text text-transparent">
                כשכל שנייה קובעת,
              </span>
              <br />
              <span className="bg-gradient-to-r from-red-400 via-orange-400 to-cyan-400 bg-clip-text text-transparent">
                הרשת שלנו מצילה חיים
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-in-up delay-200">
              סימולטור המדגים כיצד טכנולוגיית{' '}
              <span className="text-cyan-400 font-semibold">LoRa</span> ורשת{' '}
              <span className="text-cyan-400 font-semibold">Meshtastic</span>{' '}
              מאפשרים שליחת התראות חירום למתנדבים עם דפיברילטורים ניידים —
              גם באזורים ללא קליטה סלולרית.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-in-up delay-300">
              <Link
                href="/simulator"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold rounded-xl text-lg shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all duration-300 animate-pulse-emergency"
              >
                🚨 הפעל סימולציית חירום
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 glass-light hover:bg-white/10 text-white font-semibold rounded-xl text-lg transition-all duration-300"
              >
                📝 הצטרף כמתנדב
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* What is LoRa — 3-line explanation */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              מה זה{' '}
              <span className="text-glow-lora text-cyan-400">LoRa</span>?
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 mx-auto rounded-full" />
          </div>

          <div className="max-w-3xl mx-auto glass rounded-2xl p-8 lg:p-12">
            <div className="space-y-6 text-lg text-slate-200 leading-relaxed">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-xl">
                  📡
                </div>
                <p>
                  <strong className="text-cyan-400">LoRa (Long Range)</strong> היא טכנולוגיית תקשורת
                  אלחוטית שמאפשרת שליחת נתונים למרחקים של עד{' '}
                  <strong>15 ק&quot;מ</strong> בצריכת חשמל מינימלית, בתדר{' '}
                  <strong>433MHz</strong>.
                </p>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-xl">
                  🔗
                </div>
                <p>
                  <strong className="text-cyan-400">Meshtastic</strong> הופך מכשירי LoRa לרשת מש (Mesh
                  Network) — כל מכשיר משמש גם כנקודת ממסר, מה שמרחיב את הטווח ומבטיח
                  שההתראה תגיע גם במקומות ללא תשתית סלולרית.
                </p>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-xl">
                  🫀
                </div>
                <p>
                  במערכת שלנו, כשמתרחש אירוע של{' '}
                  <strong className="text-red-400">דום לב</strong>, נשלחת התראה
                  אוטומטית דרך LoRa <strong>ו</strong>דרך SMS למתנדבים הקרובים
                  הנושאים <strong className="text-red-400">דפיברילטור נייד</strong>{' '}
                  — ומנתבת אותם באופן מיטבי בנתיבי אופניים.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Emergency Flow Diagram — Mermaid */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">איך זה עובד?</h2>
            <p className="text-slate-400">תהליך שליחת התראת חירום מקצה לקצה</p>
            <div className="w-20 h-1 bg-gradient-to-r from-red-500 to-cyan-500 mx-auto rounded-full mt-4" />
          </div>

          <div className="max-w-4xl mx-auto glass rounded-2xl p-8 mb-12">
            <MermaidWrapper />
          </div>

          {/* Detail cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <DetailCard
              icon="📍"
              title="זיהוי מיקום"
              description="מערכת ה-GPS מזהה את מיקום האירוע במדויק"
            />
            <DetailCard
              icon="🔄"
              title="רשת מש"
              description="ההודעה עוברת ממכשיר למכשיר עד שמגיעה למתנדבים בטווח"
            />
            <DetailCard
              icon="🚴"
              title="ניתוב חכם"
              description="המערכת מחשבת נתיב אופניים אופטימלי למתנדב הקרוב"
            />
            <DetailCard
              icon="⏱️"
              title="תגובה מהירה"
              description="זמן תגובה ממוצע: פחות מ-5 דקות באזור עירוני"
            />
          </div>
        </div>
      </section>

      {/* How to Use */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">איך להשתמש באתר</h2>
            <div className="w-20 h-1 bg-gradient-to-r from-emerald-500 to-cyan-500 mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <HowToCard
              step={1}
              icon="📝"
              title="הירשם כמתנדב"
              description="מלא את פרטיך — שם, טלפון, ומזהה LoRa (אם יש). יש צורך בדפיברילטור נייד או מכשיר LoRa."
              href="/register"
              linkText="להרשמה"
            />
            <HowToCard
              step={2}
              icon="🚨"
              title="הפעל סימולציה"
              description="לחץ על כפתור החירום, בחר מיקום על המפה, הגדר רדיוס — וצפה במתנדבים מקבלים התראה בזמן אמת."
              href="/simulator"
              linkText="לסימולטור"
            />
            <HowToCard
              step={3}
              icon="🏆"
              title="צבור נקודות"
              description="כל סימולציה מעדכנת את ניקוד המתנדבים. הגיב מהר, שמור על הציוד טעון — וטפס בלוח ההישגים!"
              href="/leaderboard"
              linkText="ללוח הישגים"
            />
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass rounded-2xl p-8 lg:p-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <StatItem number="50+" label="מתנדבים רשומים" />
              <StatItem number="3" label="אזורי רכיבה" />
              <StatItem number="15" label='ק"מ טווח LoRa' />
              <StatItem number="<5" label="דקות זמן תגובה" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-red-500/10 to-transparent pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            כל <span className="text-red-400">שנייה</span> קובעת.
            <br />
            הצטרפו <span className="text-cyan-400">עכשיו</span>.
          </h2>
          <p className="text-slate-400 text-lg mb-8">
            הסיכוי לשרוד דום לב יורד ב-10% עם כל דקה שעוברת ללא טיפול.
            עזרו לנו להרחיב את רשת ההצלה.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-lg shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300"
          >
            הצטרפו כמתנדבים
          </Link>
        </div>
      </section>
    </div>
  );
}

// ===================== Sub-components =====================

function DetailCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="glass-light rounded-xl p-5 hover:bg-white/10 transition-all duration-300 group">
      <div className="text-2xl mb-3 group-hover:scale-110 transition-transform">{icon}</div>
      <h4 className="font-semibold mb-2">{title}</h4>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  );
}

function HowToCard({
  step,
  icon,
  title,
  description,
  href,
  linkText,
}: {
  step: number;
  icon: string;
  title: string;
  description: string;
  href: string;
  linkText: string;
}) {
  return (
    <div className="glass rounded-2xl p-8 hover:border-cyan-500/30 transition-all duration-300 group relative overflow-hidden">
      <div className="absolute top-4 left-4 text-6xl font-black text-white/5">{step}</div>
      <div className="relative">
        <div className="text-3xl mb-4">{icon}</div>
        <h3 className="text-xl font-bold mb-3">{title}</h3>
        <p className="text-sm text-slate-400 mb-4 leading-relaxed">{description}</p>
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
        >
          {linkText} ←
        </Link>
      </div>
    </div>
  );
}

function StatItem({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
        {number}
      </div>
      <div className="text-sm text-slate-400 mt-1">{label}</div>
    </div>
  );
}
