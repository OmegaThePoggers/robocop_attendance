"use client";

import { useState, useEffect } from 'react';
import { getAllDisputes, resolveDispute, STATIC_URL, fetchStudentPhoto } from '../lib/api';

export default function DisputeList() {
    const [disputes, setDisputes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewingEvidence, setViewingEvidence] = useState(null);
    const [dbPhotoUrl, setDbPhotoUrl] = useState(null);
    const [dbPhotoLoading, setDbPhotoLoading] = useState(false);

    const loadDisputes = async () => {
        setLoading(true);
        const data = await getAllDisputes();
        setDisputes(data);
        setLoading(false);
    }

    useEffect(() => {
        loadDisputes();
    }, []);

    useEffect(() => {
        if (viewingEvidence?.student_username) {
            setDbPhotoUrl(null);
            setDbPhotoLoading(true);
            fetchStudentPhoto(viewingEvidence.student_username).then(url => {
                setDbPhotoUrl(url);
                setDbPhotoLoading(false);
            });
        } else {
            setDbPhotoUrl(null);
            setDbPhotoLoading(false);
        }
    }, [viewingEvidence]);

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
        <div className="flex flex-col lg:flex-row h-full gap-4 text-textMain">
            {/* List */}
            <div className="w-full lg:w-[350px] bg-background border border-border flex flex-col shrink-0 rounded-sm">
                <div className="bg-surface p-3 border-b border-border flex justify-between items-center sticky top-0 z-10">
                    <h3 className="text-xs font-mono font-bold text-textMain uppercase tracking-tight">
                        Active Appeals
                    </h3>
                    <span className="bg-border text-textMain text-[10px] px-2 py-0.5 rounded-sm uppercase font-mono">
                        {disputes.length}
                    </span>
                </div>
                <div className="overflow-y-auto custom-scrollbar flex-1 p-2 space-y-2">
                    {disputes.length === 0 && !loading && (
                        <div className="flex flex-col items-center justify-center py-16 text-textMuted">
                            <span className="text-[10px] font-mono uppercase tracking-widest">[NO ACTIVE DISPUTES]</span>
                        </div>
                    )}
                    {disputes.map((d, idx) => (
                        <div
                            key={d.id}
                            onClick={() => setViewingEvidence(d)}
                            className={`p-3 rounded-sm border cursor-pointer transition-colors group animate-slide-up ${viewingEvidence?.id === d.id
                                ? 'bg-surface border-accent'
                                : 'bg-background border-border hover:border-accent hover:bg-surfaceHover'
                                }`}
                            style={{ animationDelay: `${idx * 0.05}s` }}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-mono font-medium text-textMain group-hover:text-accent transition-colors">{d.student_username}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-mono uppercase ${d.status === 'pending' ? 'bg-surface text-textMuted border border-border' :
                                    d.status === 'approved' ? 'bg-success/20 text-success border border-success/30' :
                                        d.status === 'rejected' ? 'bg-danger/20 text-danger border border-danger/30' :
                                            'bg-background text-textMuted border border-border'
                                    }`}>
                                    {d.status}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] text-textMuted font-mono">REF: {d.session_name}</span>
                            </div>
                            <div className="text-[10px] text-textMuted font-mono truncate">"{d.description}"</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Detail */}
            <div className="flex-1 bg-background border border-border flex flex-col text-textMain min-h-[500px] rounded-sm relative">
                {!viewingEvidence ? (
                    <div className="text-center w-full h-full flex flex-col items-center justify-center absolute inset-0 bg-background z-0">
                        <p className="text-xs font-mono text-textMuted uppercase tracking-widest border border-border px-4 py-2 rounded-sm bg-surface">
                            SELECT APPEAL TO REVIEW
                        </p>
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col relative z-10 animate-fade-in">
                        {/* Header with Student Identity Banner */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-surface px-4 py-3 border-b border-border">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-accent text-background flex items-center justify-center text-sm font-mono font-bold rounded-sm shrink-0">
                                    {viewingEvidence.student_username[0].toUpperCase()}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-mono text-accent uppercase tracking-widest bg-accent/10 border border-accent/30 px-1.5 py-0.5 rounded-sm">CLAIMS TO BE</span>
                                    </div>
                                    <h3 className="text-sm font-mono font-bold text-textMain tracking-tight mt-1">{viewingEvidence.student_username}</h3>
                                </div>
                            </div>
                            <div className="text-left sm:text-right mt-3 sm:mt-0 flex flex-col">
                                <span className="text-[9px] text-textMuted uppercase font-mono tracking-widest">LOGGED</span>
                                <span className="text-[10px] font-mono text-textMain">
                                    {new Date(viewingEvidence.created_at || Date.now()).toLocaleString()}
                                </span>
                                <span className="text-[9px] text-textMuted uppercase font-mono tracking-widest mt-1">SESSION</span>
                                <span className="text-[10px] font-mono text-textMain">{viewingEvidence.session_name}</span>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                            {/* Side-by-Side Comparison */}
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
                                {/* Evidence Image — what the student selected */}
                                <div className="border border-border bg-surface rounded-sm flex flex-col relative group">
                                    <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-background">
                                        <span className="text-[9px] text-textMuted uppercase font-mono tracking-widest">EVIDENCE — STUDENT&apos;S SELECTION</span>
                                        <span className="w-2 h-2 rounded-full bg-warning animate-pulse"></span>
                                    </div>
                                    <div className="flex-1 relative flex items-center justify-center p-3 min-h-[280px]">
                                        {viewingEvidence.evidence_path ? (
                                            <div className="relative w-full h-full flex items-center justify-center">
                                                <div className="relative inline-block max-w-full max-h-full">
                                                    <img
                                                        id="admin-evidence-img"
                                                        src={`${STATIC_URL}/${viewingEvidence.evidence_path}`}
                                                        className="max-w-full max-h-[300px] object-contain rounded-sm border border-border"
                                                        alt="Evidence"
                                                    />
                                                    {/* Overlay box if coords exist */}
                                                    {viewingEvidence.selected_face_coords && (() => {
                                                        try {
                                                            const raw = viewingEvidence.selected_face_coords;
                                                            const clean = raw.replace(/[\[\]]/g, '').split(',').map(Number);
                                                            if (clean.length === 4) {
                                                                const [y1, x2, y2, x1] = clean;

                                                                const imgEl = document.getElementById('admin-evidence-img');
                                                                if (!imgEl || !imgEl.naturalWidth) return null;

                                                                const pX1 = (x1 / imgEl.naturalWidth) * 100;
                                                                const pY1 = (y1 / imgEl.naturalHeight) * 100;
                                                                const pW = ((x2 - x1) / imgEl.naturalWidth) * 100;
                                                                const pH = ((y2 - y1) / imgEl.naturalHeight) * 100;

                                                                return (
                                                                    <div
                                                                        className="absolute border-2 border-accent box-content bg-accent/10 animate-pulse"
                                                                        style={{
                                                                            top: `${pY1}%`,
                                                                            left: `${pX1}%`,
                                                                            width: `${pW}%`,
                                                                            height: `${pH}%`
                                                                        }}
                                                                    >
                                                                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-accent text-background text-[9px] px-1.5 py-0.5 rounded-sm font-mono uppercase tracking-widest whitespace-nowrap">SELECTED FACE</div>
                                                                    </div>
                                                                )
                                                            }
                                                        } catch (e) { return null; }
                                                    })()}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center text-textMuted font-mono text-[10px] uppercase">
                                                [NO VISUAL DATA]
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Database Photo — enrolled face */}
                                <div className="border border-border bg-surface rounded-sm flex flex-col relative group">
                                    <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-background">
                                        <span className="text-[9px] text-textMuted uppercase font-mono tracking-widest">DATABASE — ENROLLED FACE</span>
                                        <span className="w-2 h-2 rounded-full bg-success"></span>
                                    </div>
                                    <div className="flex-1 relative flex items-center justify-center p-3 min-h-[280px]">
                                        {dbPhotoLoading ? (
                                            <div className="flex flex-col items-center justify-center text-textMuted font-mono text-[10px] uppercase gap-2">
                                                <span className="animate-spin text-lg">⟳</span>
                                                LOADING...
                                            </div>
                                        ) : dbPhotoUrl ? (
                                            <div className="relative w-full h-full flex items-center justify-center">
                                                <img
                                                    src={dbPhotoUrl}
                                                    className="max-w-full max-h-[300px] object-contain rounded-sm border border-border"
                                                    alt={`Enrolled: ${viewingEvidence.student_username}`}
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center text-textMuted font-mono text-[10px] uppercase gap-2">
                                                <span className="text-2xl opacity-30">⚠</span>
                                                [NO ENROLLED PHOTO FOUND]
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Statement & Actions Row */}
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                {/* Statement */}
                                <div className="bg-surface border border-border rounded-sm p-4 flex flex-col">
                                    <h4 className="flex items-center gap-2 text-[10px] font-mono text-textMuted uppercase tracking-widest mb-3 pb-2 border-b border-border">
                                        STUDENT STATEMENT
                                    </h4>
                                    <div className="bg-background border border-border p-4 rounded-sm text-xs text-textMain font-mono flex-1 flex flex-col justify-center items-center">
                                        <span className="opacity-70">"{viewingEvidence.description || "NO STATEMENT PROVIDED"}"</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="bg-surface border border-border rounded-sm p-4 flex flex-col justify-between">
                                    <div>
                                        <h4 className="text-[10px] text-textMuted font-mono uppercase tracking-widest mb-3 pb-2 border-b border-border">
                                            RESOLUTION
                                        </h4>
                                        <p className="text-[10px] text-textMuted font-mono mb-4">
                                            Compare the evidence face with the enrolled database photo. If they match, approve the appeal. Otherwise, reject.
                                        </p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <button
                                            onClick={() => handleResolve(viewingEvidence.id, 'rejected')}
                                            className="btn-danger px-4 py-2.5 text-[10px] font-mono rounded-sm w-full sm:w-auto uppercase tracking-widest font-bold"
                                        >
                                            ✕ REJECT
                                        </button>
                                        <button
                                            onClick={() => handleResolve(viewingEvidence.id, 'approved')}
                                            className="bg-transparent hover:bg-success hover:border-success hover:text-background text-[10px] font-mono text-textMain border border-border px-4 py-2.5 transition-colors rounded-sm w-full sm:w-auto uppercase tracking-widest font-bold"
                                        >
                                            ✓ APPROVE
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
