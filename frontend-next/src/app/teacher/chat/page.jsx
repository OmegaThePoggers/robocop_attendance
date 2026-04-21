"use client";
import { useState, useEffect, useRef } from 'react';
import AppShell from '../../../components/AppShell';
import { getChatContacts, getChatMessages, sendChatMessage } from '../../../lib/api';
import { jwtDecode } from 'jwt-decode';

export default function TeacherChatPage() {
    const [contacts, setContacts] = useState([]);
    const [selected, setSelected] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [username, setUsername] = useState('');
    const endRef = useRef(null);
    const pollRef = useRef(null);

    useEffect(() => {
        try { const t = localStorage.getItem('token'); if (t) setUsername(jwtDecode(t).sub || ''); } catch {}
        (async () => { setContacts(await getChatContacts()); })();
    }, []);

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    useEffect(() => {
        if (!selected) { clearInterval(pollRef.current); return; }
        const load = async () => { setMessages((await getChatMessages(selected.username)) || []); };
        load();
        pollRef.current = setInterval(load, 5000);
        return () => clearInterval(pollRef.current);
    }, [selected]);

    const handleSend = async e => {
        e.preventDefault();
        if (!input.trim() || !selected || sending) return;
        setSending(true);
        const text = input.trim();
        setInput('');
        await sendChatMessage(selected.username, text);
        setMessages((await getChatMessages(selected.username)) || []);
        setSending(false);
    };

    return (
        <AppShell>
            <div className="h-[calc(100vh-140px)] flex gap-4">
                {/* Contacts */}
                <div className="w-64 flex-shrink-0 glass-panel flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-dark-border/50">
                        <h2 className="text-sm font-bold text-white">Students</h2>
                        <p className="text-xs text-dark-muted mt-0.5">{contacts.length} contacts</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {contacts.map(c => (
                            <button key={c.username} onClick={() => setSelected(c)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${selected?.username === c.username ? 'bg-primary-600/20 border border-primary-500/30' : 'hover:bg-dark-border/30 border border-transparent'}`}>
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600/30 to-primary-800/30 flex items-center justify-center text-primary-400 font-bold text-sm flex-shrink-0">
                                    {(c.full_name || c.username)[0].toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-medium text-white truncate">{c.full_name || c.username}</p>
                                    <p className="text-[10px] text-dark-muted">{c.course || 'Student'}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Chat */}
                <div className="flex-1 flex flex-col glass-panel overflow-hidden">
                    <div className="px-5 py-4 border-b border-dark-border/50">
                        {selected ? (
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600/30 to-primary-800/30 border border-primary-500/20 flex items-center justify-center text-primary-400 font-bold">
                                    {(selected.full_name || selected.username)[0].toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">{selected.full_name || selected.username}</p>
                                    <p className="text-xs text-dark-muted">{selected.department || 'Student'}</p>
                                </div>
                            </div>
                        ) : <p className="text-sm text-dark-muted">Select a student to start chatting</p>}
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-3">
                        {!selected ? (
                            <div className="h-full flex items-center justify-center text-dark-muted text-sm">Select a student to start chatting</div>
                        ) : messages.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-dark-muted text-sm">No messages yet.</div>
                        ) : messages.map(m => (
                            <div key={m.id} className={`flex ${m.sender === username ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm ${m.sender === username ? 'bg-primary-600/20 text-white border border-primary-500/30 rounded-br-md' : 'bg-dark-border/40 text-dark-text border border-dark-border rounded-bl-md'}`}>
                                    <p className="whitespace-pre-wrap">{m.text}</p>
                                    <p className="text-[10px] opacity-50 mt-1">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>
                        ))}
                        <div ref={endRef} />
                    </div>

                    {selected && (
                        <form onSubmit={handleSend} className="p-4 border-t border-dark-border/50 flex gap-3">
                            <input value={input} onChange={e => setInput(e.target.value)}
                                placeholder={`Message ${selected.full_name || selected.username}...`}
                                className="flex-1 px-4 py-2.5 bg-dark-bg/50 border border-dark-border rounded-xl text-sm text-dark-text placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
                            <button type="submit" disabled={sending || !input.trim()} className="btn-primary px-5 py-2.5">Send</button>
                        </form>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
