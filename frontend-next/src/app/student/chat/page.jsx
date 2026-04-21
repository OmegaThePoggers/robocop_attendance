"use client";
import { useState, useEffect, useRef } from 'react';
import AppShell from '../../../components/AppShell';
import { getChatContacts, getChatMessages, sendChatMessage, sendAIChat } from '../../../lib/api';

export default function StudentChatPage() {
    const [contacts, setContacts] = useState([]);
    const [selected, setSelected] = useState(null);  // contact or null for AI
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [aiHistory, setAiHistory] = useState([]);
    const [tab, setTab] = useState('teachers'); // 'teachers' | 'ai'
    const endRef = useRef(null);
    const pollRef = useRef(null);

    useEffect(() => {
        (async () => { setContacts(await getChatContacts()); })();
    }, []);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, aiHistory]);

    useEffect(() => {
        if (!selected || tab !== 'teachers') {
            clearInterval(pollRef.current);
            return;
        }
        const load = async () => {
            const msgs = await getChatMessages(selected.username);
            setMessages(msgs || []);
        };
        load();
        pollRef.current = setInterval(load, 5000);
        return () => clearInterval(pollRef.current);
    }, [selected, tab]);

    const handleSend = async e => {
        e.preventDefault();
        if (!input.trim() || sending) return;
        setSending(true);
        const text = input.trim();
        setInput('');

        if (tab === 'ai') {
            const newHistory = [...aiHistory, { role: 'user', content: text }];
            setAiHistory(newHistory);
            try {
                const res = await sendAIChat(newHistory.map(m => ({ role: m.role, content: m.content })));
                setAiHistory([...newHistory, { role: 'assistant', content: res.response }]);
            } catch {
                setAiHistory([...newHistory, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
            }
        } else if (selected) {
            await sendChatMessage(selected.username, text);
            const msgs = await getChatMessages(selected.username);
            setMessages(msgs || []);
        }
        setSending(false);
    };

    const username = typeof window !== 'undefined' ? (() => {
        try { const t = localStorage.getItem('token'); if (!t) return ''; const { jwtDecode } = require('jwt-decode'); return jwtDecode(t).sub; } catch { return ''; }
    })() : '';

    return (
        <AppShell>
            <div className="h-[calc(100vh-140px)] flex gap-4">
                {/* Left panel */}
                <div className="w-64 flex-shrink-0 flex flex-col glass-panel overflow-hidden">
                    <div className="p-4 border-b border-dark-border/50">
                        <div className="flex bg-dark-bg p-1 rounded-xl border border-dark-border">
                            <button onClick={() => { setTab('teachers'); setSelected(null); }} className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${tab === 'teachers' ? 'bg-primary-600 text-white' : 'text-dark-muted hover:text-white'}`}>Teachers</button>
                            <button onClick={() => { setTab('ai'); setSelected(null); }} className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${tab === 'ai' ? 'bg-primary-600 text-white' : 'text-dark-muted hover:text-white'}`}>Cogni AI</button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {tab === 'teachers' ? contacts.map(c => (
                            <button key={c.username} onClick={() => setSelected(c)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${selected?.username === c.username ? 'bg-primary-600/20 border border-primary-500/30' : 'hover:bg-dark-border/30 border border-transparent'}`}>
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600/30 to-primary-800/30 flex items-center justify-center text-primary-400 font-bold text-sm flex-shrink-0">
                                    {c.full_name?.[0]?.toUpperCase() || c.username[0].toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-medium text-white truncate">{c.full_name || c.username}</p>
                                    <p className="text-[10px] text-dark-muted">{c.department || 'Teacher'}</p>
                                </div>
                            </button>
                        )) : (
                            <div className="p-3 text-center">
                                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                </div>
                                <p className="text-xs text-white font-semibold">Cogni AI</p>
                                <p className="text-[10px] text-dark-muted mt-1">Powered by Groq / Gemini</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat area */}
                <div className="flex-1 flex flex-col glass-panel overflow-hidden">
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-dark-border/50 flex items-center gap-3">
                        {tab === 'ai' ? (
                            <>
                                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">Cogni AI Assistant</p>
                                    <p className="text-xs text-purple-400">Always available</p>
                                </div>
                            </>
                        ) : selected ? (
                            <>
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600/30 to-primary-800/30 border border-primary-500/20 flex items-center justify-center text-primary-400 font-bold">
                                    {selected.full_name?.[0]?.toUpperCase() || selected.username[0].toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">{selected.full_name || selected.username}</p>
                                    <p className="text-xs text-dark-muted">{selected.department || 'Teacher'}</p>
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-dark-muted">Select a teacher to start chatting</p>
                        )}
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-3">
                        {tab === 'ai' ? (
                            aiHistory.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                                    <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                    </div>
                                    <p className="text-white font-semibold">Hi! I'm Cogni</p>
                                    <p className="text-dark-muted text-sm max-w-xs">Ask me anything about your studies, assignments, or schedule. I'm here to help!</p>
                                </div>
                            ) : aiHistory.map((m, i) => (
                                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-primary-600/20 text-white border border-primary-500/30 rounded-br-md' : 'bg-purple-500/10 text-purple-100 border border-purple-500/20 rounded-bl-md'}`}>
                                        {m.role === 'assistant' && <p className="text-[10px] font-semibold uppercase tracking-wide text-purple-400 mb-1">Cogni AI</p>}
                                        <p className="whitespace-pre-wrap">{m.content}</p>
                                    </div>
                                </div>
                            ))
                        ) : selected ? (
                            messages.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-dark-muted text-sm">No messages yet. Say hello!</div>
                            ) : messages.map(m => (
                                <div key={m.id} className={`flex ${m.sender === username ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm ${m.sender === username ? 'bg-primary-600/20 text-white border border-primary-500/30 rounded-br-md' : 'bg-dark-border/40 text-dark-text border border-dark-border rounded-bl-md'}`}>
                                        <p className="whitespace-pre-wrap">{m.text}</p>
                                        <p className="text-[10px] opacity-50 mt-1">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex items-center justify-center text-dark-muted text-sm">Select a contact to start chatting</div>
                        )}
                        <div ref={endRef} />
                    </div>

                    {/* Input */}
                    {(tab === 'ai' || selected) && (
                        <form onSubmit={handleSend} className="p-4 border-t border-dark-border/50 flex gap-3">
                            <input value={input} onChange={e => setInput(e.target.value)}
                                placeholder={tab === 'ai' ? 'Ask Cogni anything...' : `Message ${selected?.full_name || selected?.username}...`}
                                className="flex-1 px-4 py-2.5 bg-dark-bg/50 border border-dark-border rounded-xl text-sm text-dark-text placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
                            <button type="submit" disabled={sending || !input.trim()} className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${tab === 'ai' ? 'bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50' : 'btn-primary'}`}>
                                {sending ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : 'Send'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
