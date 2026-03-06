"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { getSessionEvidence, STATIC_URL } from '../lib/api';

export default function SessionEvidenceGallery({ sessionId, onSelectEvidence }) {
    const [evidence, setEvidence] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const imgRef = useRef(null);

    useEffect(() => {
        if (!sessionId) return;
        async function load() {
            setLoading(true);
            try {
                const data = await getSessionEvidence(sessionId);
                setEvidence(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [sessionId]);

    const [dragStart, setDragStart] = useState(null);
    const [dragEnd, setDragEnd] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef(null);

    // Get coordinates relative to the container div
    const getRelativeCoords = useCallback((e) => {
        const container = containerRef.current;
        if (!container) return null;
        const rect = container.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    }, []);

    const handleMouseDown = useCallback((e) => {
        e.preventDefault();
        const pos = getRelativeCoords(e);
        if (!pos) return;
        setDragStart(pos);
        setDragEnd(pos);
        setIsDragging(true);
    }, [getRelativeCoords]);

    const handleMouseMove = useCallback((e) => {
        if (!isDragging) return;
        const pos = getRelativeCoords(e);
        if (!pos) return;
        setDragEnd(pos);
    }, [isDragging, getRelativeCoords]);

    const handleMouseUp = useCallback((e) => {
        if (!isDragging) return;
        setIsDragging(false);

        const img = imgRef.current;
        const container = containerRef.current;
        if (!img || !container || !dragStart) return;

        const pos = getRelativeCoords(e);
        if (!pos) return;

        // Calculate the image's actual rendered position within the container
        const containerRect = container.getBoundingClientRect();
        const imgRect = img.getBoundingClientRect();

        // Offset of the image within the container (from flex justify-center)
        const imgOffsetX = imgRect.left - containerRect.left;
        const imgOffsetY = imgRect.top - containerRect.top;

        // Scale from rendered image size to natural image size
        const scaleX = img.naturalWidth / imgRect.width;
        const scaleY = img.naturalHeight / imgRect.height;

        // Translate container coords to image coords
        const startX = (dragStart.x - imgOffsetX) * scaleX;
        const startY = (dragStart.y - imgOffsetY) * scaleY;
        const endX = (pos.x - imgOffsetX) * scaleX;
        const endY = (pos.y - imgOffsetY) * scaleY;

        const x1 = Math.round(Math.min(startX, endX));
        const y1 = Math.round(Math.min(startY, endY));
        const x2 = Math.round(Math.max(startX, endX));
        const y2 = Math.round(Math.max(startY, endY));

        // Format: [top, right, bottom, left]
        if (x2 - x1 > 10 && y2 - y1 > 10) {
            onSelectEvidence(selectedImage.id, [y1, x2, y2, x1], `${STATIC_URL}/${selectedImage.file_path}`);
        }

        setDragStart(null);
        setDragEnd(null);
    }, [isDragging, dragStart, getRelativeCoords, selectedImage, onSelectEvidence]);

    if (loading) return (
        <div className="flex flex-col justify-center items-center h-48 border border-dashed border-dark-border bg-dark-bg/50 rounded-xl">
            <svg className="animate-spin h-8 w-8 text-primary-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div className="text-primary-400 font-medium text-sm animate-pulse tracking-wide">Retrieving session media...</div>
        </div>
    );

    if (evidence.length === 0) return (
        <div className="flex flex-col justify-center items-center h-48 border border-dashed border-dark-border bg-dark-bg/50 rounded-xl">
            <svg className="w-10 h-10 text-dark-muted mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <div className="text-dark-muted text-sm font-medium">No media available for this session.</div>
        </div>
    );

    if (selectedImage) {
        return (
            <div className="flex flex-col gap-4 h-full relative z-30">
                <div className="flex justify-between items-center bg-dark-bg/80 p-3 rounded-lg border border-dark-border backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
                        <span className="text-xs text-primary-400 font-semibold tracking-wide uppercase">Selection Mode</span>
                        <span className="text-xs text-dark-muted font-mono hidden sm:inline-block border-l border-dark-border/50 pl-2">IMG_{selectedImage.id.toString().padStart(4, '0')}</span>
                    </div>
                    <button
                        onClick={() => { setSelectedImage(null); setDragStart(null); setDragEnd(null); }}
                        className="text-xs text-dark-muted hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-md flex items-center gap-1.5"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        Grid View
                    </button>
                </div>

                {/* Use a wrapper div for mouse events so they don't get lost on the overlay */}
                <div
                    ref={containerRef}
                    className="relative rounded-xl border border-primary-500/30 group cursor-crosshair overflow-hidden bg-black/80 flex justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={() => { if (isDragging) { setIsDragging(false); setDragStart(null); setDragEnd(null); } }}
                >
                    <img
                        ref={imgRef}
                        src={`${STATIC_URL}/${selectedImage.file_path}`}
                        className="max-w-full max-h-[50vh] object-contain select-none pointer-events-none"
                        draggable="false"
                        alt="Evidence"
                    />

                    {isDragging && dragStart && dragEnd && (
                        <div
                            className="absolute border-2 border-primary-400 bg-primary-500/20 pointer-events-none shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                            style={{
                                left: Math.min(dragStart.x, dragEnd.x),
                                top: Math.min(dragStart.y, dragEnd.y),
                                width: Math.abs(dragEnd.x - dragStart.x),
                                height: Math.abs(dragEnd.y - dragStart.y)
                            }}
                        />
                    )}

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md text-white border border-white/20 text-xs px-4 py-2 rounded-full uppercase tracking-wider font-semibold pointer-events-none z-20 shadow-lg flex items-center gap-2">
                        <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                        Click &amp; Drag over your face
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto custom-scrollbar p-2">
            {evidence.map(item => (
                <div
                    key={item.id}
                    onClick={() => setSelectedImage(item)}
                    className="aspect-video bg-dark-bg/50 rounded-lg border border-dark-border relative group cursor-pointer overflow-hidden hover:border-primary-500/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-all"
                >
                    <div className="absolute inset-0 bg-primary-900/40 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center backdrop-blur-[2px]">
                        <span className="text-white font-bold text-xs uppercase tracking-wider border border-white/50 px-3 py-1.5 rounded bg-black/40 flex items-center gap-2 shadow-lg">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                            Analyze
                        </span>
                    </div>

                    {item.media_type === 'video' ? (
                        <div className="w-full h-full relative">
                            <div className="absolute top-2 right-2 text-[10px] uppercase font-bold tracking-wider bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span> VID
                            </div>
                            <video src={`${STATIC_URL}/${item.file_path}`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        </div>
                    ) : (
                        <img src={`${STATIC_URL}/${item.file_path}`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Evidence Thumbnail" />
                    )}

                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent pt-6 pb-2 px-3 text-[10px] text-slate-300 font-mono truncate">
                        {item.file_path.split('/').pop()}
                    </div>
                </div>
            ))}
        </div>
    );
}
