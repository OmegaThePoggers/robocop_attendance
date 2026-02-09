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
    const [modalMode, setModalMode] = useState('create'); // 'create' or 'view'
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        navigate('/login');
    }

    const openDisputeModal = (sessionId, mode = 'create') => {
        setSelectedSessionId(sessionId);
        setModalMode(mode);
        setDisputeReason("");
        setShowGallery(false);
        setEvidenceData({ sourceId: null, coords: null, previewUrl: null });

        if (mode === 'view') {
            const dispute = myDisputes.find(d => d.session_id === sessionId);
            if (dispute) {
                setDisputeReason(dispute.description);
                if (dispute.evidence_path) {
                    setEvidenceData({
                        sourceId: dispute.attendance_source_id,
                        coords: dispute.selected_face_coords,
                        previewUrl: `http://localhost:8000/static/${dispute.evidence_path}`
                    });
                }
            }
        }
    }

    const handleEvidenceSelect = (sourceId, coords, url) => {
        setEvidenceData({ sourceId, coords, previewUrl: url });
        setShowGallery(false);
        setDisputeReason((prev) => prev ? prev : "Identified myself in session photos.");
    }

    const handleSubmitDispute = async () => {
        if (!selectedSessionId || !disputeReason) return;
        try {
            await createDispute(selectedSessionId, disputeReason, evidenceData.sourceId, evidenceData.coords);
            alert("Report Submitted Successfully");
            setSelectedSessionId(null);
            setDisputeReason("");
            setEvidenceData({ sourceId: null, coords: null });
            const d = await getMyDisputes();
            setMyDisputes(d);
        } catch (e) {
            alert("Submission Failed");
        }
    }

    const getStatus = (sessionId) => {
        const record = myAttendance.find(a => a.session_id === sessionId);
        if (record) return { status: 'Present', color: 'text-green-400 bg-green-400/10 border-green-500/20' };

        const dispute = myDisputes.find(d => d.session_id === sessionId);
        if (dispute) return { status: `Review (${dispute.status})`, color: 'text-yellow-400 bg-yellow-400/10 border-yellow-500/20' };

        return { status: 'Absent', color: 'text-red-400 bg-red-400/10 border-red-500/20' };
    }

    return (
        <div className="h-full flex flex-col font-mono text-sm max-w-6xl mx-auto w-full">
            <header className="mb-6 flex justify-between items-end border-b border-slate-700 pb-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-white uppercase tracking-wider">Student Dashboard</h1>
                    <p className="text-slate-500 text-xs mt-1">Attendance Records & Appeals</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-4 py-2 rounded transition-all uppercase tracking-wider"
                >
                    Logout
                </button>
            </header>

            <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden shadow-lg">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-950 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-800">
                            <th className="p-4 font-semibold">Date</th>
                            <th className="p-4 font-semibold">Class Session</th>
                            <th className="p-4 font-semibold">Attendance Status</th>
                            <th className="p-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {sessions.map(session => {
                            const { status, color } = getStatus(session.id);
                            const isAbsent = status.includes('Absent');
                            return (
                                <tr key={session.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="p-4 text-slate-400">{new Date(session.created_at).toLocaleDateString()}</td>
                                    <td className="p-4 text-white font-bold">{session.name}</td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 text-xs font-bold border rounded-full ${color}`}>
                                            {status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        {isAbsent && (
                                            <button
                                                onClick={() => openDisputeModal(session.id, 'create')}
                                                className="text-primary hover:text-white border border-primary/30 hover:bg-primary/10 px-3 py-1 text-xs font-bold uppercase rounded transition-all"
                                            >
                                                Report Issue
                                            </button>
                                        )}
                                        {status.includes('Review') && (
                                            <button
                                                onClick={() => openDisputeModal(session.id, 'view')}
                                                className="text-yellow-400 hover:text-white border border-yellow-500/30 hover:bg-yellow-500/10 px-3 py-1 text-xs font-bold uppercase rounded transition-all"
                                            >
                                                View Appeal
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {selectedSessionId && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
                        <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white">
                                {modalMode === 'create' ? 'Attendance Appeal' : 'Appeal Details'}
                            </h3>
                            <button onClick={() => setSelectedSessionId(null)} className="text-slate-400 hover:text-white">✕</button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                            {!showGallery ? (
                                <>
                                    {modalMode === 'create' && (
                                        <p className="text-sm text-slate-400 mb-6 border-l-2 border-primary/50 pl-4">
                                            If you were present but marked absent, please explain below. You may also attach visual evidence from the session logs.
                                        </p>
                                    )}

                                    {evidenceData.previewUrl && (
                                        <div className="bg-slate-900 border border-slate-700 rounded p-3 mb-6 flex gap-4 items-start">
                                            <img src={evidenceData.previewUrl} className="w-24 h-16 object-cover rounded border border-slate-600" />
                                            <div className="flex-1">
                                                <div className="text-green-400 text-xs font-mono mb-1">
                                                    {modalMode === 'create' ? '✓ Evidence Attached' : 'Attached Evidence'}
                                                </div>
                                                <div className="text-[10px] text-slate-500">ID: {evidenceData.sourceId}</div>
                                            </div>
                                            {modalMode === 'create' && (
                                                <button onClick={() => setEvidenceData({ sourceId: null, coords: null, previewUrl: null })} className="text-slate-500 hover:text-white text-xs underline">Remove</button>
                                            )}
                                        </div>
                                    )}

                                    {modalMode === 'create' && (
                                        <div className="mb-6">
                                            <button
                                                onClick={() => setShowGallery(true)}
                                                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-dashed border-slate-600 rounded text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all"
                                            >
                                                <span>📷</span> Select from Session Photos
                                            </button>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Explanation / Comments</label>
                                        <textarea
                                            className="w-full bg-slate-950 border border-slate-700 rounded p-4 text-white text-sm focus:border-primary focus:outline-none min-h-[100px] disabled:opacity-50"
                                            placeholder="I arrived late and sat in the back..."
                                            value={disputeReason}
                                            onChange={(e) => setDisputeReason(e.target.value)}
                                            disabled={modalMode === 'view'}
                                        />
                                    </div>

                                    <div className="mt-8 flex justify-end gap-4">
                                        <button
                                            onClick={() => setSelectedSessionId(null)}
                                            className="text-slate-500 hover:text-white text-xs uppercase font-bold px-4 py-2"
                                        >
                                            {modalMode === 'create' ? 'Cancel' : 'Close'}
                                        </button>
                                        {modalMode === 'create' && (
                                            <button
                                                onClick={handleSubmitDispute}
                                                className="bg-primary hover:bg-primary/90 text-slate-950 px-6 py-2 text-xs font-bold uppercase rounded shadow-lg transition-all"
                                            >
                                                Submit Report
                                            </button>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="h-full flex flex-col">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-bold text-white text-sm">Select Evidence Photo</h4>
                                        <button onClick={() => setShowGallery(false)} className="text-xs text-slate-400 hover:text-white uppercase">Back</button>
                                    </div>
                                    <div className="flex-1 overflow-hidden rounded border border-slate-700 bg-black">
                                        <SessionEvidenceGallery
                                            sessionId={selectedSessionId}
                                            onSelectEvidence={handleEvidenceSelect}
                                        />
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
