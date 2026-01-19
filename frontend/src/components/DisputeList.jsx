import { useState, useEffect } from 'react';
import { getAllDisputes, resolveDispute } from '../api';

export default function DisputeList() {
    const [disputes, setDisputes] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadDisputes = async () => {
        setLoading(true);
        const data = await getAllDisputes();
        setDisputes(data);
        setLoading(false);
    }

    useEffect(() => {
        loadDisputes();
    }, []);

    const handleResolve = async (id, status) => {
        if (!confirm(`Are you sure you want to ${status} this dispute?`)) return;
        try {
            await resolveDispute(id, status);
            loadDisputes();
        } catch (e) {
            alert("Failed to update dispute status");
        }
    }

    // Filter to show pending first
    const sortedDisputes = [...disputes].sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.created_at) - new Date(a.created_at);
    });

    return (
        <div className="bg-robocop-800 rounded-xl border border-robocop-700 overflow-hidden">
            <div className="p-4 border-b border-robocop-700 flex justify-between items-center bg-robocop-900/50">
                <h3 className="font-bold text-white">Student Disputes</h3>
                <button onClick={loadDisputes} className="text-sm text-robocop-400 hover:text-white">Refresh</button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-robocop-900/50 text-robocop-400 uppercase text-xs">
                        <tr>
                            <th className="p-4">Date</th>
                            <th className="p-4">Student</th>
                            <th className="p-4">Reason</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-robocop-700">
                        {sortedDisputes.length === 0 ? (
                            <tr><td colSpan="5" className="p-8 text-center text-slate-500">No disputes found.</td></tr>
                        ) : (
                            sortedDisputes.map(dispute => (
                                <tr key={dispute.id} className="hover:bg-robocop-700/30">
                                    <td className="p-4 text-slate-300 text-sm">
                                        {new Date(dispute.created_at).toLocaleString()}
                                    </td>
                                    <td className="p-4 font-medium text-white">{dispute.student_username}</td>
                                    <td className="p-4 text-slate-300 max-w-xs truncate" title={dispute.description}>
                                        {dispute.description}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${dispute.status === 'pending' ? 'bg-yellow-900/50 text-yellow-500 border border-yellow-700' :
                                                dispute.status === 'approved' ? 'bg-green-900/50 text-green-500 border border-green-700' :
                                                    'bg-red-900/50 text-red-500 border border-red-700'
                                            }`}>
                                            {dispute.status}
                                        </span>
                                    </td>
                                    <td className="p-4 flex gap-2">
                                        {dispute.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => handleResolve(dispute.id, 'approved')}
                                                    className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleResolve(dispute.id, 'rejected')}
                                                    className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-xs"
                                                >
                                                    Reject
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
