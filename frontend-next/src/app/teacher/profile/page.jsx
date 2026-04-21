"use client";
import { useState, useEffect } from 'react';
import AppShell from '../../../components/AppShell';
import { getMe, updateProfile } from '../../../lib/api';

export default function TeacherProfilePage() {
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
            setForm({ full_name: data?.full_name || '', email: data?.email || '', department: data?.department || '' });
            setLoading(false);
        })();
    }, []);

    const handleSave = async e => {
        e.preventDefault();
        setSaving(true);
        const updated = await updateProfile(form);
        setUser(updated);
        setEditing(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        setSaving(false);
    };

    const inputCls = "w-full px-4 py-2.5 bg-dark-bg/50 border border-dark-border rounded-xl text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500/50";
    const readCls = "px-4 py-2.5 bg-dark-bg/30 border border-dark-border/40 rounded-xl text-sm text-dark-text";

    if (loading) return <AppShell><div className="text-center py-20 text-dark-muted">Loading...</div></AppShell>;

    return (
        <AppShell>
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div><h1 className="text-2xl font-bold text-white">Profile</h1><p className="text-dark-muted text-sm mt-1">Your teacher profile</p></div>
                    {!editing && <button onClick={() => setEditing(true)} className="btn-secondary text-sm px-4 py-2">Edit</button>}
                </div>
                <div className="glass-panel p-6 flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/30 to-primary-800/30 border border-primary-500/20 flex items-center justify-center text-primary-400 text-3xl font-bold">
                        {user?.full_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">{user?.full_name || user?.username}</h2>
                        <p className="text-sm text-dark-muted capitalize">{user?.role} • {user?.department || 'No department'}</p>
                        {user?.subjects?.length > 0 && <p className="text-xs text-primary-400 mt-1">{user.subjects.join(' • ')}</p>}
                    </div>
                </div>
                {saved && <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-xl">Profile updated!</div>}
                <div className="glass-panel p-6 space-y-5">
                    <h3 className="text-sm font-bold text-white border-b border-dark-border/50 pb-3">Information</h3>
                    <form onSubmit={handleSave} className="space-y-4">
                        {[['Full Name', 'full_name', 'text', 'John Smith'], ['Email', 'email', 'email', 'john@university.edu'], ['Department', 'department', 'text', 'Computer Science']].map(([label, key, type, placeholder]) => (
                            <div key={key}>
                                <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wide mb-1.5">{label}</label>
                                {editing
                                    ? <input type={type} className={inputCls} value={form[key]} placeholder={placeholder} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
                                    : <div className={readCls}>{user?.[key] || '—'}</div>}
                            </div>
                        ))}
                        {editing && (
                            <div className="flex gap-3 pt-2">
                                <button type="submit" disabled={saving} className="flex-1 btn-primary py-2.5">{saving ? 'Saving...' : 'Save'}</button>
                                <button type="button" onClick={() => setEditing(false)} className="btn-secondary px-5">Cancel</button>
                            </div>
                        )}
                    </form>
                </div>
                <div className="glass-panel p-6 space-y-3">
                    <h3 className="text-sm font-bold text-white border-b border-dark-border/50 pb-3">Teaching Info</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div><p className="text-xs text-dark-muted">Username</p><p className="text-sm text-white font-medium mt-0.5">{user?.username}</p></div>
                        <div><p className="text-xs text-dark-muted">Max Load</p><p className="text-sm text-white font-medium mt-0.5">{user?.max_load} doubts</p></div>
                        <div><p className="text-xs text-dark-muted">Teacher ID</p><p className="text-sm text-white font-medium mt-0.5">{user?.sap_id || '—'}</p></div>
                    </div>
                    {user?.subjects?.length > 0 && (
                        <div>
                            <p className="text-xs text-dark-muted mb-2">Subjects</p>
                            <div className="flex flex-wrap gap-2">
                                {user.subjects.map(s => <span key={s} className="text-xs text-primary-400 bg-primary-500/10 border border-primary-500/20 px-2.5 py-1 rounded-full">{s}</span>)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
