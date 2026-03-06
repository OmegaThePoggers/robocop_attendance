"use client";

import { useEffect, useState } from 'react';
import { getAttendance } from '../lib/api';

export default function AttendanceTable({ activeSession }) {
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        const fetchLogs = async () => {
            const data = await getAttendance();
            setLogs(data);
        };

        fetchLogs();
        const interval = setInterval(fetchLogs, 3000);

        return () => clearInterval(interval);
    }, []);

    // Filter logs by active session if one exists
    const displayLogs = activeSession
        ? logs.filter(log => log.session_id === activeSession.id)
        : logs;

    return (
        <div className="bg-dark-bg/40 border-none rounded-xl overflow-hidden flex flex-col h-full">
            <div className="bg-dark-bg/80 px-5 py-4 border-b border-dark-border/50 flex justify-between items-center backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-primary-500/20 rounded-lg shrink-0">
                        <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    </div>
                    <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">
                        {activeSession ? 'Session Check-ins' : 'Attendance Log'}
                    </h2>
                    <span className="text-[10px] font-bold bg-primary-500 text-white px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]">
                        {displayLogs.length}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-dark-muted font-medium bg-dark-bg px-3 py-1.5 rounded-full border border-dark-border/50">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                    </span>
                    Live Sync
                </div>
            </div>

            <div className="overflow-y-auto flex-1 p-0 custom-scrollbar relative">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-dark-bg/95 backdrop-blur-md z-10 shadow-[0_4px_10px_-4px_rgba(0,0,0,0.5)]">
                        <tr className="text-dark-muted border-b border-dark-border/50 text-[10px] uppercase tracking-widest font-bold">
                            <th className="py-3 pl-6">Record ID</th>
                            <th className="py-3">Student Name</th>
                            <th className="py-3">Timestamp</th>
                            <th className="py-3 pr-6 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-border/30">
                        {displayLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-primary-500/5 transition-colors group">
                                <td className="py-3 pl-6 text-dark-muted text-xs font-mono group-hover:text-primary-300 transition-colors">#{String(log.id).padStart(5, '0')}</td>
                                <td className="py-3 text-slate-200 text-sm font-medium">
                                    {log.student_name.replace('student_', '').replace(/^\d+_/, '').replace(/_/g, ' ')}
                                </td>
                                <td className="py-3 text-dark-muted text-xs font-mono opacity-80 group-hover:opacity-100">
                                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </td>
                                <td className="py-3 pr-6 text-right">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold bg-success/10 text-success rounded-md border border-success/20 w-fit ml-auto">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        Verified
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {displayLogs.length === 0 && (
                            <tr>
                                <td colSpan="4">
                                    <div className="flex flex-col items-center justify-center py-12 text-dark-muted">
                                        <svg className="w-8 h-8 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        <p className="text-sm font-medium text-slate-400">Waiting for attendance data...</p>
                                        <p className="text-xs opacity-70 mt-1">Logs will appear here in real-time</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
