"use client";

export default function Error({ error, reset }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-dark-bg p-6">
            <div className="max-w-md w-full glass-panel-heavy p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/20 mb-6 mx-auto">
                    <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
                <p className="text-dark-muted text-sm mb-6">
                    {error?.message || "An unexpected error occurred. Please try again."}
                </p>
                <button
                    onClick={() => reset()}
                    className="btn-primary px-6 py-2.5"
                >
                    Try Again
                </button>
            </div>
        </div>
    );
}
