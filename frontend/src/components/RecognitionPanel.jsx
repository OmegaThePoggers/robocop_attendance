import { useState, useRef, useEffect } from 'react';
import { recognizeImage, recognizeVideo } from '../api';

export default function RecognitionPanel() {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [mode, setMode] = useState('image'); // 'image' or 'video'
    const [results, setResults] = useState(null);
    const [imgDims, setImgDims] = useState({ w: 1, h: 1 });
    const imgRef = useRef(null);

    // Reset results when file changes
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

            // Auto-detect mode
            if (selected.type.startsWith('video/')) {
                setMode('video');
            } else if (selected.type.startsWith('image/')) {
                setMode('image');
            }
        }
    };

    // Cleanup object URL on unmount
    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        }
    }, [preview]);

    const onImgLoad = (e) => {
        setImgDims({ w: e.target.naturalWidth, h: e.target.naturalHeight });
    }

    const handleUpload = async () => {
        if (!file) return;

        setLoading(true);
        setMessage(null);
        setResults(null);

        try {
            if (mode === 'image') {
                const result = await recognizeImage(file);
                setResults(result); // { faces: [...] }
                const names = result.faces.map(f => f.name).join(', ');
                setMessage({ type: 'success', text: `Processed.` });
            } else {
                const result = await recognizeVideo(file);

                if (result.status === 'processing') {
                    // Async response
                    setMessage({
                        type: 'success',
                        text: `Background Job Started: ${result.message}`
                    });
                } else {
                    // Sync response (fallback)
                    setResults(result);
                    const names = result.identities.join(', ');
                    setMessage({
                        type: 'success',
                        text: `Processed (${result.total_frames_processed} frames). Found: ${names}`
                    });
                }
            }
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Recognition failed. check server.' });
        } finally {
            setLoading(false);
        }
    };

    // Helper to render boxes for images (This is now mostly handled by drawBoxes, but kept for consistency if needed)
    const renderBoxes = () => {
        if (mode !== 'image' || !results || !results.faces) return null;

        // If drawBoxes is used to modify the preview, this renderBoxes might not be needed
        // or it could be used to render interactive overlays.
        // For now, it's kept as is, assuming drawBoxes updates the preview image itself.
        // If drawBoxes is not used, this would render the boxes as before.
        return results.faces.map((face, i) => {
            const [top, right, bottom, left] = face.bounding_box;
            // Calculate percentages
            const style = {
                top: `${(top / imgDims.h) * 100}%`,
                left: `${(left / imgDims.w) * 100}%`,
                width: `${((right - left) / imgDims.w) * 100}%`,
                height: `${((bottom - top) / imgDims.h) * 100}%`,
            };

            const isUnknown = face.name === "Unknown";
            const colorClass = isUnknown ? "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "border-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]";
            const bgClass = isUnknown ? "bg-red-500/20" : "bg-green-500/20";

            return (
                <div
                    key={i}
                    className={`absolute border-2 ${colorClass} ${bgClass} transition-all hover:bg-opacity-40 group/box`}
                    style={style}
                >
                    {/* Tooltip */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover/box:opacity-100 transition-opacity z-10 pointer-events-none">
                        {face.name} ({((1 - (face.distance || 0)) * 100).toFixed(1)}%)
                    </div>
                </div>
            );
        });
    };

    // Helper for video results
    const renderVideoResults = () => {
        if (mode !== 'video' || !results || !results.identities) return null;

        return (
            <div className="mt-4 grid grid-cols-2 gap-2">
                {results.identities.map((name, i) => {
                    const meta = results.metadata?.[name];
                    const conf = meta ? (1 - meta.distance) * 100 : 0;
                    return (
                        <div key={i} className="bg-robocop-900 p-2 rounded border border-robocop-700 flex justify-between items-center">
                            <span className="text-white font-medium">{name}</span>
                            {meta && (
                                <span className={`text-xs px-2 py-0.5 rounded ${conf > 60 ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                                    {conf.toFixed(1)}%
                                </span>
                            )}
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <div className="bg-robocop-800 rounded-xl border border-robocop-700 shadow-lg p-6 flex flex-col gap-6">
            <div className="flex justify-between items-center border-b border-robocop-700 pb-4">
                <h2 className="text-xl font-bold text-white">Scanner Input</h2>
                <div className="flex gap-2 bg-robocop-900 p-1 rounded-lg">
                    <button
                        onClick={() => { setMode('image'); setFile(null); setPreview(null); setMessage(null); setResults(null); }}
                        className={`px-3 py-1 text-sm rounded-md transition-all ${mode === 'image' ? 'bg-robocop-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Image
                    </button>
                    <button
                        onClick={() => { setMode('video'); setFile(null); setPreview(null); setMessage(null); setResults(null); }}
                        className={`px-3 py-1 text-sm rounded-md transition-all ${mode === 'video' ? 'bg-robocop-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Video
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-robocop-900/50 border-2 border-dashed border-robocop-700 rounded-lg flex flex-col items-center justify-center relative min-h-[300px] overflow-hidden">
                {!preview ? (
                    <div className="text-center p-6 pointer-events-none">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-robocop-800 flex items-center justify-center">
                            <span className="text-2xl">📷</span>
                        </div>
                        <p className="text-slate-400 mb-2">Drag and drop or click to upload</p>
                        <p className="text-xs text-slate-500 uppercase tracking-widest">{mode === 'image' ? 'JPG / PNG' : 'MP4 / AVI'}</p>
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

                        {/* Change File Button Overlay */}
                        <div className="absolute bottom-2 right-2 z-20">
                            <span className="text-xs bg-black/60 text-white px-2 py-1 rounded pointer-events-none">Click to Change</span>
                        </div>
                    </div>
                )}
                <input
                    type="file"
                    accept={mode === 'image' ? "image/*" : "video/*"}
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
            </div>

            {renderVideoResults()}

            {message && (
                <div className={`p-3 rounded-lg text-sm text-center border ${message.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}>
                    {message.text}
                </div>
            )}

            <button
                onClick={handleUpload}
                disabled={!file || loading}
                className="w-full py-3 bg-robocop-500 hover:bg-robocop-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-[0_0_15px_rgba(14,165,233,0.4)] transition-all active:scale-[0.98] z-30 relative"
            >
                {loading ? 'Processing...' : 'Analyze Input'}
            </button>
        </div>
    );
}
