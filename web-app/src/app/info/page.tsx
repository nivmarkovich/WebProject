import Link from 'next/link';

export default function InfoPage() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">מידע וציוד</h1>
          <p className="text-slate-400 text-lg">
            כל מה שצריך לדעת על LoRa, דפיברילטורים, ואיפה לקנות
          </p>
          <div className="w-20 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 mx-auto rounded-full mt-4" />
        </div>

        {/* LoRa Shopping Links */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="text-cyan-400">📡</span>
            רכישת מכשירי LoRa (433MHz)
          </h2>
          <p className="text-slate-400 mb-6">
            לשימוש בישראל, חשוב לרכוש מכשירים התומכים בתדר <strong className="text-cyan-400">433MHz</strong> — 
            תדר ISM המאושר לשימוש בישראל.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ShopCard
              name="LILYGO"
              url="https://www.lilygo.cc"
              description="מכשירי T-Beam עם GPS מובנה ומודול LoRa 433MHz. אידיאלי לשימוש עם Meshtastic."
              badge="מומלץ"
              badgeColor="cyan"
              features={['GPS מובנה', 'סוללה נטענת', 'תמיכה מלאה ב-Meshtastic']}
            />
            <ShopCard
              name="Rokland"
              url="https://www.rokland.com"
              description="מגוון רחב של מכשירי Meshtastic מוכנים לשימוש, כולל אנטנות ואביזרים."
              badge="מגוון רחב"
              badgeColor="blue"
              features={['מכשירים מורכבים', 'אנטנות חיצוניות', 'משלוח בינלאומי']}
            />
            <ShopCard
              name="Seeed Studio"
              url="https://www.seeedstudio.com"
              description="מודולי RAK WisBlock ו-Wio-E5 — מודולריים, ניתנים להתאמה אישית."
              badge="מודולרי"
              badgeColor="emerald"
              features={['מודולי הרחבה', 'IDE ידידותי', 'תיעוד מקיף']}
            />
          </div>

          <div className="mt-6 p-4 glass-light rounded-xl">
            <p className="text-sm text-slate-400 flex items-start gap-2">
              <span className="text-yellow-400 text-lg flex-shrink-0">💡</span>
              <span>
                <strong className="text-slate-300">טיפ:</strong> לפני רכישה, מומלץ להצטרף ל
                <a href="https://meshtastic.org/docs/community/" target="_blank" rel="noopener noreferrer"
                   className="text-cyan-400 hover:text-cyan-300 mr-1">
                  קהילת Meshtastic ישראל בטלגרם
                </a>
                לקבלת ייעוץ על החומרה המתאימה ביותר לאזורכם.
              </span>
            </p>
          </div>
        </section>

        {/* MADA Defibrillator Map */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="text-red-400">🫀</span>
            מפת דפיברילטורים — מגן דוד אדום
          </h2>

          <div className="glass rounded-2xl p-8">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-3">איפה דפי? — מפת דפיברילטורים ארצית</h3>
                <p className="text-slate-400 mb-4 leading-relaxed">
                  מד&quot;א הציבו למעלה מ-1,300 עמדות דפיברילטור חכמות ברחבי הארץ. 
                  המפה האינטראקטיבית מאפשרת לאתר את הדפיברילטור הקרוב אליכם.
                </p>
                <p className="text-slate-400 mb-6 leading-relaxed">
                  ע&quot;פ חוק, דפיברילטורים נמצאים בקניונים, תחנות תחבורה, מוסדות חינוך, 
                  מתקני ספורט, ומקומות עבודה גדולים.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="https://defi.co.il"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold rounded-xl shadow-lg shadow-red-500/25 transition-all duration-300"
                  >
                    🗺️ מפת דפיברילטורים
                  </a>
                  <a
                    href="https://www.mdais.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 glass-light hover:bg-white/10 text-white font-semibold rounded-xl transition-all duration-300"
                  >
                    🚑 אתר מד&quot;א
                  </a>
                </div>
              </div>
              <div className="flex-shrink-0">
                <div className="w-40 h-40 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/20 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-5xl mb-2">🫀</div>
                    <div className="text-2xl font-bold text-red-400">1,300+</div>
                    <div className="text-xs text-slate-400">עמדות דפיברילטור</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Emergency Info */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="text-yellow-400">⚠️</span>
            במקרה חירום אמיתי
          </h2>

          <div className="glass rounded-2xl p-8 border-red-500/20 glow-emergency">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-400 mb-4">
                חייגו מיד: <span dir="ltr" className="text-4xl">101</span>
              </p>
              <p className="text-slate-300 max-w-lg mx-auto">
                אתר זה הוא <strong>סימולטור למטרות הדגמה בלבד</strong>.
                במקרה חירום רפואי אמיתי, חייגו מיד ל-101 (מגן דוד אדום) 
                או ל-112 לשירותי חירום.
              </p>
            </div>
          </div>
        </section>

        {/* Maintenance Guide */}
        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="text-emerald-400">🔧</span>
            תחזוקת ציוד
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
                📡 מכשיר LoRa
              </h3>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  טענו את הסוללה לפחות פעם בשבוע
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  ודאו שהאנטנה מחוברת כהלכה
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  עדכנו את קושחת Meshtastic בכל גרסה חדשה
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  בדקו שמיקום ה-GPS מדויק
                </li>
              </ul>
            </div>

            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                🫀 דפיברילטור
              </h3>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  בדקו תאריך תפוגה של הפדים (אלקטרודות)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  ודאו שהסוללה טעונה (נורית ירוקה)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  אחסנו במקום יבש בטמפרטורה סבירה
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  בצעו בדיקה עצמית חודשית
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// Sub-component: Shop Card
function ShopCard({
  name,
  url,
  description,
  badge,
  badgeColor,
  features,
}: {
  name: string;
  url: string;
  description: string;
  badge: string;
  badgeColor: string;
  features: string[];
}) {
  const badgeColors: Record<string, string> = {
    cyan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    blue: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  };

  return (
    <div className="glass rounded-2xl p-6 hover:border-cyan-500/30 transition-all duration-300 group flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">{name}</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${badgeColors[badgeColor]}`}>
          {badge}
        </span>
      </div>
      <p className="text-sm text-slate-400 mb-4 flex-1">{description}</p>
      <ul className="space-y-1.5 mb-4">
        {features.map((f, i) => (
          <li key={i} className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="text-cyan-400">•</span> {f}
          </li>
        ))}
      </ul>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 glass-light hover:bg-white/10 rounded-xl text-sm font-medium transition-all duration-300 group-hover:border-cyan-500/30"
      >
        🔗 בקרו באתר
      </a>
    </div>
  );
}
