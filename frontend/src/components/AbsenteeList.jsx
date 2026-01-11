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
            // Refresh immediately
            fetchData();
        } catch (e) {
            alert("Failed to mark present");
        }
    }

    return (
        <div className="bg-robocop-800 rounded-xl border border-red-900/50 overflow-hidden shadow-lg h-full flex flex-col">
            <div className="bg-red-950/30 px-6 py-4 border-b border-red-900/30 flex justify-between items-center">
                <h2 className="text-xl font-bold text-red-500 tracking-wider uppercase">Missing Personnel</h2>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-red-400 font-mono">
                        {session ? `SESSION: ${session.name}` : 'NO ACTIVE SESSION'}
                    </span>
                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.6)]"></div>
                </div>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-red-400 text-sm border-b border-red-900/20">
                            <th className="pb-3 pl-2 font-medium">STUDENT ID</th>
                            <th className="pb-3 font-medium text-right pr-2">ACTION</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-red-900/10">
                        {absentees.map((name, index) => (
                            <tr key={index} className="hover:bg-red-900/10 transition-colors">
                                <td className="py-3 pl-2 font-medium text-red-200">
                                    {name.replace('student_', '').replace(/^\d+_/, '').replace(/_/g, ' ')}
                                </td>
                                <td className="py-3 text-right pr-2">
                                    <button
                                        onClick={() => handleMark(name)}
                                        disabled={!session}
                                        className="text-xs bg-red-500/20 hover:bg-red-500/40 text-red-200 px-3 py-1 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        MARK PRESENT
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {absentees.length === 0 && (
                            <tr>
                                <td colSpan="2" className="py-8 text-center text-green-500 italic">
                                    No absentees reported. All accounted for.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
