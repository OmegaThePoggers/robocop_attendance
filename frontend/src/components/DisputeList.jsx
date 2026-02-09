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

    const handleResolve = async (disputeId, resolution) => {
        try {
            await resolveDispute(disputeId, resolution);
            loadDisputes();
            setViewingEvidence(null);
        } catch (e) {
            alert('Resolution Failed');
        }
    }

    return (
        <div className="flex h-full gap-4">
            {/* List */}
            <div className="w-1/3 bg-slate-950 border border-slate-700 rounded overflow-hidden flex flex-col">
                <div className="bg-slate-900 p-3 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Active Appeals</h3>
                    <span className="bg-secondary/10 text-secondary text-[10px] px-2 rounded-full border border-secondary/20">{disputes.length}</span>
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-2">
                    {disputes.length === 0 && (
                        <div className="text-center text-slate-500 py-8 text-xs italic">No active disputes</div>
                    )}
                    {disputes.map(d => (
                        <div
                            key={d.id}
                            onClick={() => setViewingEvidence(d)}
                            className={`p-3 rounded border cursor-pointer transition-all ${viewingEvidence?.id === d.id
                                ? 'bg-secondary/10 border-secondary'
                                : 'bg-slate-900 border-slate-800 hover:border-slate-600'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-bold text-white">{d.student_name}</span>
                                <span className={`text-[10px] px-1.5 rounded uppercase ${d.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-slate-700 text-slate-400'
                                    }`}>{d.status}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mb-2">Ref: {d.session_name}</div>
                            <div className="text-[10px] text-slate-300 line-clamp-2 italic">"{d.reason}"</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Detail */}
            <div className="flex-1 bg-slate-900/50 border border-slate-700 rounded p-6 flex flex-col items-center justify-center text-slate-500">
                {!viewingEvidence ? (
                    <div className="text-center">
                        <div className="text-4xl mb-2 opacity-30">⚖️</div>
                        <p className="text-xs uppercase tracking-widest">Select an appeal to review</p>
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col">
                        <div className="flex justify-between items-start mb-6 border-b border-slate-700 pb-4">
                            <div>
                                <h3 className="text-lg font-bold text-white uppercase">{viewingEvidence.student_name}</h3>
                                <p className="text-xs font-mono text-secondary">Session: {viewingEvidence.session_name}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Submission Time</p>
                                <p className="text-xs font-mono text-white">{new Date().toLocaleDateString()}</p>
                            </div>
                        </div>

                        <div className="flex-1 grid grid-cols-2 gap-6 mb-6">
                            <div className="border border-slate-700 bg-black rounded p-2 flex items-center justify-center relative group">
                                <div className="absolute top-2 left-2 text-[10px] bg-black/50 text-white px-2 rounded">Session Evidence</div>
                                {viewingEvidence.evidence_path ? (
                                    <div className="relative w-full h-full">
                                        <img src={`http://localhost:8000/static/${viewingEvidence.evidence_path}`} className="w-full h-full object-contain" />
                                        {/* Overlay box if coords exist */}
                                        {viewingEvidence.selected_face_coords && (() => {
                                            try {
                                                // coords stored as string string "[y1, x2, y2, x1]" in json?
                                                // backend model says "selected_face_coords: Optional[str]"
                                                // frontend sends array. backend converts to str.
                                                // we need to parse it back.
                                                // Wait, in backend create: `coords_str = str(selected_face_coords)`. This creates "[1, 2, 3, 4]" string.
                                                // JSON.parse might fail on single quotes if python uses them.
                                                // Let's safe extract.
                                                const raw = viewingEvidence.selected_face_coords;
                                                const clean = raw.replace(/[\[\]]/g, '').split(',').map(Number);
                                                if (clean.length === 4) {
                                                    const [y1, x2, y2, x1] = clean;
                                                    return (
                                                        <div
                                                            className="absolute border-2 border-green-500 box-content shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                                                            style={{
                                                                top: y1,
                                                                left: x1,
                                                                width: x2 - x1,
                                                                height: y2 - y1
                                                            }}
                                                        ></div>
                                                    )
                                                }
                                            } catch (e) { return null; }
                                        })()}
                                    </div>
                                ) : (
                                    <div className="text-xs italic">No visual evidence provided</div>
                                )}
                            </div>

                            {/* Claim Details */}
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-1">Student Statement</h4>
                                    <div className="bg-slate-950 p-4 rounded border border-slate-800 text-sm text-slate-200 font-mono">
                                        "{viewingEvidence.reason}"
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 text-sm font-bold uppercase">
                            <button
                                onClick={() => handleResolve(viewingEvidence.id, 'rejected')}
                                className="px-6 py-2 bg-red-900/20 text-red-400 border border-red-900 hover:bg-red-900/40 rounded transition-all"
                            >
                                Reject Appeal
                            </button>
                            <button
                                onClick={() => handleResolve(viewingEvidence.id, 'accepted')}
                                className="px-6 py-2 bg-green-900/20 text-green-400 border border-green-900 hover:bg-green-900/40 rounded transition-all"
                            >
                                Approve & Update Attendance
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
