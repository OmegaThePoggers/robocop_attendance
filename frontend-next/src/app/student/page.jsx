"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppShell from '../../components/AppShell';
import ProtectedRoute from '../../components/ProtectedRoute';
import StudentDashboard from '../../components/StudentDashboard';
import { getMyDoubts, getAssignments, getNotifications, getMyMarks, getMe } from '../../lib/api';

function QuickStat({ href, icon, label, value, sub, color = 'primary' }) {
    const colors = {
        primary: 'from-primary-500/20 to-primary-700/10 border-primary-500/20 text-primary-400',
        amber: 'from-amber-500/20 to-amber-700/10 border-amber-500/20 text-amber-400',
        emerald: 'from-emerald-500/20 to-emerald-700/10 border-emerald-500/20 text-emerald-400',
        purple: 'from-purple-500/20 to-purple-700/10 border-purple-500/20 text-purple-400',
        red: 'from-red-500/20 to-red-700/10 border-red-500/20 text-red-400',
    };
    return (
        <Link href={href} className={`block p-4 rounded-2xl border bg-gradient-to-br ${colors[color]} hover:scale-[1.02] transition-all duration-200 cursor-pointer`}>
            <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center flex-shrink-0`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={icon} /></svg>
                </div>
                <div className="min-w-0">
                    <p className="text-xl font-bold text-white leading-tight">{value}</p>
                    <p className="text-xs text-dark-muted">{label}</p>
                    {sub && <p className="text-[10px] mt-0.5 opacity-70">{sub}</p>}
                </div>
            </div>
        </Link>
    );
}

function QuickAction({ href, icon, label }) {
    return (
        <Link href={href} className="flex flex-col items-center gap-2 p-4 glass-panel rounded-2xl hover:border-primary-500/30 transition-all hover:shadow-glow group">
            <div className="w-10 h-10 rounded-xl bg-primary-600/10 border border-primary-500/20 flex items-center justify-center group-hover:bg-primary-600/20 transition-colors">
                <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={icon} /></svg>
            </div>
            <p className="text-xs font-medium text-dark-muted group-hover:text-white transition-colors text-center">{label}</p>
        </Link>
    );
}

export default function StudentPage() {
    const [stats, setStats] = useState({ doubts: 0, pendingDoubts: 0, assignments: 0, pendingAssignments: 0, unreadNotifs: 0, cgpa: null });
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const [doubts, assignments, notifs, marks, me] = await Promise.all([
                getMyDoubts(), getAssignments(), getNotifications(), getMyMarks(), getMe()
            ]);
            setUser(me);
            setStats({
                doubts: doubts?.length || 0,
                pendingDoubts: doubts?.filter(d => d.status !== 'resolved').length || 0,
                assignments: assignments?.length || 0,
                pendingAssignments: assignments?.filter(a => !a.my_submission || a.my_submission.status === 'pending').length || 0,
                unreadNotifs: notifs?.filter(n => !n.is_read).length || 0,
                cgpa: marks?.cgpa || null,
            });
            setLoading(false);
        })();
    }, []);

    return (
        <AppShell>
            <ProtectedRoute allowedRoles={['student']}>
                <div className="space-y-6">
                    {/* Welcome */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-white">
                                Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}!
                            </h1>
                            <p className="text-dark-muted text-sm mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                        {stats.unreadNotifs > 0 && (
                            <Link href="/student/notifications" className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium rounded-xl hover:bg-red-500/20 transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                {stats.unreadNotifs} unread
                            </Link>
                        )}
                    </div>

                    {/* Quick Stats — Cognify */}
                    {!loading && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <QuickStat href="/student/doubts" color="purple"
                                icon="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                value={stats.pendingDoubts} label="Open Doubts" sub={`${stats.doubts} total`} />
                            <QuickStat href="/student/assignments" color="amber"
                                icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                value={stats.pendingAssignments} label="Due Assignments" sub={`${stats.assignments} total`} />
                            <QuickStat href="/student/results" color="emerald"
                                icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                value={stats.cgpa !== null ? stats.cgpa.toFixed(2) : '—'} label="CGPA" sub="Cumulative" />
                            <QuickStat href="/student/notifications" color="red"
                                icon="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                                value={stats.unreadNotifs} label="Notifications" sub="Unread" />
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div>
                        <h2 className="text-sm font-semibold text-dark-muted uppercase tracking-wide mb-3">Quick Actions</h2>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                            <QuickAction href="/student/doubts" icon="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" label="Ask Doubt" />
                            <QuickAction href="/student/assignments" icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" label="Assignments" />
                            <QuickAction href="/student/schedule" icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" label="Schedule" />
                            <QuickAction href="/student/library" icon="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" label="Library" />
                            <QuickAction href="/student/chat" icon="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" label="Chat" />
                            <QuickAction href="/student/results" icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10" label="Results" />
                        </div>
                    </div>

                    {/* Separator */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-dark-border/50" />
                        <span className="text-xs text-dark-muted uppercase tracking-widest">Attendance</span>
                        <div className="flex-1 h-px bg-dark-border/50" />
                    </div>

                    {/* Original StudentDashboard — attendance, sessions, disputes */}
                    <StudentDashboard />
                </div>
            </ProtectedRoute>
        </AppShell>
    );
}
