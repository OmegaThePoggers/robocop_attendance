"use client";

import { useEffect, useState } from 'react';
import { getAttendance } from '../lib/api';

export default function AttendanceTable({ activeSession, updateTrigger }) {
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        const fetchLogs = async () => {
            const data = await getAttendance();
            setLogs(data);
        };

        fetchLogs();
        const interval = setInterval(fetchLogs, 3000);

        return () => clearInterval(interval);
    }, [updateTrigger]);

    const displayLogs = activeSession
        ? logs.filter(log => log.session_id === activeSession.id)
        : logs;

    return (
        <div className="bg-background border-none overflow-hidden flex flex-col h-full text-textMain">
            <div className="bg-surface px-4 py-3 border-b border-border flex justify-between items-center sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <h2 className="text-xs font-mono text-textMuted uppercase tracking-tight">
                        {activeSession ? 'Session Logs' : 'Global Logs'}
                    </h2>
                    <span className="text-[10px] font-mono bg-border text-textMain px-2 py-0.5 rounded">
                        {displayLogs.length}
                    </span>
                </div>
                {activeSession && (
                    <div className="flex items-center gap-2 text-xs font-mono text-textMuted uppercase">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                        </span>
                        SYNCING
                    </div>
                )}
            </div>

            <div className="overflow-y-auto flex-1 p-0 custom-scrollbar relative">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-surface z-10 border-b border-border">
                        <tr className="text-textMuted text-[10px] uppercase font-mono">
                            <th className="py-2 pl-4">ID</th>
                            <th className="py-2 break-all">Student</th>
                            <th className="py-2">Time</th>
                            <th className="py-2 pr-4 text-right">State</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {displayLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-surfaceHover transition-colors group">
                                <td className="py-2 pl-4 text-textMuted text-xs font-mono">#{String(log.id).padStart(5, '0')}</td>
                                <td className="py-2 text-textMain text-sm truncate max-w-[150px]">
                                    {log.student_name.replace('student_', '').replace(/^\d+_/, '').replace(/_/g, ' ')}
                                </td>
                                <td className="py-2 text-textMuted text-xs font-mono">
                                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </td>
                                <td className="py-2 pr-4 text-right">
                                    <span className="inline-flex text-[10px] font-mono text-success uppercase tracking-widest">
                                        VERIFIED
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {displayLogs.length === 0 && (
                            <tr>
                                <td colSpan="4">
                                    <div className="flex flex-col items-center justify-center py-12 text-textMuted">
                                        <p className="text-xs font-mono uppercase tracking-widest">Awaiting Datastream...</p>
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
