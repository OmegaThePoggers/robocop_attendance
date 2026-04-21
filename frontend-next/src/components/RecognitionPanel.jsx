"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import { recognizeImage, recognizeVideo, detectFaces } from '../lib/api';

export default function RecognitionPanel({ activeSession, onUpdate }) {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const streamRef = useRef(null);
    const processingRef = useRef(false);
    const [mode, setMode] = useState('camera');
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [detectedFaces, setDetectedFaces] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState('');
    const [lastDetectionTime, setLastDetectionTime] = useState(null);

    // Stop any active camera stream
    const stopStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    const switchMode = (newMode) => {
        stopStream();
        setDetectedFaces([]);
        setFile(null);
        setPreview(null);
        setMode(newMode);
        setMessage('');
    };

    // Camera Stream Logic
    useEffect(() => {
        if (mode !== 'camera') return;

        let cancelled = false;
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
                });
                if (cancelled) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Camera Access Error:", err);
                setMessage("CAMERA ERROR: CHECK PERMISSIONS");
            }
        };

        startCamera();

        return () => {
            cancelled = true;
            stopStream();
        };
    }, [mode, stopStream]);

    // Live Detection Loop — with concurrent request guard
    useEffect(() => {
        let interval;
        if (mode === 'camera' && activeSession) {
            interval = setInterval(async () => {
                // Skip if already processing a frame or video isn't ready
                if (processingRef.current) return;
                if (!videoRef.current || videoRef.current.videoWidth === 0) return;

                processingRef.current = true;
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = videoRef.current.videoWidth;
                    canvas.height = videoRef.current.videoHeight;
                    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);

                    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.8));
                    const captureFile = new File([blob], "capture.jpg", { type: "image/jpeg" });

                    const response = await recognizeImage(activeSession.id, captureFile);
                    if (response && response.faces) {
                        setDetectedFaces(response.faces);
                        setLastDetectionTime(Date.now());

                        // Trigger attendance refresh if any faces were recognized
                        const recognized = response.faces.filter(f => f.name !== "Unknown");
                        if (recognized.length > 0 && onUpdate) {
                            onUpdate();
                        }
                    }
                } catch (e) {
                    console.error("Frame processing failed", e);
                } finally {
                    processingRef.current = false;
                }
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [mode, activeSession, onUpdate]);

    // Compute bounding box position accounting for object-contain
    const computeBoxStyle = useCallback((face) => {
        if (!videoRef.current || !containerRef.current) return null;

        const videoW = videoRef.current.videoWidth;
        const videoH = videoRef.current.videoHeight;
        if (!videoW || !videoH) return null;

        const containerW = containerRef.current.clientWidth;
        const containerH = containerRef.current.clientHeight;

        // Compute the actual rendered video dimensions inside object-contain
        const videoAspect = videoW / videoH;
        const containerAspect = containerW / containerH;

        let renderW, renderH, offsetX, offsetY;
        if (videoAspect > containerAspect) {
            // Video wider than container — letterboxed vertically
            renderW = containerW;
            renderH = containerW / videoAspect;
            offsetX = 0;
            offsetY = (containerH - renderH) / 2;
        } else {
            // Video taller — pillarboxed horizontally
            renderH = containerH;
            renderW = containerH * videoAspect;
            offsetX = (containerW - renderW) / 2;
            offsetY = 0;
        }

        const [top, right, bottom, left] = face.bounding_box;

        return {
            top: `${offsetY + (top / videoH) * renderH}px`,
            left: `${offsetX + (left / videoW) * renderW}px`,
            width: `${((right - left) / videoW) * renderW}px`,
            height: `${((bottom - top) / videoH) * renderH}px`,
        };
    }, []);


    const handleFileChange = (e) => {
        const f = e.target.files[0];
        if (f) {
            setFile(f);
            setPreview(URL.createObjectURL(f));
            setDetectedFaces([]);
            setMessage('');
        }
    };

    const handleProcess = async () => {
        if (!activeSession) {
            alert("Please start a session first.");
            return;
        }
        if (!file) {
            setMessage("Please select a file first.");
            return;
        }
        setProcessing(true);
        setMessage("Processing media... Please wait.");
        try {
            let response;
            if (mode === 'image') {
                response = await recognizeImage(activeSession.id, file);
            } else if (mode === 'video') {
                response = await recognizeVideo(activeSession.id, file);
            }
            if (response && response.faces) {
                setDetectedFaces(response.faces);
            }
            setMessage("Processing complete. Attendance logs updated.");
            if (onUpdate) onUpdate();
        } catch (e) {
            console.error("Upload process failed:", e);
            setMessage(`Processing failed: ${e.message || 'Please try again.'}`);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-black relative">
            {/* Toolbar */}
            <div className="flex border-b border-dark-border/50 bg-dark-bg/80 backdrop-blur-md">
                <button
                    onClick={() => switchMode('camera')}
                    className={`flex-1 py-3 text-xs uppercase font-bold tracking-widest transition-all ${mode === 'camera' ? 'bg-primary-500/10 text-primary-400 border-b-2 border-primary-500 shadow-[inset_0_-2px_10px_rgba(99,102,241,0.2)]' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                        }`}
                >
                    <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        Live Cam
                    </span>
                </button>
                <button
                    onClick={() => switchMode('image')}
                    className={`flex-1 py-3 text-xs uppercase font-bold tracking-widest transition-all ${mode === 'image' ? 'bg-primary-500/10 text-primary-400 border-b-2 border-primary-500 shadow-[inset_0_-2px_10px_rgba(99,102,241,0.2)]' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                        }`}
                >
                    <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        Image Upload
                    </span>
                </button>
                <button
                    onClick={() => switchMode('video')}
                    className={`flex-1 py-3 text-xs uppercase font-bold tracking-widest transition-all ${mode === 'video' ? 'bg-primary-500/10 text-primary-400 border-b-2 border-primary-500 shadow-[inset_0_-2px_10px_rgba(99,102,241,0.2)]' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                        }`}
                >
                    <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>
                        Video Upload
                    </span>
                </button>
            </div>

            {/* Viewport */}
            <div className="flex-1 bg-black relative group overflow-hidden" ref={containerRef}>
                {/* Modern subtle grid */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05)_0,transparent_100%)] pointer-events-none z-0"></div>

                {mode === 'camera' && (
                    <div className="h-full w-full relative z-10 animate-fade-in">
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-contain opacity-95 group-hover:opacity-100 transition-opacity"
                        />
                        {activeSession && (
                            <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-rose-500/30 text-rose-500 text-[10px] uppercase font-bold tracking-widest shadow-[0_0_15px_rgba(244,63,94,0.3)] z-20">
                                <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping absolute"></div>
                                <div className="w-2 h-2 bg-rose-500 rounded-full relative"></div>
                                REC
                            </div>
                        )}

                        {/* Detection flash indicator */}
                        {lastDetectionTime && (
                            <div
                                key={lastDetectionTime}
                                className="absolute inset-0 border-2 border-primary-400/40 pointer-events-none z-10 animate-[ping_0.5s_ease-out_1]"
                            />
                        )}

                        {/* Target Reticle (Decorative) */}
                        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center opacity-30">
                            <div className="w-64 h-64 border border-white/20 rounded-full relative">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-4 bg-white/50"></div>
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1 h-4 bg-white/50"></div>
                                <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 h-1 w-4 bg-white/50"></div>
                                <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 h-1 w-4 bg-white/50"></div>
                            </div>
                        </div>

                        {/* Detected Faces Overlay — pixel-positioned for object-contain */}
                        {detectedFaces.map((face, i) => {
                            const boxStyle = computeBoxStyle(face);
                            if (!boxStyle) return null;

                            const isUnknown = face.name === "Unknown";

                            return (
                                <div
                                    key={i}
                                    className={`absolute border-2 z-30 transition-all duration-300 ${isUnknown ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'border-success shadow-[0_0_15px_rgba(34,197,94,0.5)]'}`}
                                    style={boxStyle}
                                >
                                    {/* Corner Accents */}
                                    <div className={`absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 ${isUnknown ? 'border-amber-400' : 'border-emerald-400'}`}></div>
                                    <div className={`absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 ${isUnknown ? 'border-amber-400' : 'border-emerald-400'}`}></div>
                                    <div className={`absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 ${isUnknown ? 'border-amber-400' : 'border-emerald-400'}`}></div>
                                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 ${isUnknown ? 'border-amber-400' : 'border-emerald-400'}`}></div>

                                    {/* Label */}
                                    <div className={`absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded backdrop-blur-md text-[10px] font-bold tracking-wider whitespace-nowrap border ${isUnknown ? 'bg-amber-500/80 text-black border-amber-400' : 'bg-success/80 text-black border-emerald-400'}`}>
                                        {face.name.replace('student_', '')} <span className="opacity-70 font-mono ml-1">{(Math.round((face.distance || 0) * 100) / 100).toFixed(2)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {(mode === 'image' || mode === 'video') && (
                    <div className="h-full w-full flex flex-col items-center justify-center p-8 z-10 relative animate-fade-in">
                        {preview ? (
                            <div className="relative max-h-full max-w-full rounded-xl overflow-hidden shadow-2xl border border-dark-border group-hover:border-primary-500/30 transition-colors">
                                {mode === 'image' ? (
                                    <img src={preview} alt="Preview" className="max-h-[60vh] max-w-full object-contain" />
                                ) : (
                                    <video src={preview} controls className="max-h-[60vh] max-w-full" />
                                )}
                                <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-xl pointer-events-none"></div>
                            </div>
                        ) : (
                            <div className="glass-panel w-full max-w-md p-10 flex flex-col items-center justify-center text-center border-dashed border-2 hover:border-primary-500/50 hover:bg-white/5 transition-all cursor-pointer rounded-2xl">
                                <div className="w-16 h-16 rounded-full bg-dark-bg/80 flex items-center justify-center mb-4 text-primary-400 shadow-inner">
                                    {mode === 'image' ? (
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    ) : (
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                    )}
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">Upload {mode === 'image' ? 'Image' : 'Video'}</h3>
                                <p className="text-xs text-dark-muted font-medium">Drag and drop or select a file to begin analysis</p>

                                <input
                                    type="file"
                                    accept={mode === 'image' ? "image/*" : "video/*"}
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Controls */}
            {mode !== 'camera' && (
                <div className="p-5 border-t border-dark-border/50 bg-dark-bg/80 backdrop-blur-md relative z-20">
                    <div className="flex items-center gap-4 max-w-2xl mx-auto">
                        <div className="flex-grow flex justify-end gap-2">
                            {file && (
                                <button
                                    onClick={() => { setFile(null); setPreview(null); setMessage(''); }}
                                    disabled={processing}
                                    className="bg-transparent hover:bg-white/5 text-slate-300 py-3 px-6 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                                >
                                    Clear Selection
                                </button>
                            )}
                            <button
                                onClick={handleProcess}
                                disabled={!file || processing}
                                className="btn-primary py-3 px-8 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {processing ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                        Process Media
                                    </>
                                )}
                            </button>
                        </div>
                        {message && (
                            <div className={`mt-3 text-xs text-center font-medium font-mono ${message.includes('complete') ? 'text-success' : message.includes('failed') ? 'text-rose-500' : 'text-primary-400'}`}>
                                {message}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
