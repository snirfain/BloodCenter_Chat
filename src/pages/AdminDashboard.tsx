import React, { useCallback, useEffect, useState } from 'react';

type AdminSessionRow = {
  session_id: string;
  created_at: string;
  final_status: string | null;
  rating: number | null;
  feedback_text: string | null;
  answers_log: Record<string, unknown>;
  phone_masked: string;
};

export const AdminDashboard: React.FC = () => {
  const [password, setPassword] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<AdminSessionRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadSessions = useCallback(
    async (cursor?: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: '25' });
        if (cursor) params.set('cursor', cursor);
        const res = await fetch(`/api/admin-sessions?${params}`, { credentials: 'include' });
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          sessions?: AdminSessionRow[];
          nextCursor?: string | null;
        };
        if (!res.ok || !data.ok) {
          if (res.status === 401) {
            setAuthorized(false);
            setError(cursor ? 'פג תוקף — התחברו מחדש' : null);
            return;
          }
          setError(data.error ?? 'שגיאת שרת');
          return;
        }
        setAuthorized(true);
        if (cursor) {
          setSessions((prev) => [...prev, ...(data.sessions ?? [])]);
        } else {
          setSessions(data.sessions ?? []);
        }
        setNextCursor(data.nextCursor ?? null);
      } catch {
        setError('לא ניתן להתחבר לשרת');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadSessions(null);
  }, [loadSessions]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'סיסמה שגויה');
        return;
      }
      setPassword('');
      await loadSessions(null);
    } catch {
      setError('שגיאת רשת');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin-logout', { method: 'POST', credentials: 'include' });
    setAuthorized(false);
    setSessions([]);
    setNextCursor(null);
  };

  return (
    <div className="min-h-dvh flex flex-col bg-gray-100 text-gray-900" dir="rtl">
      <header className="bg-mda-red text-white px-4 py-4 shadow-md flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold">לוח בקרה — סשנים רפואיים</h1>
        {authorized && (
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="text-sm px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 transition-colors"
          >
            התנתק
          </button>
        )}
      </header>

      <main className="flex-1 p-4 max-w-6xl mx-auto w-full">
        {!authorized && (
          <form
            onSubmit={(e) => void handleLogin(e)}
            className="max-w-md mx-auto mt-10 p-6 bg-white rounded-2xl shadow border border-gray-200 space-y-4"
          >
            <p className="text-sm text-gray-600">הזינו את סיסמת המנהל (מוגדרת בשרת בלבד).</p>
            <label className="block text-sm font-medium text-gray-700" htmlFor="admin-pw">
              סיסמה
            </label>
            <input
              id="admin-pw"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mda-red/40"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full py-3 rounded-xl bg-mda-red text-white font-medium hover:bg-mda-red-dark disabled:opacity-50"
            >
              {loading ? 'מתחבר…' : 'כניסה'}
            </button>
          </form>
        )}

        {authorized && (
          <>
            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full text-sm text-right">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 font-semibold">תאריך</th>
                    <th className="px-3 py-2 font-semibold">טלפון</th>
                    <th className="px-3 py-2 font-semibold">סטטוס</th>
                    <th className="px-3 py-2 font-semibold">דירוג</th>
                    <th className="px-3 py-2 font-semibold">משוב</th>
                    <th className="px-3 py-2 font-semibold">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <React.Fragment key={s.session_id}>
                      <tr className="border-b border-gray-100 hover:bg-gray-50/80">
                        <td className="px-3 py-2 whitespace-nowrap">
                          {new Date(s.created_at).toLocaleString('he-IL')}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{s.phone_masked}</td>
                        <td className="px-3 py-2">{s.final_status ?? '—'}</td>
                        <td className="px-3 py-2">{s.rating ?? '—'}</td>
                        <td className="px-3 py-2 max-w-[200px] truncate" title={s.feedback_text ?? ''}>
                          {s.feedback_text ?? '—'}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            className="text-mda-red font-medium hover:underline"
                            onClick={() =>
                              setExpandedId((id) => (id === s.session_id ? null : s.session_id))
                            }
                          >
                            {expandedId === s.session_id ? 'סגור JSON' : 'answers_log'}
                          </button>
                        </td>
                      </tr>
                      {expandedId === s.session_id && (
                        <tr className="bg-gray-50">
                          <td colSpan={6} className="px-3 py-3">
                            <pre
                              className="text-xs overflow-x-auto max-h-[min(60vh,480px)] overflow-y-auto bg-gray-900 text-green-100 p-3 rounded-lg text-left"
                              dir="ltr"
                            >
                              {JSON.stringify(s.answers_log, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
              {sessions.length === 0 && !loading && (
                <p className="p-8 text-center text-gray-500">אין סשנים או שאין הרשאה לצפות.</p>
              )}
            </div>
            {nextCursor && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void loadSessions(nextCursor)}
                  className="px-6 py-2 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
                >
                  {loading ? 'טוען…' : 'עמוד הבא'}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="py-4 text-center text-xs text-gray-500">
        <a href="/" className="text-mda-red hover:underline">
          חזרה לאפליקציה
        </a>
      </footer>
    </div>
  );
};
