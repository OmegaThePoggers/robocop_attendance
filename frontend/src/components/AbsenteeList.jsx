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
        <div className="bg-slate-950 border border-slate-700 rounded-lg overflow-hidden flex flex-col h-full shadow-md">
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-red-400 uppercase tracking-wide">Absent Students</h2>
                    <span className="text-[10px] bg-red-400/10 text-red-400 px-2 py-0.5 rounded-full border border-red-400/20">{absentees.length}</span>
                </div>
            </div>

            <div className="overflow-y-auto flex-1 p-2 space-y-2">
                {absentees.map((name, index) => (
                    <div key={index} className="bg-slate-900/50 border border-slate-800 rounded p-3 hover:bg-slate-800/80 transition-all flex justify-between items-center group">
                        <div className="flex flex-col">
                            <span className="text-slate-200 text-sm font-medium">
                                {name.replace('student_', '').replace(/^\d+_/, '').replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] text-slate-500 uppercase">Student ID: {index + 100}</span>
                        </div>

                        <button
                            onClick={() => handleMark(name)}
                            disabled={!session}
                            className="px-3 py-1 bg-slate-800 hover:bg-primary/20 text-slate-400 hover:text-primary border border-slate-700 hover:border-primary/50 text-[10px] font-bold uppercase rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            Mark Present
                        </button>
                    </div>
                ))}

                {absentees.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
                        <div className="text-xl mb-2">✓</div>
                        <div className="text-xs">All students present</div>
                    </div>
                )}
            </div>
        </div>
    );
}
