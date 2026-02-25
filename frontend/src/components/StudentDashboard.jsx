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
    const [evidenceData, setEvidenceData] = useState({ sourceId: null, coords: null, previewUrl: null });
    const [imgSize, setImgSize] = useState({ w: 1, h: 1 });
    const [modalMode, setModalMode] = useState('create'); // 'create', 'view' or 'proof'

    // Filtering & Sorting
    const [searchQuery, setSearchQuery] = useState('');
    const [timeRange, setTimeRange] = useState('7d'); // 'all', '7d', '30d'
    const [dateFilter, setDateFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [sessData, attData, dispData] = await Promise.all([
                getSessionHistory(),
                getMyAttendance(),
                getMyDisputes()
            ]);
            // Sort by most recent first
            const sortedSessions = sessData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setSessions(sortedSessions);
            setMyAttendance(attData);
            setMyDisputes(dispData);
        } catch (e) {
            console.error("Failed to load dashboard data");
        }
    };

    const openDisputeModal = (sessionId, mode = 'create', metadata = null) => {
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
        } else if (mode === 'proof' && metadata) {
            setEvidenceData({
                sourceId: metadata.source_id,
                coords: metadata.bounding_box, // raw array [top, right, bottom, left]
                previewUrl: metadata.file_path ? `http://localhost:8000/static/${metadata.file_path}` : null
            });
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
            alert("Appeal Submitted Successfully");
            setSelectedSessionId(null);
            setDisputeReason("");
            setEvidenceData({ sourceId: null, coords: null, previewUrl: null });
            const d = await getMyDisputes();
            setMyDisputes(d);
        } catch (e) {
            alert("Submission Failed");
        }
    }

    const getStatus = (sessionId) => {
        const record = myAttendance.find(a => a.session_id === sessionId);
        if (record) {
            let metadata = null;
            try { metadata = JSON.parse(record.metadata_json || '{}'); } catch (e) { }
            return { status: 'Present', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20 shadow-[0_0_10px_rgba(52,211,153,0.2)]', icon: '✓', metadata };
        }

        const dispute = myDisputes.find(d => d.session_id === sessionId);
        if (dispute) return { status: `Review (${dispute.status})`, color: 'text-amber-400 bg-amber-400/10 border-amber-500/20 shadow-[0_0_10px_rgba(251,191,36,0.2)]', icon: '◷', metadata: null };

        return { status: 'Absent', color: 'text-rose-400 bg-rose-400/10 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)]', icon: '✕', metadata: null };
    }

    // Prepare data for visualizer (last 5 sessions)
    const recentSessions = sessions.slice(0, 5).reverse();

    // Filter logic
    const filteredSessions = sessions.filter(session => {
        let matchDate = true;
        let matchStatus = true;
        let matchSearch = true;
        let matchTimeRange = true;

        const sessionDateObj = new Date(session.created_at);

        if (timeRange !== 'all') {
            const now = new Date();
            const diffTime = Math.abs(now - sessionDateObj);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (timeRange === '7d') matchTimeRange = diffDays <= 7;
            if (timeRange === '30d') matchTimeRange = diffDays <= 30;
        }

        if (dateFilter) {
            const sessionDate = sessionDateObj.toISOString().split('T')[0];
            matchDate = sessionDate === dateFilter;
        }

        if (statusFilter !== 'all') {
            const { status } = getStatus(session.id);
            if (statusFilter === 'present') matchStatus = status === 'Present';
            else if (statusFilter === 'absent') matchStatus = status === 'Absent';
            else if (statusFilter === 'review') matchStatus = status.includes('Review');
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            matchSearch = session.name.toLowerCase().includes(q) ||
                sessionDateObj.toLocaleDateString().toLowerCase().includes(q);
        }

        return matchDate && matchStatus && matchSearch && matchTimeRange;
    });

    return (
        <div className="h-full flex flex-col max-w-7xl mx-auto w-full gap-6 animate-fade-in relative z-10">
            {/* Header Section */}
            <div className="glass-panel p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        </div>
                        Student Dashboard
                    </h1>
                    <p className="text-dark-muted text-sm mt-1">Manage your attendance records and track your status.</p>
                </div>

                {/* Recent Status Visualizer */}
                <div className="flex flex-col items-end gap-2 bg-dark-bg/50 p-3 rounded-xl border border-dark-border/50">
                    <span className="text-xs font-semibold text-dark-muted uppercase tracking-wider">Recent Activity</span>
                    <div className="flex gap-2">
                        {recentSessions.length === 0 ? (
                            <span className="text-xs text-dark-muted italic">No recent sessions</span>
                        ) : (
                            recentSessions.map(sess => {
                                const { status, color, icon } = getStatus(sess.id);
                                return (
                                    <div
                                        key={sess.id}
                                        className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold border transition-transform hover:scale-110 cursor-help ${color}`}
                                        title={`${sess.name}: ${status}`}
                                    >
                                        {icon}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="glass-panel p-6 flex-1 flex flex-col min-h-[500px]">
                {/* Toolbar */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 pb-6 border-b border-dark-border/50">
                    <h2 className="text-lg font-bold text-white tracking-tight shrink-0">Attendance History</h2>
                    <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full xl:w-auto">
                        <div className="relative flex-grow sm:max-w-xs">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-dark-muted">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </span>
                            <input
                                type="text"
                                placeholder="Search class or date..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input-field pl-9 py-2 text-sm w-full bg-dark-bg/80"
                            />
                        </div>
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            className="input-field py-2 text-sm w-full sm:w-auto bg-dark-bg/80 appearance-none pr-8 cursor-pointer"
                        >
                            <option value="all">All Time</option>
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                        </select>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-dark-muted">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
                            </span>
                            <input
                                type="date"
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="input-field pl-9 py-2 text-sm w-full sm:w-auto bg-dark-bg/80"
                                title="Specific Date Override"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="input-field py-2 text-sm w-full sm:w-auto bg-dark-bg/80 appearance-none pr-8 cursor-pointer"
                        >
                            <option value="all">All Statuses</option>
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="review">Under Review</option>
                        </select>
                        {(dateFilter || statusFilter !== 'all' || searchQuery || timeRange !== '7d') && (
                            <button
                                onClick={() => { setDateFilter(''); setStatusFilter('all'); setSearchQuery(''); setTimeRange('7d'); }}
                                className="text-xs text-primary-400 hover:text-white transition-colors flex items-center px-2"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Table Area */}
                <div className="flex-1 overflow-x-auto custom-scrollbar -mx-6 px-6">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead>
                            <tr className="text-xs font-semibold text-dark-muted uppercase tracking-wider border-b border-dark-border/50">
                                <th className="pb-3 px-4 w-40">Date</th>
                                <th className="pb-3 px-4">Class Session</th>
                                <th className="pb-3 px-4 w-48">Status</th>
                                <th className="pb-3 px-4 text-right w-40">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-border/40">
                            {filteredSessions.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="py-12 text-center text-dark-muted text-sm">
                                        No attendance records found matching filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredSessions.map(session => {
                                    const { status, color, icon } = getStatus(session.id);
                                    const isAbsent = status.includes('Absent');

                                    return (
                                        <tr key={session.id} className="hover:bg-dark-border/20 transition-colors group">
                                            <td className="py-4 px-4 text-sm text-slate-300">
                                                {new Date(session.created_at).toLocaleDateString(undefined, {
                                                    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                                                })}
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="font-semibold text-white group-hover:text-primary-300 transition-colors">{session.name}</div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold border rounded-full ${color}`}>
                                                    <span>{icon}</span> {status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                {isAbsent && (
                                                    <button
                                                        onClick={() => openDisputeModal(session.id, 'create')}
                                                        className="text-xs font-bold uppercase tracking-wider text-rose-400 hover:text-white border border-rose-500/30 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg transition-all"
                                                    >
                                                        File Appeal
                                                    </button>
                                                )}
                                                {status.includes('Review') && (
                                                    <button
                                                        onClick={() => openDisputeModal(session.id, 'view')}
                                                        className="text-xs font-bold uppercase tracking-wider text-amber-400 hover:text-white border border-amber-500/30 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg transition-all"
                                                    >
                                                        View Status
                                                    </button>
                                                )}
                                                {status === 'Present' && (() => {
                                                    const { metadata } = getStatus(session.id);
                                                    if (metadata && metadata.file_path) {
                                                        return (
                                                            <button
                                                                onClick={() => openDisputeModal(session.id, 'proof', metadata)}
                                                                className="text-xs font-bold uppercase tracking-wider text-emerald-400 hover:text-white border border-emerald-500/30 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg transition-all"
                                                            >
                                                                View Proof
                                                            </button>
                                                        )
                                                    }
                                                    return null;
                                                })()}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Appeal Modal */}
            {selectedSessionId && (
                <div className="fixed inset-0 bg-dark-bg/80 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-fade-in">
                    <div className="glass-panel-heavy border border-dark-border shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col relative overflow-hidden">

                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-rose-500"></div>

                        <div className="p-6 border-b border-dark-border/50 flex justify-between items-center bg-dark-bg/40">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                {modalMode === 'proof' ? (
                                    <><svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Attendance Verified</>
                                ) : modalMode === 'create' ? (
                                    <><svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> File Attendance Appeal</>
                                ) : (
                                    <><svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Appeal Details</>
                                )}
                            </h3>
                            <button onClick={() => setSelectedSessionId(null)} className="text-dark-muted hover:text-white transition-colors bg-dark-bg/50 rounded-full p-1.5">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-dark-bg/20">
                            {!showGallery ? (
                                <div className="space-y-6">
                                    {modalMode === 'create' && (
                                        <div className="p-4 bg-primary-900/10 border border-primary-500/20 rounded-xl flex gap-3 text-sm text-primary-100">
                                            <svg className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            <p>If you were present but marked absent, please explain below. For faster processing, attach visual evidence by picking yourself from the class photos.</p>
                                        </div>
                                    )}
                                    {modalMode === 'proof' && (
                                        <div className="p-4 bg-emerald-900/10 border border-emerald-500/20 rounded-xl flex gap-3 text-sm text-emerald-100 mb-6">
                                            <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            <p>Attendance verified successfully. Visual proof from the class session is attached below.</p>
                                        </div>
                                    )}

                                    {/* Evidence Display Section */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-dark-muted uppercase tracking-wider">Supporting Evidence</label>

                                        {evidenceData.previewUrl ? (
                                            modalMode === 'proof' ? (
                                                <div className="relative rounded-xl overflow-hidden border border-emerald-500/30 bg-black flex justify-center w-full max-h-[60vh] mx-auto shadow-[0_0_30px_rgba(52,211,153,0.15)] group">
                                                    <img
                                                        src={evidenceData.previewUrl}
                                                        className="max-w-full max-h-[60vh] object-contain"
                                                        onLoad={(e) => setImgSize({ w: e.target.naturalWidth || 1, h: e.target.naturalHeight || 1 })}
                                                    />
                                                    {evidenceData.coords && Array.isArray(evidenceData.coords) && (
                                                        <div
                                                            className="absolute border-2 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]"
                                                            style={{
                                                                top: `${(evidenceData.coords[0] / imgSize.h) * 100}%`,
                                                                left: `${(evidenceData.coords[3] / imgSize.w) * 100}%`,
                                                                width: `${((evidenceData.coords[1] - evidenceData.coords[3]) / imgSize.w) * 100}%`,
                                                                height: `${((evidenceData.coords[2] - evidenceData.coords[0]) / imgSize.h) * 100}%`
                                                            }}
                                                        >
                                                            {/* Corner Accents */}
                                                            <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-emerald-400"></div>
                                                            <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-emerald-400"></div>
                                                            <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-emerald-400"></div>
                                                            <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-emerald-400"></div>
                                                            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-emerald-500 rounded text-[10px] text-black font-bold whitespace-nowrap">VERIFIED</div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="bg-dark-bg/60 border border-success/30 rounded-xl p-4 flex gap-4 items-center group relative overflow-hidden transition-colors hover:border-success/50">
                                                    <div className="w-24 h-16 rounded overflow-hidden shadow-lg border border-success/40 relative flex-shrink-0 bg-black">
                                                        <img src={evidenceData.previewUrl} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="flex-1 overflow-hidden">
                                                        <div className="flex items-center gap-1.5 text-success text-sm font-bold mb-1">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                            {modalMode === 'create' ? 'Evidence Attached' : 'Attached Photo Identity'}
                                                        </div>
                                                        <div className="text-xs text-dark-muted font-mono bg-black/30 inline-block px-2 py-0.5 rounded truncate max-w-full">Source ID: {evidenceData.sourceId}</div>
                                                    </div>
                                                    {modalMode === 'create' && (
                                                        <button
                                                            onClick={() => setEvidenceData({ sourceId: null, coords: null, previewUrl: null })}
                                                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-rose-400/50 hover:text-rose-400 bg-rose-400/10 rounded-lg hover:bg-rose-400/20 transition-all opacity-0 group-hover:opacity-100"
                                                            title="Remove evidence"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    )}
                                                </div>
                                            )
                                        ) : modalMode === 'create' && (
                                            <button
                                                onClick={() => setShowGallery(true)}
                                                className="w-full py-6 bg-dark-bg/40 hover:bg-dark-bg/60 border-2 border-dashed border-dark-border hover:border-primary-500/50 rounded-xl text-dark-muted hover:text-primary-300 transition-all flex flex-col items-center justify-center gap-2 group"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-dark-border/50 group-hover:bg-primary-500/20 flex items-center justify-center transition-colors">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                </div>
                                                <span className="text-sm font-semibold">Select yourself from Session Photos</span>
                                            </button>
                                        )}
                                    </div>

                                    {modalMode !== 'proof' && (
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-dark-muted uppercase tracking-wider">Explanation / Comments <span className="text-rose-400">*</span></label>
                                            <textarea
                                                className="input-field min-h-[120px] resize-none disabled:opacity-50 disabled:cursor-not-allowed bg-dark-bg/60"
                                                placeholder="Please describe why you were marked absent (e.g., sat in the back row, arrived late, camera blocked)..."
                                                value={disputeReason}
                                                onChange={(e) => setDisputeReason(e.target.value)}
                                                disabled={modalMode === 'view'}
                                            />
                                        </div>
                                    )}

                                    <div className="pt-4 flex justify-end gap-3 border-t border-dark-border/50 mt-6 relative z-20">
                                        <button
                                            onClick={() => setSelectedSessionId(null)}
                                            className="btn-secondary px-6 py-2.5"
                                        >
                                            {modalMode === 'create' ? 'Cancel' : 'Close'}
                                        </button>
                                        {modalMode === 'create' && (
                                            <button
                                                onClick={handleSubmitDispute}
                                                disabled={!disputeReason.trim()}
                                                className="btn-primary px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Submit Appeal
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-[60vh] flex flex-col animate-fade-in relative z-20">
                                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-dark-border/50">
                                        <div>
                                            <h4 className="font-bold text-white">Select Your Face</h4>
                                            <p className="text-xs text-dark-muted">Click on yourself in the captured class photos</p>
                                        </div>
                                        <button onClick={() => setShowGallery(false)} className="btn-secondary px-3 py-1.5 text-xs">
                                            ← Back to Form
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-hidden rounded-xl border border-dark-border/60 bg-black/60 shadow-inner relative z-20">
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
