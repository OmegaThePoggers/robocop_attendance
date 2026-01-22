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

    const handleImageClick = (e, sourceId) => {
        if (selectedImage?.id === sourceId) {
            // If already selecting on this image, capture click coords
            const rect = e.target.getBoundingClientRect();
            const x = Math.round(e.clientX - rect.left);
            const y = Math.round(e.clientY - rect.top);

            // Normalize to image dimensions?
            // Easiest is to send relative pixels or percentage.
            // Let's send raw pixels for now, but backend might need image dims.
            // Better: Send [top, right, bottom, left] as a point [y, x, y, x].
            // Or just [x, y].
            // Implementation logic in API expects List[int].
            onSelectEvidence(sourceId, [y, x + 10, y + 10, x]); // Small box around click
        } else {
            // Select this image for viewing
            const source = evidence.find(i => i.id === sourceId);
            setSelectedImage(source);
        }
    };

    if (loading) return <div className="text-center p-4 text-slate-400">Loading evidence...</div>;
    if (evidence.length === 0) return <div className="text-center p-4 text-slate-500">No evidence media found for this session.</div>;

    if (selectedImage) {
        return (
            <div className="flex flex-col gap-2">
                <button onClick={() => setSelectedImage(null)} className="text-sm text-robocop-400 mb-2">
                    &larr; Back to Gallery
                </button>
                <div className="relative border-2 border-robocop-500 rounded overflow-hidden group cursor-crosshair">
                    <img
                        src={`${import.meta.env.VITE_API_URL}/static/${selectedImage.file_path}`}
                        className="w-full h-auto"
                        onClick={(e) => handleImageClick(e, selectedImage.id)}
                    />
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded pointer-events-none">
                        Click on your face to select it
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
            {evidence.map(item => (
                <div
                    key={item.id}
                    onClick={() => setSelectedImage(item)}
                    className="aspect-square bg-black rounded overflow-hidden cursor-pointer hover:border-2 hover:border-robocop-400"
                >
                    {item.media_type === 'video' ? (
                        <video src={`${import.meta.env.VITE_API_URL}/static/${item.file_path}`} className="w-full h-full object-cover" />
                    ) : (
                        <img src={`${import.meta.env.VITE_API_URL}/static/${item.file_path}`} className="w-full h-full object-cover" />
                    )}
                </div>
            ))}
        </div>
    );
}
