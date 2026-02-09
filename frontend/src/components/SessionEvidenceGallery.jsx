import { useState, useEffect } from 'react';
import { getSessionEvidence } from '../api';

export default function SessionEvidenceGallery({ sessionId, onSelectEvidence }) {
    const [evidence, setEvidence] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);

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

    const handleImageClick = (e) => {
        if (!selectedImage) return;

        const rect = e.target.getBoundingClientRect();
        const startX = Math.round(e.clientX - rect.left);
        const startY = Math.round(e.clientY - rect.top);

        // Define a fixed box size for now, or drag-to-select in future
        // For now, let's create a 50x50 box centered on click
        const boxSize = 50;
        const x1 = Math.max(0, startX - boxSize / 2);
        const y1 = Math.max(0, startY - boxSize / 2);
        const x2 = Math.min(rect.width, startX + boxSize / 2);
        const y2 = Math.min(rect.height, startY + boxSize / 2);

        // API expects [top, right, bottom, left]
        // But previously I saw [y, x+10, y+10, x] in the old code.
        // Let's stick to [top, right, bottom, left] format: [y1, x2, y2, x1]
        // Confirmed with backend patterns usually.

        onSelectEvidence(selectedImage.id, [y1, x2, y2, x1], `http://localhost:8000/static/${selectedImage.file_path}`);
    };

    if (loading) return (
        <div className="flex items-col justify-center items-center h-48 border border-dashed border-slate-700 bg-slate-900/50">
            <div className="text-secondary animate-pulse text-xs uppercase tracking-widest">Scanning_Media_Archive...</div>
        </div>
    );

    if (evidence.length === 0) return (
        <div className="flex items-col justify-center items-center h-48 border border-dashed border-slate-700 bg-slate-900/50">
            <div className="text-slate-500 text-xs uppercase tracking-widest">No_Data_Found</div>
        </div>
    );

    if (selectedImage) {
        return (
            <div className="flex flex-col gap-4 h-full">
                <div className="flex justify-between items-center bg-slate-900 p-2 border border-slate-700">
                    <span className="text-[10px] text-secondary uppercase tracking-widest">Analysis_Mode // SRC_{selectedImage.id}</span>
                    <button
                        onClick={() => setSelectedImage(null)}
                        className="text-[10px] text-slate-400 hover:text-white uppercase tracking-wider border border-slate-600 px-2 py-1 hover:bg-slate-800"
                    >
                        [ Return_to_Grid ]
                    </button>
                </div>

                <div className="relative border border-secondary/50 group cursor-crosshair overflow-hidden bg-black flex justify-center">
                    {/* Scanline overlay */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(189,0,255,0.03)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none z-10"></div>

                    <img
                        src={`http://localhost:8000/static/${selectedImage.file_path}`}
                        className="max-w-full max-h-[60vh] object-contain"
                        onClick={handleImageClick}
                        alt="Evidence"
                    />

                    <div className="absolute top-4 left-4 bg-black/80 text-secondary border border-secondary/30 text-[10px] px-3 py-1 uppercase tracking-widest pointer-events-none z-20">
                        Select_Subject_Face
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto custom-scrollbar p-1">
            {evidence.map(item => (
                <div
                    key={item.id}
                    onClick={() => setSelectedImage(item)}
                    className="aspect-video bg-black border border-slate-800 relative group cursor-pointer overflow-hidden hover:border-secondary transition-all"
                >
                    <div className="absolute inset-0 bg-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
                        <span className="text-secondary font-bold text-xs uppercase tracking-widest border border-secondary px-2 py-1 bg-black/80">Analyze</span>
                    </div>

                    {item.media_type === 'video' ? (
                        <div className="w-full h-full relative">
                            <div className="absolute top-2 right-2 text-[10px] bg-black/50 text-white px-1">VID</div>
                            <video src={`http://localhost:8000/static/${item.file_path}`} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                        </div>
                    ) : (
                        <img src={`http://localhost:8000/static/${item.file_path}`} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="Evidence Thumbnail" />
                    )}

                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 text-[8px] text-slate-500 font-mono truncate border-t border-slate-800">
                        {item.file_path.split('/').pop()}
                    </div>
                </div>
            ))}
        </div>
    );
}
