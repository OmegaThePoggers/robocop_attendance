export default function Loading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-dark-bg">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
                <p className="text-dark-muted text-sm font-medium animate-pulse">Loading...</p>
            </div>
        </div>
    );
}
