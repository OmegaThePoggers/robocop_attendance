"use client";

import { useEffect, useState } from 'react';
import { getSessionHistory, getSessionReport } from '../lib/api';

export default function SessionHistory() {
    const [history, setHistory] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);
    const [report, setReport] = useState(null);

    const fetchHistory = async () => {
        const data = await getSessionHistory();
        setHistory(data);
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const handleRowClick = async (session) => {
        setSelectedSession(session);
        setReport(null);
        const data = await getSessionReport(session.id);
        setReport(data);
    };

    return (
        <div className="bg-background border-none overflow-hidden flex flex-col h-full relative text-textMain">
            <div className="bg-surface px-4 py-3 border-b border-border flex justify-between items-center sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <h2 className="text-xs font-mono text-textMuted uppercase tracking-tight">Archive Logs</h2>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-textMuted bg-border px-2 py-0.5 rounded font-mono">
                    {history.length} <span className="opacity-70">RECORDS</span>
                </div>
            </div>

            <div className="overflow-y-auto flex-1 p-0 custom-scrollbar relative">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-surface z-10 border-b border-border">
                        <tr className="text-textMuted text-[10px] uppercase font-mono tracking-widest">
                            <th className="py-2 pl-4">Session Name</th>
                            <th className="py-2">Date</th>
                            <th className="py-2 pr-4 text-right">Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {history.map((session) => (
                            <tr
                                key={session.id}
                                onClick={() => handleRowClick(session)}
                                className="hover:bg-surfaceHover transition-colors cursor-pointer group"
                            >
                                <td className="py-2 pl-4 text-textMain text-sm font-mono group-hover:text-accent transition-colors">
                                    <div className="flex items-center gap-2">
                                        <span className="text-textMuted font-mono">[{session.id}]</span> {session.name}
                                    </div>
                                </td>
                                <td className="py-2 text-textMuted text-xs font-mono">
                                    {new Date(session.created_at).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })}
                                </td>
                                <td className="py-2 text-textMuted text-xs font-mono text-right pr-4">
                                    <span className="bg-surface border border-border px-2 py-0.5 rounded">
                                        {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {history.length === 0 && (
                            <tr>
                                <td colSpan="3">
                                    <div className="flex flex-col items-center justify-center py-12 text-textMuted">
                                        <p className="text-xs font-mono uppercase tracking-widest">No Archival Data Found</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {selectedSession && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-background border border-border w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up rounded-sm shadow-2xl">
                        <div className="p-4 border-b border-border flex justify-between items-center bg-surface relative">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-border rounded-sm text-textMain font-mono font-bold text-xs uppercase tracking-tight">
                                    REP_{selectedSession.id}
                                </div>
                                <div>
                                    <h3 className="text-sm font-mono font-medium text-textMain uppercase tracking-tight">
                                        {selectedSession.name}
                                    </h3>
                                    <p className="text-[10px] text-textMuted font-mono mt-0.5">
                                        LOGGED: {new Date(selectedSession.created_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedSession(null)}
                                className="text-textMuted hover:text-danger text-xs font-mono transition-colors focus:outline-none"
                            >
                                [CLOSE]
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                            {!report ? (
                                <div className="flex flex-col items-center justify-center py-16 text-textMuted font-mono text-xs uppercase">
                                    <div className="mb-2">...Retrieving Data...</div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                                    {/* Summary Stats Card */}
                                    <div className="md:col-span-2 flex bg-surface border border-border rounded-sm p-3">
                                        <div className="flex-1 text-center border-r border-border">
                                            <div className="text-[10px] text-textMuted font-mono uppercase mb-1">Total Roster</div>
                                            <div className="text-xl font-mono text-textMain">{report.present.length + report.absent.length}</div>
                                        </div>
                                        <div className="flex-1 text-center border-r border-border">
                                            <div className="text-[10px] text-textMuted font-mono uppercase mb-1">Attendance Rate</div>
                                            <div className="text-xl font-mono text-success">
                                                {report.present.length + report.absent.length > 0
                                                    ? Math.round((report.present.length / (report.present.length + report.absent.length)) * 100)
                                                    : 0}%
                                            </div>
                                        </div>
                                        <div className="flex-1 text-center">
                                            <div className="text-[10px] text-textMuted font-mono uppercase mb-1">Missing</div>
                                            <div className="text-xl font-mono text-danger">{report.absent.length}</div>
                                        </div>
                                    </div>

                                    {/* Present List */}
                                    <div className="border border-border bg-surface rounded-sm p-4 flex flex-col max-h-80">
                                        <h4 className="text-success text-[10px] font-mono uppercase tracking-widest mb-3 flex justify-between items-center pb-2 border-b border-border">
                                            <span>VERIFIED</span>
                                            <span className="bg-success text-black px-1.5 py-0.5 rounded-sm">{report.present.length}</span>
                                        </h4>
                                        <div className="overflow-y-auto custom-scrollbar flex-1 pr-2">
                                            <ul className="space-y-1">
                                                {report.present.map(name => (
                                                    <li key={name} className="text-textMain font-mono text-xs flex items-center justify-between p-1.5 hover:bg-background transition-colors border border-transparent hover:border-border rounded-sm">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 bg-success rounded-full"></span>
                                                            {name.replace(/student_\d+_/, '').replace(/_/g, ' ')}
                                                        </div>
                                                    </li>
                                                ))}
                                                {report.present.length === 0 && (
                                                    <div className="flex flex-col items-center justify-center h-24 text-textMuted text-[10px] font-mono">
                                                        NO VERIFIED TARGETS
                                                    </div>
                                                )}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Absent List */}
                                    <div className="border border-border bg-surface rounded-sm p-4 flex flex-col max-h-80">
                                        <h4 className="text-danger text-[10px] font-mono uppercase tracking-widest mb-3 flex justify-between items-center pb-2 border-b border-border">
                                            <span>MISSING</span>
                                            <span className="bg-danger text-white px-1.5 py-0.5 rounded-sm">{report.absent.length}</span>
                                        </h4>
                                        <div className="overflow-y-auto custom-scrollbar flex-1 pr-2">
                                            <ul className="space-y-1">
                                                {report.absent.map(name => (
                                                    <li key={name} className="text-textMain font-mono text-xs flex items-center justify-between p-1.5 hover:bg-background transition-colors border border-transparent hover:border-border rounded-sm">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 bg-danger rounded-full"></span>
                                                            {name.replace(/student_\d+_/, '').replace(/_/g, ' ')}
                                                        </div>
                                                    </li>
                                                ))}
                                                {report.absent.length === 0 && (
                                                    <div className="flex flex-col items-center justify-center h-24 text-textMuted text-[10px] font-mono">
                                                        NO MISSING TARGETS
                                                    </div>
                                                )}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
