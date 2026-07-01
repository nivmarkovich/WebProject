'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

interface Volunteer {
  id: number;
  first_name: string;
  last_name: string;
  mobile_number: string;
  lora_id: string | null;
  has_defibrillator: boolean;
  has_lora: boolean;
  total_points: number;
  responses: number;
}

interface CmsPage {
  slug: string;
  title: string;
  content: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'volunteers' | 'cms'>('volunteers');
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminUsername, setAdminUsername] = useState('');

  // CMS state
  const [cmsPages, setCmsPages] = useState<CmsPage[]>([]);
  const [editingCms, setEditingCms] = useState<CmsPage | null>(null);
  const [cmsLoading, setCmsLoading] = useState(false);

  // Edit volunteer state
  const [editingVolunteer, setEditingVolunteer] = useState<Volunteer | null>(null);

  const checkAuth = useCallback(() => {
    const token = sessionStorage.getItem('accessToken');
    const username = sessionStorage.getItem('adminUsername');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    setAdminUsername(username || 'מנהל');
  }, [router]);

  useEffect(() => {
    checkAuth();
    fetchVolunteers();
    fetchCmsPages();
  }, [checkAuth]);

  const fetchVolunteers = async () => {
    try {
      const res = await fetch('/api/volunteers?limit=100');
      const data = await res.json();
      setVolunteers(data.volunteers || []);
    } catch (err) {
      console.error('Failed to fetch volunteers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCmsPages = async () => {
    const slugs = ['call-to-action', 'purchasing-guide', 'maintenance-info'];
    const pages: CmsPage[] = [];
    for (const slug of slugs) {
      try {
        const res = await fetch(`/api/cms/${slug}`);
        if (res.ok) {
          const data = await res.json();
          pages.push(data.page);
        }
      } catch {
        // Skip
      }
    }
    setCmsPages(pages);
  };

  const handleDeleteVolunteer = async (id: number) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק מתנדב זה?')) return;
    
    try {
      const res = await fetch(`/api/volunteers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setVolunteers(volunteers.filter((v) => v.id !== id));
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleUpdateVolunteer = async () => {
    if (!editingVolunteer) return;

    try {
      const res = await fetch(`/api/volunteers/${editingVolunteer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingVolunteer),
      });

      if (res.ok) {
        const data = await res.json();
        setVolunteers(
          volunteers.map((v) =>
            v.id === editingVolunteer.id ? { ...v, ...data.volunteer } : v
          )
        );
        setEditingVolunteer(null);
      }
    } catch (err) {
      console.error('Update error:', err);
    }
  };

  const handleSaveCms = async () => {
    if (!editingCms) return;
    setCmsLoading(true);

    try {
      const res = await fetch(`/api/cms/${editingCms.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingCms.title,
          content: editingCms.content,
        }),
      });

      if (res.ok) {
        setCmsPages(
          cmsPages.map((p) => (p.slug === editingCms.slug ? editingCms : p))
        );
        setEditingCms(null);
      }
    } catch (err) {
      console.error('CMS save error:', err);
    } finally {
      setCmsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const authServerUrl = process.env.NEXT_PUBLIC_AUTH_SERVER_URL || 'http://localhost:4000';
      await fetch(`${authServerUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Continue logout even if server call fails
    }
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('adminUsername');
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">🛠️ לוח בקרה</h1>
            <p className="text-slate-400 mt-1">שלום, <strong className="text-white">{adminUsername}</strong></p>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-2.5 glass-light hover:bg-red-500/10 hover:border-red-500/30 text-slate-300 hover:text-red-300 font-medium rounded-xl transition-all duration-300"
          >
            🚪 התנתק
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab('volunteers')}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
              activeTab === 'volunteers'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'glass-light text-slate-400 hover:text-white'
            }`}
          >
            👥 ניהול מתנדבים ({volunteers.length})
          </button>
          <button
            onClick={() => setActiveTab('cms')}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
              activeTab === 'cms'
                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                : 'glass-light text-slate-400 hover:text-white'
            }`}
          >
            📄 עריכת תוכן ({cmsPages.length})
          </button>
        </div>

        {/* Volunteers Tab */}
        {activeTab === 'volunteers' && (
          <div className="glass rounded-2xl overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-400">טוען מתנדבים...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white/5 text-slate-400">
                    <tr>
                      <th className="px-4 py-3 text-right font-medium">ID</th>
                      <th className="px-4 py-3 text-right font-medium">שם</th>
                      <th className="px-4 py-3 text-right font-medium">טלפון</th>
                      <th className="px-4 py-3 text-right font-medium">LoRa</th>
                      <th className="px-4 py-3 text-right font-medium">ציוד</th>
                      <th className="px-4 py-3 text-right font-medium">ניקוד</th>
                      <th className="px-4 py-3 text-right font-medium">פעולות</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {volunteers.map((vol) => (
                      <tr key={vol.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-slate-400">{vol.id}</td>
                        <td className="px-4 py-3 font-medium">
                          {vol.first_name} {vol.last_name || ''}
                        </td>
                        <td className="px-4 py-3 text-slate-300" dir="ltr">{vol.mobile_number}</td>
                        <td className="px-4 py-3">
                          {vol.lora_id ? (
                            <span className="badge badge-lora">{vol.lora_id}</span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {vol.has_defibrillator && <span title="דפיברילטור">🫀</span>}
                          {vol.has_lora && <span title="LoRa" className="mr-1">📡</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-cyan-400 font-medium">{vol.total_points || 0}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingVolunteer(vol)}
                              className="px-3 py-1 glass-light hover:bg-blue-500/10 rounded-lg text-xs text-blue-300 transition-colors"
                            >
                              ✏️ ערוך
                            </button>
                            <button
                              onClick={() => handleDeleteVolunteer(vol.id)}
                              className="px-3 py-1 glass-light hover:bg-red-500/10 rounded-lg text-xs text-red-300 transition-colors"
                            >
                              🗑️ מחק
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* CMS Tab */}
        {activeTab === 'cms' && (
          <div className="space-y-4">
            {cmsPages.map((page) => (
              <div key={page.slug} className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">{page.title}</h3>
                  <button
                    onClick={() => setEditingCms({ ...page })}
                    className="px-4 py-2 glass-light hover:bg-indigo-500/10 rounded-xl text-sm text-indigo-300 transition-colors"
                  >
                    ✏️ ערוך
                  </button>
                </div>
                <div className="text-sm text-slate-400 markdown-content">
                  <ReactMarkdown>{page.content}</ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Volunteer Modal */}
        {editingVolunteer && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass rounded-2xl p-8 w-full max-w-md">
              <h3 className="text-xl font-bold mb-6">✏️ עריכת מתנדב</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">שם פרטי</label>
                  <input
                    className="input-field"
                    value={editingVolunteer.first_name}
                    onChange={(e) =>
                      setEditingVolunteer({ ...editingVolunteer, first_name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">שם משפחה</label>
                  <input
                    className="input-field"
                    value={editingVolunteer.last_name || ''}
                    onChange={(e) =>
                      setEditingVolunteer({ ...editingVolunteer, last_name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">טלפון</label>
                  <input
                    className="input-field"
                    dir="ltr"
                    value={editingVolunteer.mobile_number}
                    onChange={(e) =>
                      setEditingVolunteer({ ...editingVolunteer, mobile_number: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">LoRa ID</label>
                  <input
                    className="input-field"
                    dir="ltr"
                    value={editingVolunteer.lora_id || ''}
                    onChange={(e) =>
                      setEditingVolunteer({ ...editingVolunteer, lora_id: e.target.value || null })
                    }
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleUpdateVolunteer}
                  className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl transition-all"
                >
                  💾 שמור
                </button>
                <button
                  onClick={() => setEditingVolunteer(null)}
                  className="flex-1 py-3 glass-light hover:bg-white/10 text-slate-300 rounded-xl transition-all"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit CMS Modal */}
        {editingCms && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass rounded-2xl p-8 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-6">📄 עריכת תוכן</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">כותרת</label>
                  <input
                    className="input-field"
                    value={editingCms.title}
                    onChange={(e) => setEditingCms({ ...editingCms, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">תוכן (Markdown)</label>
                  <textarea
                    className="input-field min-h-[300px] font-mono text-xs"
                    dir="rtl"
                    value={editingCms.content}
                    onChange={(e) => setEditingCms({ ...editingCms, content: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveCms}
                  disabled={cmsLoading}
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl transition-all"
                >
                  {cmsLoading ? 'שומר...' : '💾 שמור שינויים'}
                </button>
                <button
                  onClick={() => setEditingCms(null)}
                  className="flex-1 py-3 glass-light hover:bg-white/10 text-slate-300 rounded-xl transition-all"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
