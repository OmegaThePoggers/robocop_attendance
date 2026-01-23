import { useState, useRef, useEffect } from 'react';
import { recognizeImage, recognizeVideo, detectFaces } from '../api';

export default function RecognitionPanel() {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [mode, setMode] = useState('image'); // 'image', 'video', 'camera'
    const [results, setResults] = useState(null);
    const [imgDims, setImgDims] = useState({ w: 1, h: 1 });
    const [detectedFaces, setDetectedFaces] = useState([]); // For camera overlay

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    // Start/Stop camera when mode changes
    useEffect(() => {
        if (mode === 'camera') {
            startCamera();
        } else {
            stopCamera();
        }
    }, [mode]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
            }
        } catch (e) {
            console.error(e);
            setMessage({ type: 'error', text: 'Camera access denied or unavailable.' });
        }
    }

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }

    // Polling for face detection in camera mode
    useEffect(() => {
        if (mode !== 'camera') return;

        const interval = setInterval(async () => {
            if (!videoRef.current || !canvasRef.current || loading) return;

            // Capture frame to canvas
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (video.readyState !== 4) return;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert to blob and send
            canvas.toBlob(async (blob) => {
                if (!blob) return;
                const data = await detectFaces(blob); // Returns { faces: [[top, right, bottom, left], ... ] }
                if (data.faces) {
                    setDetectedFaces(data.faces);
                }
            }, 'image/jpeg', 0.5); // Low quality for speed
        }, 300); // 300ms polling

        return () => clearInterval(interval);
    }, [mode, loading]);

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            setFile(selected);
            setPreview(prev => {
                if (prev) URL.revokeObjectURL(prev);
                return URL.createObjectURL(selected);
            });
            setMessage(null);
            setResults(null);
            setDetectedFaces([]);

            if (selected.type.startsWith('video/')) {
                setMode('video');
            } else if (selected.type.startsWith('image/')) {
                setMode('image');
            }
        }
    };

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
            const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
            setFile(file);
            setPreview(URL.createObjectURL(file));
            setMode('image'); // Switch to image mode to view/upload
            setMessage(null);
            setResults(null);
            setDetectedFaces([]); // Clear overlay
            stopCamera();
        }, 'image/jpeg', 0.95);
    }

    const handleUpload = async () => {
        if (!file) return;

        setLoading(true);
        setMessage(null);
        setResults(null);

        try {
            if (mode === 'image') {
                const result = await recognizeImage(file);
                setResults(result);
                const names = result.faces.map(f => f.name).join(', ');
                setMessage({ type: 'success', text: `Processed. Found: ${names}` });
            } else {
                const result = await recognizeVideo(file);
                if (result.status === 'processing') {
                    setMessage({ type: 'success', text: `Job Started: ${result.message}` });
                } else {
                    setResults(result);
                    setMessage({ type: 'success', text: `Processed.` });
                }
            }
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Recognition failed.' });
        } finally {
            setLoading(false);
        }
    };

    // Render detected faces overlay for camera
    const renderCameraOverlay = () => {
        if (detectedFaces.length === 0 || !videoRef.current) return null;

        // We map directly 1:1 since video and overlay are same size usually?
        // Actually CSS scaling might separate them.
        // Best approach: Use percentage based on videoWidth key?
        // Let's rely on standard percentages. Since canvas matches video dims, percentages work.

        // Wait, video might be scaled by CSS.
        // We need detection relative to intrinsic video size.
        const vw = videoRef.current.videoWidth;
        const vh = videoRef.current.videoHeight;
        if (!vw || !vh) return null;

        return detectedFaces.map((face, i) => {
            const [top, right, bottom, left] = face;
            return (
                <div
                    key={i}
                    className="absolute border-2 border-green-400 shadow-[0_0_15px_rgba(74,222,128,0.8)] transition-all duration-75"
                    style={{
                        top: `${(top / vh) * 100}%`,
                        left: `${(left / vw) * 100}%`,
                        width: `${((right - left) / vw) * 100}%`,
                        height: `${((bottom - top) / vh) * 100}%`,
                        pointerEvents: 'none'
                    }}
                />
            );
        });
    }

    // Helper to render boxes for static images
    const renderBoxes = () => {
        if (mode !== 'image' || !results || !results.faces) return null;
        return results.faces.map((face, i) => {
            const [top, right, bottom, left] = face.bounding_box;
            const isUnknown = face.name === "Unknown";
            const colorClass = isUnknown ? "border-red-500" : "border-green-400";
            return (
                <div
                    key={i}
                    className={`absolute border-2 ${colorClass} hover:bg-white/20 group/box transition-all`}
                    style={{
                        top: `${(top / imgDims.h) * 100}%`,
                        left: `${(left / imgDims.w) * 100}%`,
                        width: `${((right - left) / imgDims.w) * 100}%`,
                        height: `${((bottom - top) / imgDims.h) * 100}%`,
                    }}
                >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover/box:opacity-100 z-10 whitespace-nowrap">
                        {face.name} ({((1 - (face.distance || 0)) * 100).toFixed(0)}%)
                    </div>
                </div>
            );
        });
    };

    const renderVideoResults = () => {
        if (mode !== 'video' || !results || !results.identities) return null;
        return (
            <div className="mt-4 grid grid-cols-2 gap-2">
                {results.identities.map((name, i) => (
                    <div key={i} className="bg-robocop-900 p-2 rounded border border-robocop-700 text-white text-sm">
                        {name}
                    </div>
                ))}
            </div>
        )
    }

    const onImgLoad = (e) => {
        setImgDims({ w: e.target.naturalWidth, h: e.target.naturalHeight });
    }

    return (
        <div className="bg-robocop-800 rounded-xl border border-robocop-700 shadow-lg p-6 flex flex-col gap-6">
            <div className="flex justify-between items-center border-b border-robocop-700 pb-4">
                <h2 className="text-xl font-bold text-white">Scanner Input</h2>
                <div className="flex gap-2 bg-robocop-900 p-1 rounded-lg">
                    {['image', 'video', 'camera'].map(m => (
                        <button
                            key={m}
                            onClick={() => {
                                setMode(m);
                                setFile(null);
                                setPreview(null);
                                setMessage(null);
                                setResults(null);
                                setDetectedFaces([]);
                            }}
                            className={`px-3 py-1 text-sm rounded-md capitalize transition-all ${mode === m ? 'bg-robocop-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            {m}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 bg-robocop-900/50 border-2 border-dashed border-robocop-700 rounded-lg flex flex-col items-center justify-center relative min-h-[300px] overflow-hidden group">
                {mode === 'camera' ? (
                    <div className="relative w-full h-full flex items-center justify-center bg-black">
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="max-h-[400px] w-full object-contain"
                        />
                        {/* Overlay */}
                        <div className="absolute inset-0 max-h-[400px] w-full pointer-events-none">
                            {renderCameraOverlay()}
                        </div>
                        {/* Hidden canvas for capture/poll */}
                        <canvas ref={canvasRef} className="hidden" />

                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
                            <button
                                onClick={handleCapture}
                                className="w-16 h-16 rounded-full bg-white border-4 border-robocop-500 shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
                            >
                                <div className="w-12 h-12 rounded-full bg-robocop-500" />
                            </button>
                        </div>
                    </div>
                ) : !preview ? (
                    <div className="text-center p-6 relative z-10">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-robocop-800 flex items-center justify-center">
                            <span className="text-2xl">📷</span>
                        </div>
                        <p className="text-slate-400 mb-2">Drag and drop or click to upload</p>
                        <input
                            type="file"
                            accept={mode === 'image' ? "image/*" : "video/*"}
                            onChange={handleFileChange}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                    </div>
                ) : (
                    <div className="relative inline-block w-full h-full flex items-center justify-center bg-black/50">
                        {mode === 'image' ? (
                            <div className="relative inline-block">
                                <img
                                    src={preview}
                                    onLoad={onImgLoad}
                                    alt="Preview"
                                    className="max-h-[400px] object-contain rounded shadow-xl"
                                />
                                {renderBoxes()}
                            </div>
                        ) : (
                            <video src={preview} controls className="max-h-[400px] max-w-full rounded shadow-xl" />
                        )}
                        <input
                            type="file"
                            accept={mode === 'image' ? "image/*" : "video/*"}
                            onChange={handleFileChange}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                        />
                        <div className="absolute bottom-2 right-2 z-20 pointer-events-none">
                            <span className="text-xs bg-black/60 text-white px-2 py-1 rounded">Click to Change</span>
                        </div>
                    </div>
                )}
            </div>

            {renderVideoResults()}

            {message && (
                <div className={`p-3 rounded-lg text-sm text-center border ${message.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}>
                    {message.text}
                </div>
            )}

            {mode !== 'camera' && (
                <button
                    onClick={handleUpload}
                    disabled={!file || loading}
                    className="w-full py-3 bg-robocop-500 hover:bg-robocop-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-[0_0_15px_rgba(14,165,233,0.4)] transition-all active:scale-[0.98] z-30 relative"
                >
                    {loading ? 'Processing...' : 'Analyze Input'}
                </button>
            )}
        </div>
    );
}
