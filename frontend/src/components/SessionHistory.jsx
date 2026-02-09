import { useEffect, useState } from 'react';
import { getSessionHistory, getSessionReport } from '../api';

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
        <div className="bg-slate-950 border border-slate-700 rounded-lg overflow-hidden flex flex-col h-full shadow-md">
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide">Archive Logs</h2>
                </div>
                <div className="text-[10px] text-slate-500 uppercase">Records: {history.length}</div>
            </div>

            <div className="overflow-y-auto flex-1 p-0">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-950 z-10">
                        <tr className="text-slate-500 text-[10px] uppercase border-b border-slate-800">
                            <th className="py-2 pl-4 font-semibold">Session Name</th>
                            <th className="py-2 font-semibold">Date</th>
                            <th className="py-2 font-semibold">Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {history.map((session) => (
                            <tr
                                key={session.id}
                                onClick={() => handleRowClick(session)}
                                className="hover:bg-primary/5 transition-colors cursor-pointer group"
                            >
                                <td className="py-2 pl-4 font-medium text-slate-300 group-hover:text-primary">
                                    {session.name}
                                </td>
                                <td className="py-2 text-slate-500 text-xs">
                                    {new Date(session.created_at).toLocaleDateString()}
                                </td>
                                <td className="py-2 text-slate-500 text-xs text-right pr-4">
                                    {new Date(session.created_at).toLocaleTimeString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {selectedSession && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90%] flex flex-col">
                        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-950 rounded-t-lg">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                                Session Report: {selectedSession.name}
                            </h3>
                            <button
                                onClick={() => setSelectedSession(null)}
                                className="text-slate-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            {!report ? (
                                <div className="text-center text-slate-500 py-8">Loading data...</div>
                            ) : (
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="border border-green-500/20 bg-green-500/5 rounded p-4">
                                        <h4 className="text-green-500 text-xs font-bold uppercase mb-3 flex justify-between">
                                            Present
                                            <span className="bg-green-500/20 px-2 rounded-full">{report.present.length}</span>
                                        </h4>
                                        <ul className="space-y-1 mt-2 max-h-60 overflow-y-auto">
                                            {report.present.map(name => (
                                                <li key={name} className="text-slate-300 text-xs flex items-center gap-2">
                                                    <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                                                    {name.replace(/student_\d+_/, '').replace(/_/g, ' ')}
                                                </li>
                                            ))}
                                            {report.present.length === 0 && <li className="text-slate-500 italic text-xs">None</li>}
                                        </ul>
                                    </div>

                                    <div className="border border-red-500/20 bg-red-500/5 rounded p-4">
                                        <h4 className="text-red-500 text-xs font-bold uppercase mb-3 flex justify-between">
                                            Absent
                                            <span className="bg-red-500/20 px-2 rounded-full">{report.absent.length}</span>
                                        </h4>
                                        <ul className="space-y-1 mt-2 max-h-60 overflow-y-auto">
                                            {report.absent.map(name => (
                                                <li key={name} className="text-slate-300 text-xs flex items-center gap-2">
                                                    <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                                                    {name.replace(/student_\d+_/, '').replace(/_/g, ' ')}
                                                </li>
                                            ))}
                                            {report.absent.length === 0 && <li className="text-slate-500 italic text-xs">None</li>}
                                        </ul>
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
