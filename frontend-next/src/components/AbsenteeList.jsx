"use client";

import { useEffect, useState } from 'react';
import { getAbsentees, manualMark, getActiveSession } from '../lib/api';

export default function AbsenteeList({ updateTrigger }) {
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
    }, [updateTrigger]);

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
        <div className="bg-background border-none overflow-hidden flex flex-col h-full relative text-textMain">
            <div className="bg-surface px-4 py-3 border-b border-border flex justify-between items-center sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <h2 className="text-xs font-mono text-danger uppercase tracking-tight">Missing Targets</h2>
                    <span className="text-[10px] font-mono bg-border text-textMain px-2 py-0.5 rounded">
                        {absentees.length}
                    </span>
                </div>
            </div>

            <div className="overflow-y-auto flex-1 p-2 space-y-2 custom-scrollbar">
                {absentees.map((name, index) => (
                    <div key={index} className="bg-surface border border-border rounded p-3 hover:border-danger hover:bg-surfaceHover transition-colors flex justify-between items-center group">
                        <div className="flex flex-col gap-1">
                            <span className="text-textMain text-sm font-mono truncate max-w-[150px]">
                                {name.replace('student_', '').replace(/^\d+_/, '').replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] text-textMuted font-mono">
                                REF: {String(index + 100).padStart(4, '0')}
                            </span>
                        </div>

                        <button
                            onClick={() => handleMark(name)}
                            disabled={!session}
                            className="bg-transparent hover:bg-success hover:border-success hover:text-background text-xs font-mono text-textMuted border border-border px-3 py-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-tight rounded"
                        >
                            Mark Present
                        </button>
                    </div>
                ))}

                {absentees.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center py-16 text-textMuted">
                        <div className="text-sm font-mono uppercase tracking-widest text-success">All Targets Acquired</div>
                        <div className="text-xs opacity-60 mt-1 font-mono">100% Attendance</div>
                    </div>
                )}
            </div>
        </div>
    );
}
