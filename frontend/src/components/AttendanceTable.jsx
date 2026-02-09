import { useEffect, useState } from 'react';
import { getAttendance } from '../api';

export default function AttendanceTable() {
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

    return (
        <div className="bg-slate-950 border border-slate-700 rounded-lg overflow-hidden flex flex-col h-full shadow-md">
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide">Attendance Log</h2>
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">{logs.length} Records</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    Live Updates
                </div>
            </div>

            <div className="overflow-y-auto flex-1 p-0">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-950/90 backdrop-blur z-10">
                        <tr className="text-slate-500 border-b border-slate-800 text-[10px] uppercase tracking-wider">
                            <th className="py-2 pl-4 font-semibold">Record ID</th>
                            <th className="py-2 font-semibold">Student Name</th>
                            <th className="py-2 font-semibold">Time</th>
                            <th className="py-2 pr-4 text-right font-semibold">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {logs.map((log) => (
                            <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                <td className="py-2 pl-4 text-slate-500 text-xs font-mono">{log.id}</td>
                                <td className="py-2 text-slate-200 text-xs font-medium">
                                    {log.student_name.replace('student_', '').replace(/^\d+_/, '').replace(/_/g, ' ')}
                                </td>
                                <td className="py-2 text-slate-400 text-xs font-mono">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                </td>
                                <td className="py-2 pr-4 text-right">
                                    <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-green-500/10 text-green-500 rounded border border-green-500/20">
                                        Verified
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                            <tr>
                                <td colSpan="4" className="py-8 text-center text-slate-600 text-xs italic">
                                    Waiting for attendance data...
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
