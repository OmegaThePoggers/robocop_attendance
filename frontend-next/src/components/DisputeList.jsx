"use client";

import { useState, useEffect } from 'react';
import { getAllDisputes, resolveDispute, STATIC_URL } from '../lib/api';

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
        <div className="flex flex-col lg:flex-row h-full gap-6">
            {/* List */}
            <div className="w-full lg:w-[350px] bg-dark-bg/40 border border-dark-border/50 rounded-xl overflow-hidden flex flex-col shadow-inner shrink-0 relative">
                {/* Accent line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary-600/0 via-secondary-500/50 to-secondary-600/0 opacity-50"></div>

                <div className="bg-dark-bg/80 p-4 border-b border-dark-border/50 flex justify-between items-center backdrop-blur-md sticky top-0 z-10">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <svg className="w-4 h-4 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Active Appeals
                    </h3>
                    <span className="bg-secondary-500/20 text-secondary-400 text-[10px] px-2.5 py-1 rounded-full border border-secondary-500/30 uppercase font-bold tracking-widest shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                        {disputes.length}
                    </span>
                </div>
                <div className="overflow-y-auto custom-scrollbar flex-1 p-3 space-y-3">
                    {disputes.length === 0 && !loading && (
                        <div className="flex flex-col items-center justify-center py-16 text-dark-muted">
                            <div className="w-12 h-12 rounded-full bg-success/10 border border-success/20 flex items-center justify-center mb-3 text-success/70 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">All Clear</span>
                            <span className="text-[10px] uppercase font-mono mt-1 opacity-50">No active disputes</span>
                        </div>
                    )}
                    {disputes.map((d, idx) => (
                        <div
                            key={d.id}
                            onClick={() => setViewingEvidence(d)}
                            className={`p-4 rounded-lg border cursor-pointer transition-all group animate-slide-up ${viewingEvidence?.id === d.id
                                ? 'bg-secondary-500/10 border-secondary-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)] relative overflow-hidden'
                                : 'bg-dark-bg/60 border-dark-border/80 hover:border-secondary-500/30 hover:bg-dark-bg/80'
                                }`}
                            style={{ animationDelay: `${idx * 0.05}s` }}
                        >
                            {viewingEvidence?.id === d.id && (
                                <div className="absolute left-0 top-0 w-1 h-full bg-secondary-500"></div>
                            )}
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-sm font-bold text-white group-hover:text-secondary-300 transition-colors">{d.student_username}</span>
                                <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider shadow-sm ${d.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                                        d.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(52,211,153,0.2)]' :
                                            d.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                                                'bg-dark-bg text-dark-muted border border-dark-border/50'
                                    }`}>
                                    {d.status}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                                <svg className="w-3 h-3 text-dark-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <div className="text-[10px] text-slate-400 font-mono bg-dark-bg px-2 py-0.5 rounded border border-dark-border/50 w-fit">{d.session_name}</div>
                            </div>
                            <div className="text-xs text-slate-300 line-clamp-2 italic opacity-80 pl-2 border-l-2 border-dark-border/50 mt-1">"{d.description}"</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Detail */}
            <div className="flex-1 bg-dark-bg/40 border border-dark-border/50 rounded-xl p-0 flex flex-col items-center justify-center text-dark-muted shadow-inner overflow-hidden relative min-h-[500px]">
                {!viewingEvidence ? (
                    <div className="text-center w-full h-full flex flex-col items-center justify-center absolute inset-0 bg-dark-bg/20 backdrop-blur-sm z-0">
                        <div className="w-24 h-24 mb-6 relative">
                            <div className="absolute inset-0 border-2 border-secondary-500/20 rounded-full animate-ping-slow"></div>
                            <div className="absolute inset-2 border-2 border-primary-500/20 rounded-full animate-spin-slow" style={{ animationDirection: 'reverse' }}></div>
                            <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-30">⚖️</div>
                        </div>
                        <p className="text-sm font-bold text-slate-300 uppercase tracking-widest bg-dark-bg/80 px-4 py-2 rounded-full border border-dark-border/80 shadow-lg backdrop-blur">
                            Select an appeal to review
                        </p>
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col relative z-10 animate-fade-in">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-dark-bg/80 px-6 py-5 border-b border-dark-border/50 backdrop-blur-md relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-600 via-secondary-500 to-primary-600"></div>

                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-dark-bg border border-dark-border/80 flex items-center justify-center text-xl font-bold text-secondary-400 shadow-[0_0_15px_rgba(168,85,247,0.15)] shrink-0">
                                    {viewingEvidence.student_username[0].toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white tracking-wide">{viewingEvidence.student_username}</h3>
                                    <p className="text-xs font-mono text-secondary-400/80 uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                                        Ref: {viewingEvidence.session_name}
                                    </p>
                                </div>
                            </div>
                            <div className="text-left sm:text-right mt-4 sm:mt-0 flex flex-col gap-1 sm:gap-0">
                                <span className="text-[9px] text-dark-muted uppercase font-bold tracking-widest">Submitted</span>
                                <span className="text-xs font-mono text-slate-300 bg-dark-bg px-2.5 py-1 rounded border border-dark-border/50 w-fit sm:ml-auto">
                                    {new Date(viewingEvidence.created_at || Date.now()).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full min-h-[400px]">
                                {/* Image Viewer */}
                                <div className="border border-dark-border/80 bg-dark-bg/80 rounded-xl overflow-hidden flex flex-col relative group shadow-inner">
                                    <div className="absolute top-3 left-3 z-10 text-[10px] bg-dark-bg/80 backdrop-blur-md text-white px-2.5 py-1 rounded border border-dark-border/50 uppercase font-bold tracking-widest flex items-center gap-1.5 shadow-lg">
                                        <svg className="w-3 h-3 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        Session Evidence
                                    </div>

                                    <div className="flex-1 relative flex items-center justify-center bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjMGYxNzJhIj48L3JlY3Q+CjxwYXRoIGQ9Ik0wIDBMOCA4Wk04IDBMMCA4WiIgc3Ryb2tlPSIjMWUzYThhIiBzdHJva2Utd2lkdGg9IjEiPjwvcGF0aD4KPC9zdmc+')]">
                                        {viewingEvidence.evidence_path ? (
                                            <div className="relative w-full h-full flex items-center justify-center p-2">
                                                <div className="relative inline-block max-w-full max-h-full">
                                                    <img
                                                        id="admin-evidence-img"
                                                        src={`${STATIC_URL}/${viewingEvidence.evidence_path}`}
                                                        className="max-w-full max-h-[350px] object-contain rounded border border-dark-border/50 shadow-2xl"
                                                        alt="Evidence"
                                                    />
                                                    {/* Overlay box if coords exist */}
                                                    {viewingEvidence.selected_face_coords && (() => {
                                                        try {
                                                            const raw = viewingEvidence.selected_face_coords;
                                                            const clean = raw.replace(/[\[\]]/g, '').split(',').map(Number);
                                                            if (clean.length === 4) {
                                                                const [y1, x2, y2, x1] = clean;

                                                                // The coords in DB are absolute based on the NATURAL image size.
                                                                // To render them correctly on learning image, we use percentages relative to natural size.
                                                                const imgEl = document.getElementById('admin-evidence-img');
                                                                if (!imgEl || !imgEl.naturalWidth) return null; // Wait for load

                                                                const pX1 = (x1 / imgEl.naturalWidth) * 100;
                                                                const pY1 = (y1 / imgEl.naturalHeight) * 100;
                                                                const pW = ((x2 - x1) / imgEl.naturalWidth) * 100;
                                                                const pH = ((y2 - y1) / imgEl.naturalHeight) * 100;

                                                                return (
                                                                    <div
                                                                        className="absolute border-2 border-secondary-500 box-content shadow-[0_0_15px_rgba(168,85,247,0.6)] bg-secondary-500/10 cursor-pointer group/box"
                                                                        style={{
                                                                            top: `${pY1}%`,
                                                                            left: `${pX1}%`,
                                                                            width: `${pW}%`,
                                                                            height: `${pH}%`
                                                                        }}
                                                                    >
                                                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-secondary-500 text-white text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest whitespace-nowrap opacity-0 group-hover/box:opacity-100 transition-opacity">Claimed Face</div>
                                                                    </div>
                                                                )
                                                            }
                                                        } catch (e) { return null; }
                                                    })()}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center text-dark-muted">
                                                <svg className="w-12 h-12 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                <span className="text-xs uppercase font-bold tracking-widest opacity-50">No Visual Evidence</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Claim Details & Actions */}
                                <div className="flex flex-col gap-6">
                                    <div className="bg-dark-bg/60 border border-dark-border/80 rounded-xl p-5 shadow-inner flex-1 flex flex-col items-center justify-center">
                                        <h4 className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-widest mb-4 w-full justify-center">
                                            <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                            Student Statement
                                        </h4>
                                        <div className="bg-dark-bg border border-dark-border/50 p-6 rounded-lg text-sm text-slate-200 font-mono text-center w-full relative">
                                            <svg className="w-6 h-6 text-primary-500/20 absolute top-2 left-2" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" /></svg>
                                            <svg className="w-6 h-6 text-primary-500/20 absolute bottom-2 right-2 rotate-180" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" /></svg>
                                            <span className="relative z-10">{viewingEvidence.description || "No statement provided."}</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="bg-dark-bg/80 border border-dark-border/80 rounded-xl p-5 shadow-inner flex flex-col sm:flex-row justify-between items-center gap-4">
                                        <div className="text-xs text-dark-muted font-mono uppercase tracking-widest text-center sm:text-left flex-1">
                                            Finalize attendance record
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                            <button
                                                onClick={() => handleResolve(viewingEvidence.id, 'rejected')}
                                                className="btn-outline px-6 py-2.5 text-xs text-rose-400 border-rose-500/50 hover:bg-rose-500/10 hover:border-rose-500 flex items-center justify-center gap-2 group w-full sm:w-auto"
                                            >
                                                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                                Reject Appeal
                                            </button>
                                            <button
                                                onClick={() => handleResolve(viewingEvidence.id, 'approved')}
                                                className="px-6 py-2.5 bg-success/80 hover:bg-success text-white text-xs font-bold uppercase tracking-widest rounded transition-all shadow-[0_0_15px_rgba(34,197,94,0.2)] hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] flex items-center justify-center gap-2 group w-full sm:w-auto"
                                            >
                                                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                Approve Claims
                                            </button>
                                        </div>
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
