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
        const interval = setInterval(fetchHistory, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleRowClick = async (session) => {
        setSelectedSession(session);
        setReport(null); // Clear previous
        const data = await getSessionReport(session.id);
        setReport(data);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString();
    };

    const getDuration = (start, end) => {
        if (!start || !end) return '-';
        const startTime = new Date(start);
        const endTime = new Date(end);
        const diffMs = endTime - startTime;
        const minutes = Math.floor(diffMs / 60000);
        return `${minutes} min`;
    };

    return (
        <div className="bg-robocop-800 rounded-xl border border-robocop-700 overflow-hidden shadow-lg h-full flex flex-col relative">
            <div className="bg-robocop-900/50 px-6 py-4 border-b border-robocop-700 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-200 tracking-wider uppercase">Mission Logs</h2>
                <div className="text-xs text-robocop-400 font-mono">ARCHIVE</div>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-robocop-400 text-sm border-b border-robocop-700/50">
                            <th className="pb-3 pl-2 font-medium">SESSION NAME</th>
                            <th className="pb-3 font-medium">STARTED</th>
                            <th className="pb-3 font-medium">ENDED</th>
                            <th className="pb-3 font-medium text-right pr-2">DURATION</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-robocop-700/30">
                        {history.map((session) => (
                            <tr
                                key={session.id}
                                onClick={() => handleRowClick(session)}
                                className="hover:bg-robocop-700/40 transition-colors cursor-pointer"
                            >
                                <td className="py-3 pl-2 font-medium text-white">
                                    {session.name}
                                </td>
                                <td className="py-3 text-sm text-slate-400">
                                    {formatDate(session.created_at)}
                                </td>
                                <td className="py-3 text-sm text-slate-400">
                                    {formatDate(session.end_time)}
                                </td>
                                <td className="py-3 text-right pr-2 text-sm font-mono text-robocop-300">
                                    {getDuration(session.created_at, session.end_time)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {selectedSession && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-robocop-900 border border-robocop-500 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90%] flex flex-col">
                        <div className="p-4 border-b border-robocop-700 flex justify-between items-center bg-robocop-800 rounded-t-xl">
                            <h3 className="text-lg font-bold text-white">Mission Report: {selectedSession.name}</h3>
                            <button
                                onClick={() => setSelectedSession(null)}
                                className="text-slate-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            {!report ? (
                                <div className="text-center text-robocop-400 animate-pulse">Loading data...</div>
                            ) : (
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="bg-green-900/20 border border-green-900/50 rounded-lg p-4">
                                        <h4 className="text-green-400 font-bold mb-3 flex justify-between">
                                            <span>PRESENT</span>
                                            <span className="bg-green-900/50 px-2 rounded text-sm">{report.present.length}</span>
                                        </h4>
                                        <ul className="space-y-1">
                                            {report.present.map(name => (
                                                <li key={name} className="text-green-200 text-sm">
                                                    {name.replace(/student_\d+_/, '').replace(/_/g, ' ')}
                                                </li>
                                            ))}
                                            {report.present.length === 0 && <li className="text-slate-500 italic text-sm">None</li>}
                                        </ul>
                                    </div>
                                    <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-4">
                                        <h4 className="text-red-400 font-bold mb-3 flex justify-between">
                                            <span>ABSENT</span>
                                            <span className="bg-red-900/50 px-2 rounded text-sm">{report.absent.length}</span>
                                        </h4>
                                        <ul className="space-y-1">
                                            {report.absent.map(name => (
                                                <li key={name} className="text-red-200 text-sm">
                                                    {name.replace(/student_\d+_/, '').replace(/_/g, ' ')}
                                                </li>
                                            ))}
                                            {report.absent.length === 0 && <li className="text-slate-500 italic text-sm">None</li>}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-robocop-700 bg-robocop-800/50 text-right">
                            <button
                                onClick={() => setSelectedSession(null)}
                                className="bg-robocop-700 hover:bg-robocop-600 text-white px-4 py-2 rounded text-sm font-medium"
                            >
                                Close Report
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
