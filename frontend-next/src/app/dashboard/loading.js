export default function DashboardLoading() {
    return (
        <div className="min-h-screen bg-dark-bg p-6 animate-pulse">
            {/* Header skeleton */}
            <div className="flex items-center justify-between mb-8">
                <div className="h-8 w-48 bg-dark-border/50 rounded-lg"></div>
                <div className="flex gap-3">
                    <div className="h-10 w-24 bg-dark-border/50 rounded-lg"></div>
                    <div className="h-10 w-24 bg-dark-border/50 rounded-lg"></div>
                </div>
            </div>

            {/* Stats skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-dark-border/30 rounded-xl border border-dark-border/50"></div>
                ))}
            </div>

            {/* Table skeleton */}
            <div className="bg-dark-border/20 rounded-xl border border-dark-border/50 p-4 space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-12 bg-dark-border/30 rounded-lg"></div>
                ))}
            </div>
        </div>
    );
}
