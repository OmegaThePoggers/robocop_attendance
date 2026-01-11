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
        const interval = setInterval(fetchLogs, 3000); // Poll every 3 seconds

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-robocop-800 rounded-xl border border-robocop-700 overflow-hidden shadow-lg h-full flex flex-col">
            <div className="bg-robocop-900 px-6 py-4 border-b border-robocop-700 flex justify-between items-center">
                <h2 className="text-xl font-bold text-robocop-400 tracking-wider uppercase">Live Activity Log</h2>
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-robocop-500 text-sm border-b border-robocop-700/50">
                            <th className="pb-3 pl-2 font-medium">ID</th>
                            <th className="pb-3 font-medium">STUDENT</th>
                            <th className="pb-3 font-medium">TIME</th>
                            <th className="pb-3 font-medium text-right pr-2">STATUS</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-robocop-700/30">
                        {logs.map((log) => (
                            <tr key={log.id} className="hover:bg-robocop-700/30 transition-colors">
                                <td className="py-3 pl-2 text-slate-400 font-mono text-xs">{log.id}</td>
                                <td className="py-3 font-medium text-slate-200">
                                    {log.student_name.replace('student_', '').replace(/^\d+_/, '').replace(/_/g, ' ')}
                                </td>
                                <td className="py-3 text-slate-400 text-sm">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                </td>
                                <td className="py-3 text-right pr-2">
                                    <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                                        VERIFIED
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                            <tr>
                                <td colSpan="4" className="py-8 text-center text-slate-500 italic">
                                    No activity recorded yet...
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
