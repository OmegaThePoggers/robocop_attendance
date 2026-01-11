import { useState } from 'react';
import { recognizeImage, recognizeVideo } from '../api';

export default function RecognitionPanel() {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [mode, setMode] = useState('image'); // 'image' or 'video'

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            setFile(selected);
            setPreview(URL.createObjectURL(selected));
            setMessage(null);

            // Auto-detect mode
            if (selected.type.startsWith('video/')) {
                setMode('video');
            } else if (selected.type.startsWith('image/')) {
                setMode('image');
            }
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setLoading(true);
        setMessage(null);

        try {
            let result;
            if (mode === 'image') {
                result = await recognizeImage(file);
                const names = result.faces.map(f => f.name).join(', ');
                setMessage({ type: 'success', text: `Identified: ${names || 'No faces found'}` });
            } else {
                result = await recognizeVideo(file);
                const names = result.identities.join(', ');
                setMessage({
                    type: 'success',
                    text: `Identified: ${names || 'Unknown'} (${result.total_frames_processed} frames)`
                });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Recognition failed. check server.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-robocop-800 rounded-xl border border-robocop-700 shadow-lg p-6 flex flex-col gap-6">
            <div className="flex justify-between items-center border-b border-robocop-700 pb-4">
                <h2 className="text-xl font-bold text-white">Scanner Input</h2>
                <div className="flex gap-2 bg-robocop-900 p-1 rounded-lg">
                    <button
                        onClick={() => { setMode('image'); setFile(null); setPreview(null); setMessage(null); }}
                        className={`px-3 py-1 text-sm rounded-md transition-all ${mode === 'image' ? 'bg-robocop-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Image
                    </button>
                    <button
                        onClick={() => { setMode('video'); setFile(null); setPreview(null); setMessage(null); }}
                        className={`px-3 py-1 text-sm rounded-md transition-all ${mode === 'video' ? 'bg-robocop-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Video
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-robocop-900/50 border-2 border-dashed border-robocop-700 rounded-lg flex items-center justify-center relative min-h-[300px] group hover:border-robocop-500/50 transition-colors">
                {!preview ? (
                    <div className="text-center p-6">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-robocop-800 flex items-center justify-center group-hover:bg-robocop-700 transition">
                            <span className="text-2xl">📷</span>
                        </div>
                        <p className="text-slate-400 mb-2">Drag and drop or click to upload</p>
                        <p className="text-xs text-slate-500 uppercase tracking-widest">{mode === 'image' ? 'JPG / PNG' : 'MP4 / AVI'}</p>
                    </div>
                ) : (
                    mode === 'image' ?
                        <img src={preview} alt="Preview" className="max-h-full max-w-full object-contain rounded" /> :
                        <video src={preview} controls className="max-h-full max-w-full rounded" />
                )}
                <input
                    type="file"
                    accept={mode === 'image' ? "image/*" : "video/*"}
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                />
            </div>

            {message && (
                <div className={`p-3 rounded-lg text-sm text-center border ${message.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}>
                    {message.text}
                </div>
            )}

            <button
                onClick={handleUpload}
                disabled={!file || loading}
                className="w-full py-3 bg-robocop-500 hover:bg-robocop-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-[0_0_15px_rgba(14,165,233,0.4)] transition-all active:scale-[0.98]"
            >
                {loading ? 'Processing...' : 'Analyze Input'}
            </button>
        </div>
    );
}
