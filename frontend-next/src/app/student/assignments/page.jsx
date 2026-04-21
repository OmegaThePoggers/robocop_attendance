"use client";
import { useState, useEffect } from 'react';
import AppShell from '../../../components/AppShell';
import { getAssignments, submitAssignment } from '../../../lib/api';

const STATUS_COLORS = {
    pending: 'text-dark-muted bg-dark-border/30 border-dark-border',
    submitted: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
    graded: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
};

export default function StudentAssignmentsPage() {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [submissionText, setSubmissionText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        const data = await getAssignments();
        setAssignments(data || []);
        setLoading(false);
    };

    const handleSubmit = async e => {
        e.preventDefault();
        if (!submissionText.trim()) return;
        setSubmitting(true);
        setError('');
        try {
            await submitAssignment(selected.id, submissionText);
            setSuccess('Submitted successfully!');
            setSubmissionText('');
            await load();
            setTimeout(() => { setSelected(null); setSuccess(''); }, 1500);
        } catch (err) {
            setError(err.message || 'Submission failed');
        } finally {
            setSubmitting(false);
        }
    };

    const isOverdue = dueDate => dueDate && new Date(dueDate) < new Date();
    const daysLeft = dueDate => {
        if (!dueDate) return null;
        const diff = Math.ceil((new Date(dueDate) - new Date()) / 86400000);
        return diff;
    };

    return (
        <AppShell>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Assignments</h1>
                    <p className="text-dark-muted text-sm mt-1">View and submit your assignments</p>
                </div>

                {/* Submission Modal */}
                {selected && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="glass-panel-heavy p-6 w-full max-w-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-start mb-5">
                                <div>
                                    <h2 className="text-lg font-bold text-white">{selected.title}</h2>
                                    <p className="text-sm text-primary-400">{selected.subject}</p>
                                </div>
                                <button onClick={() => { setSelected(null); setError(''); setSuccess(''); }} className="text-dark-muted hover:text-white">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="p-4 bg-dark-bg/40 rounded-xl border border-dark-border/50 mb-5">
                                <p className="text-sm text-dark-text whitespace-pre-wrap leading-relaxed">{selected.description}</p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                                <Stat label="Max Marks" value={`${selected.max_marks} pts`} />
                                <Stat label="Due Date" value={selected.due_date ? new Date(selected.due_date).toLocaleDateString() : 'No deadline'} />
                                <Stat label="Teacher" value={selected.teacher_username} />
                            </div>

                            {selected.my_submission?.status === 'graded' ? (
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
                                    <p className="text-emerald-400 font-semibold text-sm">Graded</p>
                                    <p className="text-white">Score: <strong>{selected.my_submission.grade}/{selected.max_marks}</strong></p>
                                    {selected.my_submission.feedback && <p className="text-dark-muted text-sm">{selected.my_submission.feedback}</p>}
                                </div>
                            ) : selected.my_submission?.status === 'submitted' ? (
                                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                                    <p className="text-blue-400 font-semibold text-sm">Submitted — awaiting review</p>
                                    <p className="text-dark-muted text-xs mt-1 line-clamp-3">{selected.my_submission.submission_text}</p>
                                </div>
                            ) : (
                                <>
                                    {error && <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl">{error}</div>}
                                    {success && <div className="mb-3 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-xl">{success}</div>}
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wide mb-1.5">Your Answer *</label>
                                            <textarea value={submissionText} onChange={e => setSubmissionText(e.target.value)}
                                                className="w-full px-4 py-3 bg-dark-bg/50 border border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-dark-text placeholder-dark-muted text-sm min-h-[150px] resize-none"
                                                placeholder="Write your answer here..." />
                                        </div>
                                        <button type="submit" disabled={submitting || !submissionText.trim()} className="w-full btn-primary py-3 flex items-center justify-center gap-2">
                                            {submitting ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : null}
                                            Submit Assignment
                                        </button>
                                    </form>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-20 text-dark-muted">Loading...</div>
                ) : assignments.length === 0 ? (
                    <div className="glass-panel p-12 text-center">
                        <svg className="w-12 h-12 text-dark-border mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <p className="text-dark-muted text-sm">No assignments yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {assignments.map(a => {
                            const days = daysLeft(a.due_date);
                            const sub = a.my_submission;
                            const status = sub?.status || 'pending';
                            return (
                                <div key={a.id} onClick={() => { setSelected(a); setError(''); setSuccess(''); }}
                                    className="glass-panel p-5 cursor-pointer hover:border-primary-500/30 transition-all hover:shadow-glow flex flex-col gap-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="text-white font-semibold text-sm leading-tight">{a.title}</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${STATUS_COLORS[status]}`}>{status}</span>
                                    </div>
                                    <span className="text-xs text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-full w-fit">{a.subject}</span>
                                    <p className="text-xs text-dark-muted line-clamp-2">{a.description}</p>
                                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-dark-border/40">
                                        <span className="text-xs text-dark-muted">{a.max_marks} pts</span>
                                        {a.due_date && (
                                            <span className={`text-xs font-medium ${isOverdue(a.due_date) && status === 'pending' ? 'text-red-400' : days !== null && days <= 2 ? 'text-amber-400' : 'text-dark-muted'}`}>
                                                {isOverdue(a.due_date) ? 'Overdue' : days === 0 ? 'Due today' : `${days}d left`}
                                            </span>
                                        )}
                                    </div>
                                    {sub?.status === 'graded' && (
                                        <div className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 text-center">
                                            Score: {sub.grade}/{a.max_marks}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </AppShell>
    );
}

function Stat({ label, value }) {
    return (
        <div className="p-3 bg-dark-bg/50 rounded-xl border border-dark-border/50">
            <p className="text-xs text-dark-muted mb-1">{label}</p>
            <p className="text-sm font-semibold text-white">{value}</p>
        </div>
    );
}
