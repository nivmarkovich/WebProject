import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-slate-950/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <h3 className="text-lg font-bold bg-gradient-to-r from-red-400 to-cyan-400 bg-clip-text text-transparent mb-4">
              LoRa Defi
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              פרויקט אקדמי המדגים כיצד ניתן להשתמש בטכנולוגיית LoRa ורשת Meshtastic 
              ליצירת רשת הצלה חכמה למתנדבים עם דפיברילטורים ניידים באזורים מרוחקים.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">ניווט מהיר</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/simulator" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
                  סימולטור חירום
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
                  הרשמה כמתנדב
                </Link>
              </li>
              <li>
                <Link href="/info" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
                  מידע על ציוד
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
                  לוח הישגים
                </Link>
              </li>
            </ul>
          </div>

          {/* External Links */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">קישורים חיצוניים</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://defi.co.il" target="_blank" rel="noopener noreferrer"
                   className="text-sm text-slate-400 hover:text-red-400 transition-colors flex items-center gap-2">
                  🫀 מפת דפיברילטורים — איפה דפי?
                </a>
              </li>
              <li>
                <a href="https://www.mdais.org" target="_blank" rel="noopener noreferrer"
                   className="text-sm text-slate-400 hover:text-red-400 transition-colors flex items-center gap-2">
                  🚑 מגן דוד אדום
                </a>
              </li>
              <li>
                <a href="https://meshtastic.org" target="_blank" rel="noopener noreferrer"
                   className="text-sm text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-2">
                  📡 Meshtastic
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/5 text-center">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} LoRa Defi — פרויקט גמר אקדמי. 
            כל הזכויות שמורות.
          </p>
          <p className="text-xs text-slate-600 mt-1">
            זהו סימולטור למטרות הדגמה בלבד. במקרה חירום אמיתי — חייגו 101
          </p>
        </div>
      </div>
    </footer>
  );
}
