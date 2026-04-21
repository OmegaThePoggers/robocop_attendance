"use client";
import { useState, useEffect } from 'react';
import AppShell from '../../../components/AppShell';
import { getMyMarks } from '../../../lib/api';

const GRADE_COLORS = {
    'A+': 'text-emerald-400', 'A': 'text-emerald-400', 'B+': 'text-blue-400',
    'B': 'text-blue-400', 'C': 'text-amber-400', 'D': 'text-orange-400', 'F': 'text-red-400',
};

export default function StudentResultsPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeSem, setActiveSem] = useState(null);

    useEffect(() => {
        (async () => {
            const result = await getMyMarks();
            setData(result);
            if (result?.semesters?.length) setActiveSem(result.semesters[result.semesters.length - 1].semester);
            setLoading(false);
        })();
    }, []);

    if (loading) return <AppShell><div className="text-center py-20 text-dark-muted">Loading results...</div></AppShell>;

    const currentSem = data?.semesters?.find(s => s.semester === activeSem);

    return (
        <AppShell>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Academic Results</h1>
                    <p className="text-dark-muted text-sm mt-1">Semester-wise marks and grade points</p>
                </div>

                {!data || !data.semesters?.length ? (
                    <div className="glass-panel p-12 text-center">
                        <svg className="w-12 h-12 text-dark-border mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        <p className="text-dark-muted text-sm">No results published yet. Check back after your exams.</p>
                    </div>
                ) : (
                    <>
                        {/* CGPA Card */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="glass-panel p-5 sm:col-span-1 flex flex-col items-center justify-center text-center">
                                <p className="text-xs font-semibold text-dark-muted uppercase tracking-wide mb-2">Cumulative GPA</p>
                                <p className="text-5xl font-bold text-primary-400">{data.cgpa.toFixed(2)}</p>
                                <p className="text-xs text-dark-muted mt-1">out of 10.0</p>
                            </div>
                            <div className="glass-panel p-5 sm:col-span-2">
                                <p className="text-xs font-semibold text-dark-muted uppercase tracking-wide mb-3">Semester-wise SGPA</p>
                                <div className="space-y-2">
                                    {data.semesters.map(s => (
                                        <div key={s.semester} className="flex items-center gap-3">
                                            <span className="text-xs text-dark-muted w-16 flex-shrink-0">Sem {s.semester}</span>
                                            <div className="flex-1 h-2 bg-dark-border rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full" style={{ width: `${(s.sgpa / 10) * 100}%` }} />
                                            </div>
                                            <span className="text-xs font-bold text-white w-10 text-right">{s.sgpa}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Semester tabs */}
                        <div className="flex gap-2 flex-wrap">
                            {data.semesters.map(s => (
                                <button key={s.semester} onClick={() => setActiveSem(s.semester)}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${activeSem === s.semester ? 'bg-primary-600/20 text-primary-400 border-primary-500/40' : 'text-dark-muted border-dark-border hover:text-white hover:bg-dark-border/40'}`}>
                                    Semester {s.semester}
                                </button>
                            ))}
                        </div>

                        {/* Marks table */}
                        {currentSem && (
                            <div className="glass-panel overflow-hidden">
                                <div className="p-4 border-b border-dark-border/50 flex items-center justify-between">
                                    <h2 className="text-sm font-bold text-white">Semester {currentSem.semester} — SGPA: {currentSem.sgpa}</h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-dark-border/40">
                                                {['Subject', 'Internal', 'External', 'Practical', 'Total', '%', 'Grade'].map(h => (
                                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-dark-muted uppercase tracking-wide">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-dark-border/30">
                                            {currentSem.subjects.map(m => (
                                                <tr key={m.id} className="hover:bg-dark-border/10 transition-colors">
                                                    <td className="px-4 py-3 text-white font-medium">{m.subject}</td>
                                                    <td className="px-4 py-3 text-dark-muted">{m.internal_marks ?? '-'}</td>
                                                    <td className="px-4 py-3 text-dark-muted">{m.external_marks ?? '-'}</td>
                                                    <td className="px-4 py-3 text-dark-muted">{m.practical_marks ?? '-'}</td>
                                                    <td className="px-4 py-3 text-white font-medium">{m.total}/{m.max_marks}</td>
                                                    <td className="px-4 py-3 text-dark-muted">{m.percentage}%</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`font-bold text-base ${GRADE_COLORS[m.grade] || 'text-white'}`}>{m.grade}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </AppShell>
    );
}
