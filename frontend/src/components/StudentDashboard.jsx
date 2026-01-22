import { useState, useEffect } from 'react';
import { getSessionHistory, getMyAttendance, createDispute, getMyDisputes } from '../api';
import { useNavigate } from 'react-router-dom';

import SessionEvidenceGallery from './SessionEvidenceGallery';

export default function StudentDashboard() {
    const [sessions, setSessions] = useState([]);
    const [myAttendance, setMyAttendance] = useState([]);
    const [myDisputes, setMyDisputes] = useState([]);
    const [selectedSessionId, setSelectedSessionId] = useState(null);
    const [disputeReason, setDisputeReason] = useState("");
    const [showGallery, setShowGallery] = useState(false);
    const [evidenceData, setEvidenceData] = useState({ sourceId: null, coords: null });
    const navigate = useNavigate();

    useEffect(() => {
        async function loadData() {
            try {
                const s = await getSessionHistory();
                setSessions(s);

                const att = await getMyAttendance();
                setMyAttendance(att);

                const d = await getMyDisputes();
                setMyDisputes(d);
            } catch (e) {
                console.error("Failed to load data", e);
            }
        }
        loadData();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        navigate('/login');
    }

    const openDisputeModal = (sessionId) => {
        setSelectedSessionId(sessionId);
        setDisputeReason("");
        setShowGallery(false);
        setEvidenceData({ sourceId: null, coords: null });
    }

    const handleEvidenceSelect = (sourceId, coords) => {
        setEvidenceData({ sourceId, coords });
        setShowGallery(false);
        setDisputeReason((prev) => prev ? prev : "I found my face in the session photos.");
    }

    const handleSubmitDispute = async () => {
        if (!selectedSessionId || !disputeReason) return;
        try {
            await createDispute(selectedSessionId, disputeReason, evidenceData.sourceId, evidenceData.coords);
            alert("Dispute submitted successfully!");
            setSelectedSessionId(null);
            setDisputeReason("");
            setEvidenceData({ sourceId: null, coords: null });
            // Reload disputes
            const d = await getMyDisputes();
            setMyDisputes(d);
        } catch (e) {
            alert("Failed to sumbit dispute");
        }
    }

    // Helper to check status
    const getStatus = (sessionId) => {
        const record = myAttendance.find(a => a.session_id === sessionId);
        if (record) return { status: 'Present', color: 'text-green-400' };

        // check disputes
        const dispute = myDisputes.find(d => d.session_id === sessionId);
        if (dispute) return { status: `Disputed (${dispute.status})`, color: 'text-orange-400' };

        return { status: 'Absent', color: 'text-red-400' };
    }

    return (
        <div className="min-h-screen bg-robocop-900 text-slate-200 p-8">
            <header className="mb-8 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">My Attendance</h1>
                <button onClick={handleLogout} className="text-slate-400 hover:text-white">Logout</button>
            </header>

            <div className="bg-robocop-800 rounded-xl border border-robocop-700 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-robocop-900/50 text-robocop-400 uppercase text-xs">
                        <tr>
                            <th className="p-4">Session Date</th>
                            <th className="p-4">Session Name</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-robocop-700">
                        {sessions.map(session => {
                            const { status, color } = getStatus(session.id);
                            return (
                                <tr key={session.id} className="hover:bg-robocop-700/50">
                                    <td className="p-4">{new Date(session.created_at).toLocaleDateString()}</td>
                                    <td className="p-4 text-white font-medium">{session.name}</td>
                                    <td className={`p-4 font-bold ${color}`}>{status}</td>
                                    <td className="p-4">
                                        {status === 'Absent' && (
                                            <button
                                                onClick={() => openDisputeModal(session.id)}
                                                className="text-xs bg-robocop-600 hover:bg-robocop-500 text-white px-3 py-1 rounded"
                                            >
                                                Dispute
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Dispute Modal */}
            {selectedSessionId && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                    <div className="bg-robocop-800 p-6 rounded-xl border border-robocop-600 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold text-white mb-4">File Attendance Dispute</h3>

                        {!showGallery ? (
                            <>
                                <p className="text-sm text-slate-400 mb-4">
                                    Explain why you believe you were present for this session.
                                </p>

                                {evidenceData.sourceId && (
                                    <div className="bg-green-900/30 border border-green-500/30 p-3 rounded mb-4 text-green-300 text-sm flex justify-between items-center">
                                        <span>✓ Evidence Selected (Face marked)</span>
                                        <button onClick={() => setEvidenceData({ sourceId: null, coords: null })} className="text-xs underline hover:text-white">Clear</button>
                                    </div>
                                )}

                                <div className="mb-4">
                                    <button
                                        onClick={() => setShowGallery(true)}
                                        className="text-sm bg-robocop-700 hover:bg-robocop-600 text-white px-3 py-2 rounded flex items-center gap-2 border border-robocop-500"
                                    >
                                        📷 Find myself in session photos
                                    </button>
                                </div>

                                <textarea
                                    className="w-full bg-robocop-900 border border-robocop-700 rounded p-3 text-white focus:border-robocop-500 mb-4"
                                    rows="4"
                                    placeholder="I was sitting in the back right corner..."
                                    value={disputeReason}
                                    onChange={(e) => setDisputeReason(e.target.value)}
                                />
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setSelectedSessionId(null)}
                                        className="text-slate-400 hover:text-white"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSubmitDispute}
                                        className="bg-robocop-500 hover:bg-robocop-400 text-white px-4 py-2 rounded font-bold"
                                    >
                                        Submit Dispute
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-white">Select Photo Evidence</h4>
                                    <button onClick={() => setShowGallery(false)} className="text-sm text-slate-400 hover:text-white">Cancel</button>
                                </div>
                                <SessionEvidenceGallery
                                    sessionId={selectedSessionId}
                                    onSelectEvidence={handleEvidenceSelect}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
