"use client";
import { useState, useEffect, useRef } from 'react';
import AppShell from '../../../components/AppShell';
import { getMyDoubts, submitDoubt, getDoubtMessages, replyToDoubt, resolveDoubt } from '../../../lib/api';

const STATUS_COLORS = {
    queued: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
    in_progress: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
    resolved: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
};

const SUBJECTS = ["Mathematics", "Physics", "Chemistry", "Computer Science", "Electronics", "Data Structures", "Machine Learning", "Signals & Systems", "Biology", "English", "Other"];

export default function StudentDoubtsPage() {
    const [doubts, setDoubts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAsk, setShowAsk] = useState(false);
    const [selectedDoubt, setSelectedDoubt] = useState(null);
    const [messages, setMessages] = useState([]);
    const [replyText, setReplyText] = useState('');
    const [newDoubt, setNewDoubt] = useState({ text: '', subject: '', autoSolve: true });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => { load(); }, []);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const load = async () => {
        setLoading(true);
        const data = await getMyDoubts();
        setDoubts(data || []);
        setLoading(false);
    };

    const openDoubt = async (doubt) => {
        setSelectedDoubt(doubt);
        const msgs = await getDoubtMessages(doubt.id);
        setMessages(msgs || []);
    };

    const handleAskDoubt = async e => {
        e.preventDefault();
        if (!newDoubt.text.trim()) return;
        setSubmitting(true);
        setError('');
        try {
            await submitDoubt(newDoubt.text, newDoubt.subject || null, newDoubt.autoSolve);
            setShowAsk(false);
            setNewDoubt({ text: '', subject: '', autoSolve: true });
            await load();
        } catch (err) {
            setError(err.message || 'Failed to submit doubt');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReply = async e => {
        e.preventDefault();
        if (!replyText.trim() || !selectedDoubt) return;
        await replyToDoubt(selectedDoubt.id, replyText);
        setReplyText('');
        const msgs = await getDoubtMessages(selectedDoubt.id);
        setMessages(msgs || []);
    };

    const inputCls = "w-full px-4 py-3 bg-dark-bg/50 border border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 text-dark-text placeholder-dark-muted text-sm";

    return (
        <AppShell>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">My Doubts</h1>
                        <p className="text-dark-muted text-sm mt-1">Ask questions — AI classifies and routes to the right teacher</p>
                    </div>
                    <button onClick={() => setShowAsk(true)} className="btn-primary flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Ask Doubt
                    </button>
                </div>

                {/* Ask Doubt Modal */}
                {showAsk && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="glass-panel-heavy p-6 w-full max-w-lg animate-fade-in">
                            <div className="flex justify-between items-center mb-5">
                                <h2 className="text-lg font-bold text-white">Ask a Doubt</h2>
                                <button onClick={() => setShowAsk(false)} className="text-dark-muted hover:text-white">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl">{error}</div>}
                            <form onSubmit={handleAskDoubt} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wide mb-1.5">Your Question *</label>
                                    <textarea className={inputCls + " min-h-[100px] resize-none"} value={newDoubt.text}
                                        placeholder="Describe your doubt clearly..." onChange={e => setNewDoubt(p => ({ ...p, text: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wide mb-1.5">Subject (optional — AI will auto-detect)</label>
                                    <select className={inputCls} value={newDoubt.subject} onChange={e => setNewDoubt(p => ({ ...p, subject: e.target.value }))}>
                                        <option value="">Auto-detect</option>
                                        {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" checked={newDoubt.autoSolve} onChange={e => setNewDoubt(p => ({ ...p, autoSolve: e.target.checked }))}
                                        className="w-4 h-4 accent-primary-500 rounded" />
                                    <span className="text-sm text-dark-muted">Get instant AI answer while waiting for teacher</span>
                                </label>
                                <div className="flex gap-3 pt-2">
                                    <button type="submit" disabled={submitting || !newDoubt.text.trim()} className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2">
                                        {submitting ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : null}
                                        Submit Doubt
                                    </button>
                                    <button type="button" onClick={() => setShowAsk(false)} className="btn-secondary px-5">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Doubt Thread */}
                {selectedDoubt && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
                        <div className="glass-panel-heavy w-full max-w-2xl flex flex-col h-[80vh] sm:h-[70vh] animate-slide-up">
                            <div className="flex items-center justify-between p-5 border-b border-dark-border/50">
                                <div className="min-w-0">
                                    <h2 className="text-base font-bold text-white truncate">{selectedDoubt.text.slice(0, 60)}...</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[selectedDoubt.status]}`}>{selectedDoubt.status}</span>
                                        {selectedDoubt.subject && <span className="text-xs text-dark-muted">{selectedDoubt.subject}</span>}
                                    </div>
                                </div>
                                <button onClick={() => setSelectedDoubt(null)} className="text-dark-muted hover:text-white ml-3 flex-shrink-0">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-5 space-y-3">
                                {messages.map(m => (
                                    <div key={m.id} className={`flex ${m.role === 'student' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                                            m.role === 'student' ? 'bg-primary-600/20 text-white border border-primary-500/30 rounded-br-md'
                                            : m.role === 'ai' ? 'bg-purple-500/10 text-purple-200 border border-purple-500/30 rounded-bl-md'
                                            : 'bg-dark-border/40 text-dark-text border border-dark-border/50 rounded-bl-md'
                                        }`}>
                                            {m.role !== 'student' && <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60 mb-1">{m.role === 'ai' ? 'Cogni AI' : m.sender}</p>}
                                            <p className="whitespace-pre-wrap">{m.text}</p>
                                        </div>
                                    </div>
                                ))}
                                {messages.length === 0 && (
                                    <div className="text-center py-8 text-dark-muted text-sm">No messages yet. Your teacher will respond shortly.</div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                            {selectedDoubt.status !== 'resolved' && (
                                <form onSubmit={handleReply} className="p-4 border-t border-dark-border/50 flex gap-3">
                                    <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Add a follow-up..." className="flex-1 px-4 py-2.5 bg-dark-bg/50 border border-dark-border rounded-xl text-sm text-dark-text placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
                                    <button type="submit" className="btn-primary px-4 py-2.5">Send</button>
                                </form>
                            )}
                        </div>
                    </div>
                )}

                {/* Doubts list */}
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-dark-muted">Loading...</div>
                ) : doubts.length === 0 ? (
                    <div className="glass-panel p-12 text-center">
                        <svg className="w-12 h-12 text-dark-border mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <p className="text-dark-muted text-sm">No doubts yet. Click "Ask Doubt" to get started!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {doubts.map(d => (
                            <div key={d.id} onClick={() => openDoubt(d)}
                                className="glass-panel p-4 cursor-pointer hover:border-primary-500/30 transition-all hover:shadow-glow">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-white font-medium text-sm truncate">{d.text}</p>
                                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                                            {d.subject && <span className="text-xs text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-full">{d.subject}</span>}
                                            {d.confidence && <span className="text-xs text-dark-muted">AI confidence: {Math.round(d.confidence * 100)}%</span>}
                                            {d.teacher_username && <span className="text-xs text-dark-muted">→ {d.teacher_username}</span>}
                                            {d.message_count > 0 && <span className="text-xs text-dark-muted">{d.message_count} message{d.message_count !== 1 ? 's' : ''}</span>}
                                        </div>
                                        {d.ai_answer && <p className="text-xs text-purple-300 mt-2 line-clamp-2">AI: {d.ai_answer}</p>}
                                    </div>
                                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[d.status]}`}>{d.status}</span>
                                        <span className="text-xs text-dark-muted">{new Date(d.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppShell>
    );
}
