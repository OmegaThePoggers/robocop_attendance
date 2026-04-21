"use client";
import { useState, useEffect } from 'react';
import AppShell from '../../../components/AppShell';
import { getMe, updateProfile } from '../../../lib/api';

export default function StudentProfilePage() {
    const [user, setUser] = useState(null);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        (async () => {
            const data = await getMe();
            setUser(data);
            setForm({
                full_name: data?.full_name || '',
                email: data?.email || '',
                department: data?.department || '',
                course: data?.course || '',
                roll_number: data?.roll_number || '',
            });
            setLoading(false);
        })();
    }, []);

    const handleSave = async e => {
        e.preventDefault();
        setSaving(true);
        try {
            const updated = await updateProfile(form);
            setUser(updated);
            setEditing(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (_) {}
        setSaving(false);
    };

    const inputCls = "w-full px-4 py-2.5 bg-dark-bg/50 border border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 text-dark-text placeholder-dark-muted text-sm";
    const readCls = "px-4 py-2.5 bg-dark-bg/30 border border-dark-border/40 rounded-xl text-sm text-dark-text min-h-[44px] flex items-center";

    if (loading) return <AppShell><div className="text-center py-20 text-dark-muted">Loading...</div></AppShell>;

    return (
        <AppShell>
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Profile</h1>
                        <p className="text-dark-muted text-sm mt-1">Your academic profile</p>
                    </div>
                    {!editing && (
                        <button onClick={() => setEditing(true)} className="btn-secondary text-sm px-4 py-2 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            Edit
                        </button>
                    )}
                </div>

                {/* Avatar & role */}
                <div className="glass-panel p-6 flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/30 to-primary-800/30 border border-primary-500/20 flex items-center justify-center text-primary-400 text-3xl font-bold flex-shrink-0">
                        {user?.full_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">{user?.full_name || user?.username}</h2>
                        <p className="text-sm text-dark-muted capitalize">{user?.role} • {user?.department || 'No department'}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                            <span className="text-xs text-emerald-400">Active</span>
                        </div>
                    </div>
                </div>

                {saved && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-xl flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Profile updated successfully
                    </div>
                )}

                <div className="glass-panel p-6 space-y-5">
                    <h3 className="text-sm font-bold text-white border-b border-dark-border/50 pb-3">Personal Information</h3>
                    <form onSubmit={handleSave} className="space-y-4">
                        <Field label="Full Name" editing={editing} readCls={readCls} inputCls={inputCls}
                            value={editing ? form.full_name : user?.full_name || '—'}
                            onChange={v => setForm(p => ({ ...p, full_name: v }))} />
                        <Field label="Email" editing={editing} readCls={readCls} inputCls={inputCls}
                            value={editing ? form.email : user?.email || '—'} type="email"
                            onChange={v => setForm(p => ({ ...p, email: v }))} />
                        <Field label="Department" editing={editing} readCls={readCls} inputCls={inputCls}
                            value={editing ? form.department : user?.department || '—'}
                            onChange={v => setForm(p => ({ ...p, department: v }))} />
                        <Field label="Course / Program" editing={editing} readCls={readCls} inputCls={inputCls}
                            value={editing ? form.course : user?.course || '—'}
                            onChange={v => setForm(p => ({ ...p, course: v }))} />
                        <Field label="Roll Number" editing={editing} readCls={readCls} inputCls={inputCls}
                            value={editing ? form.roll_number : user?.roll_number || '—'}
                            onChange={v => setForm(p => ({ ...p, roll_number: v }))} />
                        {editing && (
                            <div className="flex gap-3 pt-2">
                                <button type="submit" disabled={saving} className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2">
                                    {saving && <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                                    Save Changes
                                </button>
                                <button type="button" onClick={() => setEditing(false)} className="btn-secondary px-5">Cancel</button>
                            </div>
                        )}
                    </form>
                </div>

                {/* Read-only academic IDs */}
                <div className="glass-panel p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white border-b border-dark-border/50 pb-3">Academic IDs</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {[['Username', user?.username], ['SAP ID', user?.sap_id], ['Class', user?.class_id ? `Class ${user.class_id}` : 'Unassigned']].map(([l, v]) => (
                            <div key={l}>
                                <p className="text-xs text-dark-muted uppercase tracking-wide mb-1">{l}</p>
                                <p className="text-sm text-white font-medium">{v || '—'}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </AppShell>
    );
}

function Field({ label, editing, readCls, inputCls, value, onChange, type = 'text' }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wide mb-1.5">{label}</label>
            {editing
                ? <input type={type} className={inputCls} value={value} onChange={e => onChange(e.target.value)} />
                : <div className={readCls}>{value}</div>
            }
        </div>
    );
}
