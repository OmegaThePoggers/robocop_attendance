"use client";
import { useState, useEffect } from 'react';
import AppShell from '../../../components/AppShell';
import { getAllDoubts, getAllUsers, getAssignments } from '../../../lib/api';

export default function AdminAnalyticsPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const [doubts, users, assignments] = await Promise.all([
                getAllDoubts(), getAllUsers(), getAssignments()
            ]);
            const students = users.filter(u => u.role === 'student');
            const teachers = users.filter(u => u.role === 'teacher');

            // Doubt subject distribution
            const subjectDist = doubts.reduce((acc, d) => {
                const key = d.subject || 'Unknown';
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {});

            // Doubt status distribution
            const statusDist = { queued: 0, in_progress: 0, resolved: 0 };
            doubts.forEach(d => { if (statusDist[d.status] !== undefined) statusDist[d.status]++; });

            // Teacher load
            const teacherLoad = teachers.map(t => ({
                name: t.full_name || t.username,
                active: doubts.filter(d => d.teacher_username === t.username && d.status !== 'resolved').length,
                total: doubts.filter(d => d.teacher_username === t.username).length,
            }));

            setData({ students, teachers, doubts, assignments, subjectDist, statusDist, teacherLoad });
            setLoading(false);
        })();
    }, []);

    if (loading) return <AppShell><div className="text-center py-20 text-dark-muted">Loading analytics...</div></AppShell>;

    const maxSubjectCount = Math.max(...Object.values(data.subjectDist), 1);

    return (
        <AppShell>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Platform Analytics</h1>
                    <p className="text-dark-muted text-sm mt-1">System-wide usage statistics</p>
                </div>

                {/* Overview */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'Students', value: data.students.length, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', color: 'text-primary-400' },
                        { label: 'Teachers', value: data.teachers.length, icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', color: 'text-emerald-400' },
                        { label: 'Doubts', value: data.doubts.length, icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-purple-400' },
                        { label: 'Assignments', value: data.assignments.length, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'text-amber-400' },
                    ].map(s => (
                        <div key={s.label} className="glass-panel p-5 flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl bg-dark-border/30 flex items-center justify-center flex-shrink-0 ${s.color}`}>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={s.icon} /></svg>
                            </div>
                            <div>
                                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                                <p className="text-xs text-dark-muted">{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Doubt status */}
                    <div className="glass-panel p-5">
                        <h2 className="text-sm font-bold text-white mb-4">Doubt Status Distribution</h2>
                        <div className="space-y-3">
                            {[['queued', 'Queued', 'bg-amber-500'], ['in_progress', 'In Progress', 'bg-blue-500'], ['resolved', 'Resolved', 'bg-emerald-500']].map(([key, label, color]) => {
                                const count = data.statusDist[key];
                                const pct = data.doubts.length > 0 ? (count / data.doubts.length) * 100 : 0;
                                return (
                                    <div key={key}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-dark-muted">{label}</span>
                                            <span className="text-white font-medium">{count} ({Math.round(pct)}%)</span>
                                        </div>
                                        <div className="h-2 bg-dark-border rounded-full overflow-hidden">
                                            <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Subject distribution */}
                    <div className="glass-panel p-5">
                        <h2 className="text-sm font-bold text-white mb-4">Doubts by Subject</h2>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {Object.entries(data.subjectDist).sort(([, a], [, b]) => b - a).map(([subject, count]) => (
                                <div key={subject} className="flex items-center gap-3">
                                    <span className="text-xs text-dark-muted w-28 truncate flex-shrink-0">{subject}</span>
                                    <div className="flex-1 h-1.5 bg-dark-border rounded-full overflow-hidden">
                                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${(count / maxSubjectCount) * 100}%` }} />
                                    </div>
                                    <span className="text-xs font-bold text-white w-6 text-right">{count}</span>
                                </div>
                            ))}
                            {Object.keys(data.subjectDist).length === 0 && <p className="text-xs text-dark-muted">No doubt data yet.</p>}
                        </div>
                    </div>
                </div>

                {/* Teacher workload */}
                {data.teacherLoad.length > 0 && (
                    <div className="glass-panel p-5">
                        <h2 className="text-sm font-bold text-white mb-4">Teacher Workload</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {data.teacherLoad.map(t => (
                                <div key={t.name} className="p-4 bg-dark-bg/50 rounded-xl border border-dark-border/50">
                                    <p className="text-sm font-semibold text-white">{t.name}</p>
                                    <div className="flex items-center justify-between mt-2 text-xs">
                                        <span className="text-amber-400">{t.active} active</span>
                                        <span className="text-dark-muted">{t.total} total</span>
                                    </div>
                                    <div className="mt-2 h-1.5 bg-dark-border rounded-full overflow-hidden">
                                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${t.total > 0 ? (t.active / t.total) * 100 : 0}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
