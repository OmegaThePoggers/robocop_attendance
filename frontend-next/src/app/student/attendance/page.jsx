"use client";
import { useState, useEffect } from 'react';
import AppShell from '../../../components/AppShell';
import { getMyAttendance } from '../../../lib/api';

export default function StudentAttendancePage() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const data = await getMyAttendance();
            setRecords(data || []);
            setLoading(false);
        })();
    }, []);

    // Group by session
    const bySession = records.reduce((acc, r) => {
        const key = r.session_id || 'unknown';
        if (!acc[key]) acc[key] = [];
        acc[key].push(r);
        return acc;
    }, {});

    return (
        <AppShell>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Attendance History</h1>
                    <p className="text-dark-muted text-sm mt-1">Your biometric attendance records</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="glass-panel p-5 text-center">
                        <p className="text-3xl font-bold text-white">{records.length}</p>
                        <p className="text-xs text-dark-muted mt-1">Total Marked</p>
                    </div>
                    <div className="glass-panel p-5 text-center">
                        <p className="text-3xl font-bold text-emerald-400">{Object.keys(bySession).length}</p>
                        <p className="text-xs text-dark-muted mt-1">Sessions Attended</p>
                    </div>
                    <div className="glass-panel p-5 text-center">
                        <p className="text-3xl font-bold text-primary-400">
                            {records.length > 0 ? new Date(records[0].timestamp).toLocaleDateString() : '—'}
                        </p>
                        <p className="text-xs text-dark-muted mt-1">Last Marked</p>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-dark-muted">Loading...</div>
                ) : records.length === 0 ? (
                    <div className="glass-panel p-12 text-center">
                        <svg className="w-12 h-12 text-dark-border mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                        <p className="text-dark-muted text-sm">No attendance records yet. Attendance is marked via face recognition during sessions.</p>
                    </div>
                ) : (
                    <div className="glass-panel overflow-hidden">
                        <div className="p-4 border-b border-dark-border/50">
                            <h2 className="text-sm font-bold text-white">All Records</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-dark-border/40">
                                        {['Date & Time', 'Session ID', 'Method', 'Status'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-dark-muted uppercase tracking-wide">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-dark-border/30">
                                    {records.map(r => (
                                        <tr key={r.id} className="hover:bg-dark-border/10 transition-colors">
                                            <td className="px-4 py-3 text-white">{new Date(r.timestamp).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-dark-muted">#{r.session_id}</td>
                                            <td className="px-4 py-3 text-dark-muted capitalize">{r.source || 'face recognition'}</td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 px-2.5 py-1 rounded-full font-medium">Present</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
