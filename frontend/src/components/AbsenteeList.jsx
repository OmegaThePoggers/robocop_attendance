import { useEffect, useState } from 'react';
import { getAbsentees, manualMark, getActiveSession } from '../api';

export default function AbsenteeList() {
    const [absentees, setAbsentees] = useState([]);
    const [session, setSession] = useState(null);

    const fetchData = async () => {
        const data = await getAbsentees();
        setAbsentees(data);
        const sess = await getActiveSession();
        setSession(sess);
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleMark = async (name) => {
        if (!session) return;
        try {
            await manualMark(name, session.id);
            fetchData();
        } catch (e) {
            alert("Error updating record");
        }
    }

    return (
        <div className="bg-dark-bg/40 border-none rounded-xl overflow-hidden flex flex-col h-full relative">
            {/* Subtle red glow at the top for context */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500/0 via-rose-500/50 to-rose-500/0 opacity-50"></div>

            <div className="bg-dark-bg/80 px-5 py-4 border-b border-dark-border/50 flex justify-between items-center backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-rose-500/10 rounded-lg shrink-0">
                        <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    </div>
                    <h2 className="text-sm font-bold text-rose-400 uppercase tracking-widest">Absent Students</h2>
                    <span className="text-[10px] font-bold bg-rose-500/20 text-rose-400 px-2.5 py-0.5 rounded-full border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
                        {absentees.length}
                    </span>
                </div>
            </div>

            <div className="overflow-y-auto flex-1 p-3 space-y-3 custom-scrollbar">
                {absentees.map((name, index) => (
                    <div key={index} className="bg-dark-bg/60 border border-dark-border/80 rounded-lg p-4 hover:border-rose-500/30 hover:bg-rose-500/5 transition-all flex justify-between items-center group shadow-sm">
                        <div className="flex flex-col gap-1">
                            <span className="text-slate-200 text-sm font-medium group-hover:text-white transition-colors">
                                {name.replace('student_', '').replace(/^\d+_/, '').replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] text-dark-muted font-mono bg-dark-bg px-2 py-0.5 rounded w-fit border border-dark-border/50">
                                ID: {String(index + 100).padStart(4, '0')}
                            </span>
                        </div>

                        <button
                            onClick={() => handleMark(name)}
                            disabled={!session}
                            className="btn-outline px-4 py-2 border-dark-border text-dark-muted hover:border-success hover:text-success hover:bg-success/10 disabled:opacity-30 disabled:cursor-not-allowed group-hover:shadow-[0_0_10px_rgba(34,197,94,0.1)] flex items-center gap-2"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            Mark Present
                        </button>
                    </div>
                ))}

                {absentees.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-dark-muted py-16 animate-fade-in">
                        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4 text-success shadow-[0_0_20px_rgba(34,197,94,0.1)]">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <div className="text-sm font-medium text-slate-300">All students present</div>
                        <div className="text-xs opacity-60 mt-1">100% Attendance Rate</div>
                    </div>
                )}
            </div>
        </div>
    );
}
