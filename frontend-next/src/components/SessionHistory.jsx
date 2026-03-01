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

    const formatDate = (dateString, timeOnly = false) => {
        if (!dateString) return '-';
        const d = new Date(dateString);
        return timeOnly ? d.toLocaleTimeString() : d.toLocaleString();
    };

    return (
        <div className="bg-dark-bg/40 border-none rounded-xl overflow-hidden flex flex-col h-full relative">
            <div className="bg-dark-bg/80 px-5 py-4 border-b border-dark-border/50 flex justify-between items-center backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-slate-800 rounded-lg shrink-0">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Archive Logs</h2>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-dark-muted font-medium bg-dark-bg px-2.5 py-1 rounded-full border border-dark-border/50 font-mono">
                    {history.length} <span className="opacity-70 font-sans">RECORDS</span>
                </div>
            </div>

            <div className="overflow-y-auto flex-1 p-0 custom-scrollbar relative">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-dark-bg/95 backdrop-blur-md z-10 shadow-[0_4px_10px_-4px_rgba(0,0,0,0.5)]">
                        <tr className="text-dark-muted border-b border-dark-border/50 text-[10px] uppercase tracking-widest font-bold">
                            <th className="py-3 pl-6">Session Name</th>
                            <th className="py-3">Date</th>
                            <th className="py-3 pr-6 text-right">Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-border/30">
                        {history.map((session) => (
                            <tr
                                key={session.id}
                                onClick={() => handleRowClick(session)}
                                className="hover:bg-primary-500/5 transition-colors cursor-pointer group"
                            >
                                <td className="py-3 pl-6 text-slate-200 text-sm font-medium group-hover:text-primary-400 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-3.5 h-3.5 text-dark-muted group-hover:text-primary-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        {session.name}
                                    </div>
                                </td>
                                <td className="py-3 text-dark-muted text-xs font-mono">
                                    {new Date(session.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                </td>
                                <td className="py-3 text-dark-muted text-xs font-mono text-right pr-6 group-hover:text-slate-300">
                                    <span className="bg-dark-bg border border-dark-border/50 px-2.5 py-1 rounded">
                                        {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {history.length === 0 && (
                            <tr>
                                <td colSpan="3">
                                    <div className="flex flex-col items-center justify-center py-12 text-dark-muted">
                                        <svg className="w-8 h-8 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                        <p className="text-sm font-medium">No recorded sessions found</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {selectedSession && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="glass-panel border-dark-border/80 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
                        <div className="p-5 border-b border-dark-border/50 flex justify-between items-center bg-dark-bg/50 backdrop-blur-md relative overflow-hidden">
                            {/* Accent highlight */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-600 via-primary-400 to-primary-600"></div>

                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary-500/20 rounded-lg text-primary-400">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white tracking-wide">
                                        {selectedSession.name}
                                    </h3>
                                    <p className="text-xs text-dark-muted font-mono mt-0.5">
                                        {new Date(selectedSession.created_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedSession(null)}
                                className="p-2 text-dark-muted hover:text-white hover:bg-white/10 rounded-full transition-colors focus:outline-none"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-dark-bg/80">
                            {!report ? (
                                <div className="flex flex-col items-center justify-center py-16 animate-pulse">
                                    <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mb-4"></div>
                                    <div className="text-sm text-dark-muted font-medium tracking-widest uppercase">Fetching Report Data...</div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                                    {/* Summary Stats Card */}
                                    <div className="md:col-span-2 flex gap-4 bg-dark-bg border border-dark-border/80 rounded-xl p-4 shadow-inner">
                                        <div className="flex-1 text-center border-r border-dark-border/50">
                                            <div className="text-xs text-dark-muted uppercase font-bold tracking-widest mb-1">Total Class</div>
                                            <div className="text-2xl font-light text-white">{report.present.length + report.absent.length}</div>
                                        </div>
                                        <div className="flex-1 text-center border-r border-dark-border/50">
                                            <div className="text-xs text-success/80 uppercase font-bold tracking-widest mb-1">Attendance</div>
                                            <div className="text-2xl font-bold text-success">
                                                {report.present.length + report.absent.length > 0
                                                    ? Math.round((report.present.length / (report.present.length + report.absent.length)) * 100)
                                                    : 0}%
                                            </div>
                                        </div>
                                        <div className="flex-1 text-center">
                                            <div className="text-xs text-rose-500/80 uppercase font-bold tracking-widest mb-1">Absent</div>
                                            <div className="text-2xl font-light text-rose-400">{report.absent.length}</div>
                                        </div>
                                    </div>

                                    {/* Present List */}
                                    <div className="border border-success/30 bg-success/5 rounded-xl p-5 shadow-[inset_0_0_20px_rgba(34,197,94,0.05)] flex flex-col max-h-80">
                                        <h4 className="text-success text-xs font-bold uppercase tracking-widest mb-4 flex justify-between items-center pb-3 border-b border-success/20">
                                            <div className="flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                Present
                                            </div>
                                            <span className="bg-success text-black px-2 py-0.5 rounded-full font-bold">{report.present.length}</span>
                                        </h4>
                                        <div className="overflow-y-auto custom-scrollbar flex-1 pr-2">
                                            <ul className="space-y-2">
                                                {report.present.map(name => (
                                                    <li key={name} className="text-slate-300 text-sm flex items-center justify-between p-2 rounded hover:bg-success/10 transition-colors border border-transparent hover:border-success/20">
                                                        <div className="flex items-center gap-3">
                                                            <span className="w-1.5 h-1.5 bg-success rounded-full shadow-[0_0_5px_rgba(34,197,94,0.8)]"></span>
                                                            {name.replace(/student_\d+_/, '').replace(/_/g, ' ')}
                                                        </div>
                                                    </li>
                                                ))}
                                                {report.present.length === 0 && (
                                                    <div className="flex flex-col items-center justify-center h-24 text-success/50 italic text-xs">
                                                        No students marked present
                                                    </div>
                                                )}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Absent List */}
                                    <div className="border border-rose-500/30 bg-rose-500/5 rounded-xl p-5 shadow-[inset_0_0_20px_rgba(244,63,94,0.05)] flex flex-col max-h-80">
                                        <h4 className="text-rose-400 text-xs font-bold uppercase tracking-widest mb-4 flex justify-between items-center pb-3 border-b border-rose-500/20">
                                            <div className="flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                Absent
                                            </div>
                                            <span className="bg-rose-500 text-white px-2 py-0.5 rounded-full font-bold shadow-[0_0_10px_rgba(244,63,94,0.3)]">{report.absent.length}</span>
                                        </h4>
                                        <div className="overflow-y-auto custom-scrollbar flex-1 pr-2">
                                            <ul className="space-y-2">
                                                {report.absent.map(name => (
                                                    <li key={name} className="text-slate-300 text-sm flex items-center justify-between p-2 rounded hover:bg-rose-500/10 transition-colors border border-transparent hover:border-rose-500/20">
                                                        <div className="flex items-center gap-3">
                                                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full shadow-[0_0_5px_rgba(244,63,94,0.8)]"></span>
                                                            {name.replace(/student_\d+_/, '').replace(/_/g, ' ')}
                                                        </div>
                                                    </li>
                                                ))}
                                                {report.absent.length === 0 && (
                                                    <div className="flex flex-col items-center justify-center h-24 text-rose-400/50 italic text-xs">
                                                        Everyone was present!
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
