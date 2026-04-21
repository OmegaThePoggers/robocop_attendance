"use client";
import { useState, useEffect } from 'react';
import AppShell from '../../../components/AppShell';
import { getNotifications, markNotifRead, markAllNotifsRead } from '../../../lib/api';

const TYPE_ICONS = {
    attendance: { d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', color: 'text-blue-400 bg-blue-400/10' },
    doubt: { d: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-purple-400 bg-purple-400/10' },
    announcement: { d: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z', color: 'text-amber-400 bg-amber-400/10' },
    assignment: { d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'text-emerald-400 bg-emerald-400/10' },
    marks: { d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: 'text-primary-400 bg-primary-400/10' },
};

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationsPage() {
    const [notifs, setNotifs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        const data = await getNotifications();
        setNotifs(data || []);
        setLoading(false);
    };

    const handleRead = async (id) => {
        await markNotifRead(id);
        setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    };

    const handleReadAll = async () => {
        await markAllNotifsRead();
        setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    const unread = notifs.filter(n => !n.is_read).length;

    return (
        <AppShell>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Notifications</h1>
                        <p className="text-dark-muted text-sm mt-1">{unread > 0 ? `${unread} unread notification${unread !== 1 ? 's' : ''}` : 'All caught up!'}</p>
                    </div>
                    {unread > 0 && (
                        <button onClick={handleReadAll} className="btn-secondary text-sm px-4 py-2">Mark all read</button>
                    )}
                </div>

                {loading ? (
                    <div className="text-center py-20 text-dark-muted">Loading...</div>
                ) : notifs.length === 0 ? (
                    <div className="glass-panel p-12 text-center">
                        <svg className="w-12 h-12 text-dark-border mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        <p className="text-dark-muted text-sm">No notifications yet.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {notifs.map(n => {
                            const typeInfo = TYPE_ICONS[n.type] || TYPE_ICONS.announcement;
                            return (
                                <div key={n.id} onClick={() => !n.is_read && handleRead(n.id)}
                                    className={`glass-panel p-4 flex items-start gap-4 transition-all cursor-pointer
                                        ${!n.is_read ? 'border-primary-500/20 bg-primary-500/5' : 'opacity-70'}
                                        ${n.is_urgent ? 'border-l-2 border-l-red-500' : ''}
                                        hover:border-primary-500/30`}>
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${typeInfo.color}`}>
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={typeInfo.d} /></svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className={`text-sm font-semibold ${!n.is_read ? 'text-white' : 'text-dark-muted'}`}>{n.title}</p>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {n.is_urgent && <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-medium">Urgent</span>}
                                                {!n.is_read && <span className="w-2 h-2 bg-primary-500 rounded-full" />}
                                            </div>
                                        </div>
                                        <p className="text-xs text-dark-muted mt-0.5 leading-relaxed">{n.message}</p>
                                        <p className="text-[10px] text-dark-border mt-1.5">{timeAgo(n.created_at)}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </AppShell>
    );
}
