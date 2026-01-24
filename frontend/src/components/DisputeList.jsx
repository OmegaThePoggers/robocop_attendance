import { useState, useEffect } from 'react';
import { getAllDisputes, resolveDispute } from '../api';

export default function DisputeList() {
    const [disputes, setDisputes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewingEvidence, setViewingEvidence] = useState(null);

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

    const handleViewEvidence = (dispute) => {
        setViewingEvidence(dispute);
    }

    // Filter to show pending first
    const sortedDisputes = [...disputes].sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.created_at) - new Date(a.created_at);
    });

    return (
        <>
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
                                <th className="p-4">Evidence</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-robocop-700">
                            {sortedDisputes.length === 0 ? (
                                <tr><td colSpan="6" className="p-8 text-center text-slate-500">No disputes found.</td></tr>
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
                                            {dispute.attendance_source_id ? (
                                                <button
                                                    onClick={() => handleViewEvidence(dispute)}
                                                    className="text-xs bg-robocop-700 hover:bg-robocop-600 text-white px-2 py-1 rounded"
                                                >
                                                    📷 View
                                                </button>
                                            ) : (
                                                <span className="text-xs text-slate-600">No photo</span>
                                            )}
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

            {/* Evidence Viewer Modal */}
            {viewingEvidence && (
                <EvidenceModal
                    dispute={viewingEvidence}
                    onClose={() => setViewingEvidence(null)}
                />
            )}
        </>
    );
}

function EvidenceModal({ dispute, onClose }) {
    const [evidenceSource, setEvidenceSource] = useState(null);
    const [userInfo, setUserInfo] = useState(null);

    useEffect(() => {
        async function loadEvidence() {
            try {
                console.log('Loading evidence for dispute:', dispute);

                // Fetch evidence source details
                const response = await fetch(`http://localhost:8000/sessions/${dispute.session_id}/evidence`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (!response.ok) {
                    console.error('Failed to fetch evidence sources:', response.status);
                    return;
                }

                const sources = await response.json();
                console.log('Evidence sources:', sources);
                console.log('Dispute Source ID:', dispute.attendance_source_id, 'Type:', typeof dispute.attendance_source_id);
                if (sources.length > 0) {
                    console.log('First Source ID:', sources[0].id, 'Type:', typeof sources[0].id);
                }

                const source = sources.find(s => s.id == dispute.attendance_source_id);
                console.log('Found evidence source:', source);

                if (!source) {
                    console.warn(`Source with ID ${dispute.attendance_source_id} not found in session evidence.`);
                    // Mock a source if missing to allow UI to show error instead of loading indefinitely
                    setEvidenceSource({ file_path: 'MISSING_FILE', id: -1 });
                } else {
                    setEvidenceSource(source);
                }

                // Fetch user info to get face_identity
                const userResponse = await fetch(`http://localhost:8000/admin/users`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (!userResponse.ok) {
                    console.error('Failed to fetch users:', userResponse.status);
                    return;
                }

                const users = await userResponse.json();
                console.log('All users:', users);

                const user = users.find(u => u.username === dispute.student_username);
                console.log('Found user:', user);
                setUserInfo(user);
            } catch (e) {
                console.error("Failed to load evidence", e);
            }
        }
        loadEvidence();
    }, [dispute]);

    // Parse selected face coords
    let faceCoords = null;
    try {
        if (dispute.selected_face_coords) {
            faceCoords = JSON.parse(dispute.selected_face_coords.replace(/'/g, '"'));
        }
    } catch (e) {
        console.error("Failed to parse coords", e);
    }

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-robocop-800 rounded-xl border border-robocop-600 max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">Evidence Review: {dispute.student_username}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Session Evidence Photo */}
                    <div>
                        <h4 className="text-sm font-bold text-robocop-400 mb-2">Session Photo (Student's Claim)</h4>
                        {evidenceSource ? (
                            <div className="relative border-2 border-robocop-500 rounded overflow-hidden">
                                <img
                                    src={`http://localhost:8000/static/${evidenceSource.file_path}`}
                                    alt="Session evidence"
                                    className="w-full h-auto"
                                    onError={(e) => {
                                        console.error('Failed to load evidence image:', e.target.src);
                                        e.target.style.display = 'none';
                                        e.target.parentElement.innerHTML = '<div class="bg-robocop-900 p-8 text-center text-red-400">Failed to load image. Path: ' + evidenceSource.file_path + '</div>';
                                    }}
                                />
                                {faceCoords && faceCoords.length === 4 && (
                                    <div
                                        className="absolute border-4 border-yellow-400 pointer-events-none"
                                        style={{
                                            top: `${faceCoords[0]}px`,
                                            left: `${faceCoords[3]}px`,
                                            width: `${faceCoords[1] - faceCoords[3]}px`,
                                            height: `${faceCoords[2] - faceCoords[0]}px`
                                        }}
                                    >
                                        <div className="absolute -top-6 left-0 bg-yellow-400 text-black text-xs px-2 py-1 font-bold">
                                            Student Claims This Face
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-robocop-900 p-8 text-center text-slate-500 rounded">Loading...</div>
                        )}
                    </div>

                    {/* Dataset Reference Photo */}
                    <div>
                        <h4 className="text-sm font-bold text-robocop-400 mb-2">Dataset Reference Photo</h4>
                        {userInfo?.face_identity ? (
                            <div className="border-2 border-robocop-500 rounded overflow-hidden">
                                <img
                                    src={`http://localhost:8000/static/dataset/${userInfo.face_identity}.jpg`}
                                    alt="Dataset reference"
                                    className="w-full h-auto"
                                    onError={(e) => {
                                        console.error('Failed to load dataset photo:', e.target.src);
                                        e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
                                        e.target.parentElement.innerHTML = '<div class="bg-robocop-900 p-8 text-center text-slate-500">No dataset photo found (' + userInfo.face_identity + ')</div>';
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="bg-robocop-900 p-8 text-center text-slate-500 rounded border-2 border-robocop-700">
                                No face identity mapped for this student
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-6 p-4 bg-robocop-900/50 rounded border border-robocop-700">
                    <p className="text-sm text-slate-300"><strong className="text-white">Reason:</strong> {dispute.description}</p>
                </div>
            </div>
        </div>
    );
}
