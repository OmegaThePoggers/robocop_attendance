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
        <div className="flex flex-col justify-center items-center h-48 border border-dashed border-border bg-surface rounded-sm">
            <span className="text-textMuted font-mono text-[10px] uppercase tracking-widest animate-pulse">[RETRIEVING_MEDIA...]</span>
        </div>
    );

    if (evidence.length === 0) return (
        <div className="flex flex-col justify-center items-center h-48 border border-dashed border-border bg-surface rounded-sm">
            <span className="text-textMuted font-mono text-[10px] uppercase tracking-widest">[NO_MEDIA]</span>
        </div>
    );

    if (selectedImage) {
        return (
            <div className="flex flex-col gap-3 h-full relative z-30">
                <div className="flex justify-between items-center bg-surface p-2 rounded-sm border border-border">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
                        <span className="text-[10px] text-accent font-mono font-bold tracking-widest uppercase">SELECTION_MODE</span>
                        <span className="text-[10px] text-textMuted font-mono hidden sm:inline-block border-l border-border pl-2">IMG_{selectedImage.id.toString().padStart(4, '0')}</span>
                    </div>
                    <button
                        onClick={() => { setSelectedImage(null); setDragStart(null); setDragEnd(null); }}
                        className="text-[10px] font-mono text-textMuted hover:text-textMain transition-colors bg-background border border-border hover:border-textMain px-2 py-1 rounded-sm uppercase tracking-widest"
                    >
                        [GRID_VIEW]
                    </button>
                </div>

                {/* Use a wrapper div for mouse events so they don't get lost on the overlay */}
                <div
                    ref={containerRef}
                    className="relative rounded-sm border border-border cursor-crosshair overflow-hidden bg-background flex justify-center"
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
                            className="absolute border border-accent bg-accent/20 pointer-events-none"
                            style={{
                                left: Math.min(dragStart.x, dragEnd.x),
                                top: Math.min(dragStart.y, dragEnd.y),
                                width: Math.abs(dragEnd.x - dragStart.x),
                                height: Math.abs(dragEnd.y - dragStart.y)
                            }}
                        />
                    )}

                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-surface text-textMain border border-border text-[10px] px-3 py-1 rounded-sm uppercase tracking-widest font-mono pointer-events-none z-20">
                        DRAG_OVER_FACE
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto custom-scrollbar p-1">
            {evidence.map(item => (
                <div
                    key={item.id}
                    onClick={() => setSelectedImage(item)}
                    className="aspect-video bg-background rounded-sm border border-border relative group cursor-pointer overflow-hidden hover:border-accent transition-colors"
                >
                    <div className="absolute inset-0 bg-accent/10 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
                        <span className="text-textMain font-mono font-bold text-[10px] uppercase tracking-widest border border-border px-2 py-1 rounded-sm bg-surface">
                            [ANALYZE]
                        </span>
                    </div>

                    {item.media_type === 'video' ? (
                        <div className="w-full h-full relative">
                            <div className="absolute top-1 right-1 text-[8px] font-mono uppercase tracking-widest bg-surface text-textMain border border-border px-1.5 py-0.5 rounded-sm flex items-center gap-1 z-20">
                                <span className="w-1 h-1 rounded-full bg-danger animate-pulse"></span> VID
                            </div>
                            <video src={`${STATIC_URL}/${item.file_path}`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        </div>
                    ) : (
                        <img src={`${STATIC_URL}/${item.file_path}`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Evidence Thumbnail" />
                    )}

                    <div className="absolute bottom-0 left-0 right-0 bg-surface border-t border-border p-1 text-[9px] text-textMuted font-mono truncate">
                        {item.file_path.split('/').pop()}
                    </div>
                </div>
            ))}
        </div>
    );
}
