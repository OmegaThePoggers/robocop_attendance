"use client";
import { useState, useEffect } from 'react';
import AppShell from '../../../components/AppShell';
import { getSchedule, createScheduleEntry, deleteScheduleEntry, getClasses } from '../../../lib/api';

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SUBJECTS = ["Mathematics", "Physics", "Chemistry", "Computer Science", "Electronics", "Data Structures", "Machine Learning", "Signals & Systems", "Biology", "English", "Other"];
const TYPE_COLORS = { lecture: 'text-primary-400 bg-primary-400/10 border-primary-400/30', lab: 'text-purple-400 bg-purple-400/10 border-purple-400/30', tutorial: 'text-amber-400 bg-amber-400/10 border-amber-400/30' };

export default function TeacherSchedulePage() {
    const [schedule, setSchedule] = useState([]);
    const [classes, setClasses] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ subject: '', day_of_week: 0, start_time: '09:00', end_time: '10:00', room: '', schedule_type: 'lecture', class_id: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => { load(); }, []);

    const load = async () => {
        const [sch, cls] = await Promise.all([getSchedule(), getClasses()]);
        setSchedule(sch || []);
        setClasses(cls || []);
        setLoading(false);
    };

    const handleCreate = async e => {
        e.preventDefault();
        setSaving(true);
        try {
            await createScheduleEntry({ ...form, day_of_week: Number(form.day_of_week), class_id: form.class_id ? Number(form.class_id) : null });
            setShowAdd(false);
            setForm({ subject: '', day_of_week: 0, start_time: '09:00', end_time: '10:00', room: '', schedule_type: 'lecture', class_id: '' });
            await load();
        } catch {}
        setSaving(false);
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        await deleteScheduleEntry(id);
        await load();
    };

    const inputCls = "w-full px-4 py-2.5 bg-dark-bg/50 border border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-dark-text placeholder-dark-muted text-sm";

    const grouped = DAYS.reduce((acc, _, i) => {
        acc[i] = schedule.filter(e => e.day_of_week === i).sort((a, b) => a.start_time.localeCompare(b.start_time));
        return acc;
    }, {});

    return (
        <AppShell>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Timetable</h1>
                        <p className="text-dark-muted text-sm mt-1">Manage your class schedule</p>
                    </div>
                    <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Add Class
                    </button>
                </div>

                {showAdd && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="glass-panel-heavy p-6 w-full max-w-lg animate-fade-in">
                            <div className="flex justify-between items-center mb-5">
                                <h2 className="text-lg font-bold text-white">Add Schedule Entry</h2>
                                <button onClick={() => setShowAdd(false)} className="text-dark-muted hover:text-white">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wide mb-1.5">Subject *</label>
                                        <select className={inputCls} value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} required>
                                            <option value="">Select...</option>
                                            {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wide mb-1.5">Day</label>
                                        <select className={inputCls} value={form.day_of_week} onChange={e => setForm(p => ({ ...p, day_of_week: e.target.value }))}>
                                            {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wide mb-1.5">Start Time</label>
                                        <input type="time" className={inputCls} value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wide mb-1.5">End Time</label>
                                        <input type="time" className={inputCls} value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wide mb-1.5">Room</label>
                                        <input type="text" className={inputCls} value={form.room} onChange={e => setForm(p => ({ ...p, room: e.target.value }))} placeholder="Room number" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wide mb-1.5">Type</label>
                                        <select className={inputCls} value={form.schedule_type} onChange={e => setForm(p => ({ ...p, schedule_type: e.target.value }))}>
                                            <option value="lecture">Lecture</option>
                                            <option value="lab">Lab</option>
                                            <option value="tutorial">Tutorial</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wide mb-1.5">Class (optional)</label>
                                    <select className={inputCls} value={form.class_id} onChange={e => setForm(p => ({ ...p, class_id: e.target.value }))}>
                                        <option value="">All classes</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="submit" disabled={saving} className="flex-1 btn-primary py-2.5">{saving ? 'Saving...' : 'Add Entry'}</button>
                                    <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary px-5">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {loading ? <div className="text-center py-20 text-dark-muted">Loading...</div> : (
                    <div className="space-y-4">
                        {DAYS.map((day, i) => (
                            <div key={day} className="glass-panel overflow-hidden">
                                <div className="px-5 py-3 border-b border-dark-border/40 flex justify-between items-center">
                                    <h3 className="font-semibold text-sm text-white">{day}</h3>
                                    <span className="text-xs text-dark-muted">{grouped[i].length} entr{grouped[i].length !== 1 ? 'ies' : 'y'}</span>
                                </div>
                                {grouped[i].length === 0 ? (
                                    <p className="px-5 py-3 text-xs text-dark-muted">No classes</p>
                                ) : grouped[i].map(e => (
                                    <div key={e.id} className="px-5 py-3 flex items-center gap-4 border-b border-dark-border/20 last:border-0">
                                        <span className="text-xs text-dark-muted font-mono w-24 flex-shrink-0">{e.start_time} – {e.end_time}</span>
                                        <div className="flex-1">
                                            <p className="text-sm text-white font-medium">{e.subject}</p>
                                            {e.room && <p className="text-xs text-dark-muted">Room {e.room}</p>}
                                        </div>
                                        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium capitalize ${TYPE_COLORS[e.schedule_type] || TYPE_COLORS.lecture}`}>{e.schedule_type}</span>
                                        <button onClick={ev => handleDelete(e.id, ev)} className="text-dark-muted hover:text-red-400 transition-colors">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppShell>
    );
}
