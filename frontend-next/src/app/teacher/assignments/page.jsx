"use client";
import { useState, useEffect } from 'react';
import AppShell from '../../../components/AppShell';
import { getAssignments, createAssignment, getSubmissions, gradeSubmission, getClasses } from '../../../lib/api';

const SUBJECTS = ["Mathematics", "Physics", "Chemistry", "Computer Science", "Electronics", "Data Structures", "Machine Learning", "Signals & Systems", "Biology", "English", "Other"];

export default function TeacherAssignmentsPage() {
    const [assignments, setAssignments] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [selectedA, setSelectedA] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [grading, setGrading] = useState({});  // submissionId -> {grade, feedback}
    const [form, setForm] = useState({ title: '', subject: '', description: '', due_date: '', max_marks: 100, class_id: '' });
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { load(); }, []);

    const load = async () => {
        const [asgns, cls] = await Promise.all([getAssignments(), getClasses()]);
        setAssignments(asgns || []);
        setClasses(cls || []);
        setLoading(false);
    };

    const openAssignment = async a => {
        setSelectedA(a);
        const subs = await getSubmissions(a.id);
        setSubmissions(subs || []);
    };

    const handleCreate = async e => {
        e.preventDefault();
        setCreating(true);
        setError('');
        try {
            await createAssignment({ ...form, max_marks: Number(form.max_marks), class_id: form.class_id ? Number(form.class_id) : null });
            setShowCreate(false);
            setForm({ title: '', subject: '', description: '', due_date: '', max_marks: 100, class_id: '' });
            await load();
        } catch (err) { setError(err.message || 'Failed'); }
        setCreating(false);
    };

    const handleGrade = async (sub) => {
        const g = grading[sub.id];
        if (!g?.grade) return;
        await gradeSubmission(selectedA.id, sub.id, Number(g.grade), g.feedback || '');
        const subs = await getSubmissions(selectedA.id);
        setSubmissions(subs || []);
    };

    const inputCls = "w-full px-4 py-3 bg-dark-bg/50 border border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-dark-text placeholder-dark-muted text-sm";

    return (
        <AppShell>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Assignments</h1>
                        <p className="text-dark-muted text-sm mt-1">Create and grade assignments</p>
                    </div>
                    <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        New Assignment
                    </button>
                </div>

                {/* Create modal */}
                {showCreate && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="glass-panel-heavy p-6 w-full max-w-lg animate-fade-in max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-5">
                                <h2 className="text-lg font-bold text-white">Create Assignment</h2>
                                <button onClick={() => { setShowCreate(false); setError(''); }} className="text-dark-muted hover:text-white">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl">{error}</div>}
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wide mb-1.5">Title *</label>
                                    <input type="text" className={inputCls} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Assignment title" required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wide mb-1.5">Subject *</label>
                                        <select className={inputCls} value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} required>
                                            <option value="">Select...</option>
                                            {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wide mb-1.5">Max Marks</label>
                                        <input type="number" className={inputCls} value={form.max_marks} min={1} onChange={e => setForm(p => ({ ...p, max_marks: e.target.value }))} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wide mb-1.5">Due Date</label>
                                        <input type="datetime-local" className={inputCls} value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wide mb-1.5">Class (optional)</label>
                                        <select className={inputCls} value={form.class_id} onChange={e => setForm(p => ({ ...p, class_id: e.target.value }))}>
                                            <option value="">All students</option>
                                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wide mb-1.5">Description / Instructions *</label>
                                    <textarea className={inputCls + " min-h-[100px] resize-none"} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe the assignment..." required />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="submit" disabled={creating} className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2">
                                        {creating && <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                                        Create
                                    </button>
                                    <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary px-5">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Submissions modal */}
                {selectedA && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="glass-panel-heavy w-full max-w-3xl flex flex-col max-h-[85vh] animate-fade-in">
                            <div className="flex items-center justify-between p-5 border-b border-dark-border/50">
                                <div>
                                    <h2 className="text-base font-bold text-white">{selectedA.title}</h2>
                                    <p className="text-xs text-dark-muted">{submissions.length} submission{submissions.length !== 1 ? 's' : ''} • Max {selectedA.max_marks} pts</p>
                                </div>
                                <button onClick={() => setSelectedA(null)} className="text-dark-muted hover:text-white">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                {submissions.length === 0 ? (
                                    <p className="text-center text-dark-muted text-sm py-8">No submissions yet.</p>
                                ) : submissions.map(sub => (
                                    <div key={sub.id} className="glass-panel p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold text-white">{sub.student_username}</p>
                                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${sub.status === 'graded' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' : 'text-blue-400 bg-blue-400/10 border-blue-400/30'}`}>{sub.status}</span>
                                        </div>
                                        <p className="text-xs text-dark-muted whitespace-pre-wrap line-clamp-3">{sub.submission_text}</p>
                                        {sub.status === 'graded' ? (
                                            <div className="flex items-center gap-3 text-xs">
                                                <span className="text-emerald-400 font-bold">Grade: {sub.grade}/{selectedA.max_marks}</span>
                                                {sub.feedback && <span className="text-dark-muted">{sub.feedback}</span>}
                                            </div>
                                        ) : (
                                            <div className="flex gap-2 items-end">
                                                <div className="w-24">
                                                    <label className="text-xs text-dark-muted mb-1 block">Grade</label>
                                                    <input type="number" min={0} max={selectedA.max_marks} placeholder="Score"
                                                        className="w-full px-3 py-2 bg-dark-bg/50 border border-dark-border rounded-lg text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                                        value={grading[sub.id]?.grade || ''}
                                                        onChange={e => setGrading(p => ({ ...p, [sub.id]: { ...p[sub.id], grade: e.target.value } }))} />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-xs text-dark-muted mb-1 block">Feedback</label>
                                                    <input type="text" placeholder="Optional feedback..."
                                                        className="w-full px-3 py-2 bg-dark-bg/50 border border-dark-border rounded-lg text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                                        value={grading[sub.id]?.feedback || ''}
                                                        onChange={e => setGrading(p => ({ ...p, [sub.id]: { ...p[sub.id], feedback: e.target.value } }))} />
                                                </div>
                                                <button onClick={() => handleGrade(sub)} className="btn-primary py-2 px-4 text-sm">Grade</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Assignments grid */}
                {loading ? (
                    <div className="text-center py-20 text-dark-muted">Loading...</div>
                ) : assignments.length === 0 ? (
                    <div className="glass-panel p-12 text-center">
                        <p className="text-dark-muted text-sm">No assignments yet. Create your first one!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {assignments.map(a => (
                            <div key={a.id} onClick={() => openAssignment(a)} className="glass-panel p-5 cursor-pointer hover:border-primary-500/30 transition-all flex flex-col gap-3">
                                <div className="flex items-start justify-between gap-2">
                                    <h3 className="text-white font-semibold text-sm">{a.title}</h3>
                                    <span className="text-xs text-dark-muted flex-shrink-0">{a.submission_count || 0} sub.</span>
                                </div>
                                <span className="text-xs text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-full w-fit">{a.subject}</span>
                                <p className="text-xs text-dark-muted line-clamp-2 flex-1">{a.description}</p>
                                <div className="flex items-center justify-between text-xs pt-2 border-t border-dark-border/40">
                                    <span className="text-dark-muted">{a.max_marks} pts</span>
                                    {a.due_date && <span className="text-dark-muted">{new Date(a.due_date).toLocaleDateString()}</span>}
                                </div>
                                {(a.graded_count > 0 || a.submission_count > 0) && (
                                    <div className="flex items-center gap-2 text-xs">
                                        <div className="flex-1 h-1.5 bg-dark-border rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${a.submission_count > 0 ? (a.graded_count / a.submission_count) * 100 : 0}%` }} />
                                        </div>
                                        <span className="text-dark-muted">{a.graded_count}/{a.submission_count} graded</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppShell>
    );
}
