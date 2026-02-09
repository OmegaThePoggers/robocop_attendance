import { useRef, useEffect, useState } from 'react';
import { recognizeImage, recognizeVideo, detectFaces } from '../api';

export default function RecognitionPanel({ activeSession }) {
    const videoRef = useRef(null);
    const [mode, setMode] = useState('camera'); // 'image', 'video', 'camera'
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [detectedFaces, setDetectedFaces] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState('');

    // Camera Stream Logic
    useEffect(() => {
        let stream = null;
        const startCamera = async () => {
            if (mode === 'camera' && videoRef.current) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    videoRef.current.srcObject = stream;
                } catch (err) {
                    console.error("Camera Access Error:", err);
                    setMessage("CAMERA ERROR: CHECK PERMISSIONS");
                }
            }
        };

        if (mode === 'camera') startCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [mode]);

    // Live Detection Loop
    useEffect(() => {
        let interval;
        if (mode === 'camera' && activeSession) {
            interval = setInterval(async () => {
                if (videoRef.current && !processing) {
                    // Capture frame
                    const canvas = document.createElement('canvas');
                    canvas.width = videoRef.current.videoWidth;
                    canvas.height = videoRef.current.videoHeight;
                    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);

                    try {
                        const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg'));
                        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });

                        const response = await recognizeImage(activeSession.id, file);
                        if (response && response.faces) {
                            setDetectedFaces(response.faces);
                        }
                    } catch (e) {
                        console.error("Frame processing failed", e);
                    }
                }
            }, 3000); // 3s polling
        }
        return () => clearInterval(interval);
    }, [mode, activeSession, processing]);


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
        setProcessing(true);
        setMessage("PROCESSING MEDIA...");
        try {
            if (mode === 'image') await recognizeImage(activeSession.id, file);
            if (mode === 'video') await recognizeVideo(activeSession.id, file);
            setMessage("PROCESSING COMPLETE. LOGS UPDATED.");
        } catch (e) {
            setMessage("PROCESSING FAILED.");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-black relative">
            {/* Toolbar */}
            <div className="flex border-b border-slate-800 bg-slate-900/50">
                <button
                    onClick={() => setMode('camera')}
                    className={`flex-1 py-3 text-[10px] uppercase font-bold tracking-wider transition-colors ${mode === 'camera' ? 'bg-primary/20 text-primary border-b-2 border-primary' : 'text-slate-500 hover:text-white'
                        }`}
                >
                    Live Cam
                </button>
                <button
                    onClick={() => setMode('image')}
                    className={`flex-1 py-3 text-[10px] uppercase font-bold tracking-wider transition-colors ${mode === 'image' ? 'bg-primary/20 text-primary border-b-2 border-primary' : 'text-slate-500 hover:text-white'
                        }`}
                >
                    Upload Image
                </button>
                <button
                    onClick={() => setMode('video')}
                    className={`flex-1 py-3 text-[10px] uppercase font-bold tracking-wider transition-colors ${mode === 'video' ? 'bg-primary/20 text-primary border-b-2 border-primary' : 'text-slate-500 hover:text-white'
                        }`}
                >
                    Upload Video
                </button>
            </div>

            {/* Viewport */}
            <div className="flex-1 bg-black relative group overflow-hidden">
                {/* Grid Overlay - subtle */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

                {mode === 'camera' && (
                    <div className="h-full w-full relative">
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-contain opacity-90"
                        />
                        {activeSession && (
                            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 px-2 py-1 rounded text-red-500 text-xs font-bold animate-pulse z-20">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                REC
                            </div>
                        )}

                        {/* Detected Faces Overlay */}
                        {detectedFaces.map((face, i) => {
                            if (!videoRef.current) return null;
                            const videoW = videoRef.current.videoWidth;
                            const videoH = videoRef.current.videoHeight;
                            if (!videoW || !videoH) return null;

                            const [top, right, bottom, left] = face.bounding_box;

                            return (
                                <div
                                    key={i}
                                    className="absolute border-2 border-green-500 bg-green-500/10 z-10"
                                    style={{
                                        top: `${(top / videoH) * 100}%`,
                                        left: `${(left / videoW) * 100}%`,
                                        width: `${((right - left) / videoW) * 100}%`,
                                        height: `${((bottom - top) / videoH) * 100}%`
                                    }}
                                >
                                    <div className="absolute -top-6 left-0 bg-green-500 text-black text-[10px] font-bold px-1 rounded">
                                        {face.name} ({Math.round((face.distance || 0) * 100) / 100})
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {(mode === 'image' || mode === 'video') && (
                    <div className="h-full w-full flex flex-col items-center justify-center p-6 text-slate-500">
                        {preview ? (
                            mode === 'image' ? (
                                <img src={preview} alt="Preview" className="max-h-full max-w-full border border-slate-700 rounded shadow-lg" />
                            ) : (
                                <video src={preview} controls className="max-h-full max-w-full border border-slate-700 rounded shadow-lg" />
                            )
                        ) : (
                            <div className="border-2 border-dashed border-slate-800 rounded-lg p-12 text-center">
                                <div className="text-4xl mb-4 opacity-50">📂</div>
                                <p className="text-xs uppercase tracking-widest">Select Media File</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Controls */}
            {mode !== 'camera' && (
                <div className="p-4 border-t border-slate-800 bg-slate-900">
                    <input
                        type="file"
                        accept={mode === 'image' ? "image/*" : "video/*"}
                        onChange={handleFileChange}
                        className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700 mb-4"
                    />
                    <button
                        onClick={handleProcess}
                        disabled={!file || processing}
                        className="w-full py-2 bg-primary hover:bg-primary/80 text-slate-950 font-bold uppercase text-xs rounded transition-all disabled:opacity-50"
                    >
                        {processing ? 'Processing...' : 'Upload & Analyze'}
                    </button>
                    {message && <div className="mt-2 text-[10px] text-center text-primary font-mono">{message}</div>}
                </div>
            )}
        </div>
    );
}
