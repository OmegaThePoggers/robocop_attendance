"use client";
import { useState, useEffect, useRef } from 'react';
import AppShell from '../../../components/AppShell';
import { getAllDoubts, getDoubtMessages, replyToDoubt, resolveDoubt } from '../../../lib/api';

const STATUS_COLORS = {
    queued: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
    in_progress: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
    resolved: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
};

export default function TeacherDoubtsPage() {
    const [doubts, setDoubts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [messages, setMessages] = useState([]);
    const [reply, setReply] = useState('');
    const [filter, setFilter] = useState('all');
    const endRef = useRef(null);

    useEffect(() => { load(); }, []);
    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const load = async () => {
        const data = await getAllDoubts();
        setDoubts(data || []);
        setLoading(false);
    };

    const openDoubt = async d => {
        setSelected(d);
        const msgs = await getDoubtMessages(d.id);
        setMessages(msgs || []);
    };

    const handleReply = async e => {
        e.preventDefault();
        if (!reply.trim() || !selected) return;
        await replyToDoubt(selected.id, reply);
        setReply('');
        const msgs = await getDoubtMessages(selected.id);
        setMessages(msgs || []);
        await load();
    };

    const handleResolve = async () => {
        if (!selected) return;
        await resolveDoubt(selected.id, '');
        setSelected(null);
        await load();
    };

    const filtered = doubts.filter(d => filter === 'all' || d.status === filter);
    const counts = { all: doubts.length, queued: doubts.filter(d => d.status === 'queued').length, in_progress: doubts.filter(d => d.status === 'in_progress').length, resolved: doubts.filter(d => d.status === 'resolved').length };

    return (
        <AppShell>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Doubt Management</h1>
                    <p className="text-dark-muted text-sm mt-1">Review and respond to student doubts</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[['All', 'all', 'text-white'], ['Queued', 'queued', 'text-amber-400'], ['In Progress', 'in_progress', 'text-blue-400'], ['Resolved', 'resolved', 'text-emerald-400']].map(([label, key, color]) => (
                        <button key={key} onClick={() => setFilter(key)}
                            className={`glass-panel p-4 text-center transition-all ${filter === key ? 'border-primary-500/40' : ''}`}>
                            <p className={`text-2xl font-bold ${color}`}>{counts[key]}</p>
                            <p className="text-xs text-dark-muted mt-1">{label}</p>
                        </button>
                    ))}
                </div>

                {/* Thread modal */}
                {selected && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="glass-panel-heavy w-full max-w-2xl flex flex-col h-[75vh] animate-fade-in">
                            <div className="flex items-start justify-between p-5 border-b border-dark-border/50">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-white">{selected.text}</p>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[selected.status]}`}>{selected.status}</span>
                                        {selected.subject && <span className="text-xs text-primary-400">{selected.subject}</span>}
                                        <span className="text-xs text-dark-muted">from {selected.student_username}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                                    {selected.status !== 'resolved' && (
                                        <button onClick={handleResolve} className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg hover:bg-emerald-500/30 transition-colors">Mark Resolved</button>
                                    )}
                                    <button onClick={() => setSelected(null)} className="text-dark-muted hover:text-white">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-5 space-y-3">
                                {messages.map(m => (
                                    <div key={m.id} className={`flex ${m.role === 'teacher' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                                            m.role === 'teacher' ? 'bg-primary-600/20 text-white border border-primary-500/30 rounded-br-md'
                                            : m.role === 'ai' ? 'bg-purple-500/10 text-purple-200 border border-purple-500/30 rounded-bl-md'
                                            : 'bg-dark-border/40 text-dark-text border border-dark-border/50 rounded-bl-md'
                                        }`}>
                                            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60 mb-1">
                                                {m.role === 'ai' ? 'Cogni AI' : m.role === 'teacher' ? 'You' : m.sender}
                                            </p>
                                            <p className="whitespace-pre-wrap">{m.text}</p>
                                        </div>
                                    </div>
                                ))}
                                {messages.length === 0 && <p className="text-center text-dark-muted text-sm py-8">No messages yet. Be the first to respond!</p>}
                                <div ref={endRef} />
                            </div>
                            {selected.status !== 'resolved' && (
                                <form onSubmit={handleReply} className="p-4 border-t border-dark-border/50 flex gap-3">
                                    <input value={reply} onChange={e => setReply(e.target.value)} placeholder="Type your response..."
                                        className="flex-1 px-4 py-2.5 bg-dark-bg/50 border border-dark-border rounded-xl text-sm text-dark-text placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
                                    <button type="submit" className="btn-primary px-4 py-2.5">Reply</button>
                                </form>
                            )}
                        </div>
                    </div>
                )}

                {/* Doubts list */}
                {loading ? (
                    <div className="text-center py-20 text-dark-muted">Loading...</div>
                ) : filtered.length === 0 ? (
                    <div className="glass-panel p-12 text-center">
                        <p className="text-dark-muted text-sm">No doubts in this category.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map(d => (
                            <div key={d.id} onClick={() => openDoubt(d)} className="glass-panel p-4 cursor-pointer hover:border-primary-500/30 transition-all">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-white font-medium text-sm">{d.text}</p>
                                        <div className="flex items-center gap-3 mt-2 flex-wrap text-xs">
                                            {d.subject && <span className="text-primary-400">{d.subject}</span>}
                                            <span className="text-dark-muted">from <strong className="text-white">{d.student_username}</strong></span>
                                            {d.confidence && <span className="text-dark-muted">AI confidence: {Math.round(d.confidence * 100)}%</span>}
                                            {d.unread_count > 0 && <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">{d.unread_count} new</span>}
                                        </div>
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
