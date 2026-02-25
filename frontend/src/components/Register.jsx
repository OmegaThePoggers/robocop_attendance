import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerTeacher, registerUser } from '../api';

export default function Register() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [idNumber, setIdNumber] = useState(''); // Serves as SAP ID or Teacher ID
    const [role, setRole] = useState('student');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Photo state
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [captureMethod, setCaptureMethod] = useState('webcam'); // 'webcam' or 'upload'

    const navigate = useNavigate();

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setCameraActive(true);
            setCaptureMethod('webcam');
            setError('');
        } catch (err) {
            setError("Cannot access webcam. Please allow permissions or use file upload.");
        }
    };

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setCameraActive(false);
    }, [stream]);

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            context.drawImage(videoRef.current, 0, 0);

            canvasRef.current.toBlob((blob) => {
                const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
                setPhotoFile(file);
                setPhotoPreview(URL.createObjectURL(blob));
                stopCamera();
            }, 'image/jpeg', 0.9);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError("Please select a valid image file.");
                return;
            }
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
            setCaptureMethod('upload');
            setError('');
        }
    };

    const retakePhoto = () => {
        setPhotoFile(null);
        setPhotoPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (captureMethod === 'webcam') {
            startCamera();
        }
    };

    const validateForm = () => {
        if (!fullName.trim() || !username.trim() || !password.trim() || !idNumber.trim()) {
            setError("All fields are required.");
            return false;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return false;
        }
        if (role === 'student' && !photoFile) {
            setError("Biometric photo is required for student registration.");
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!validateForm()) return;

        setLoading(true);
        try {
            if (role === 'teacher') {
                // Teacher registration: username, password, fullName (API doesn't specifically require teacher ID currently, but we can pass it or update API later. We assume basic teacher reg for now)
                await registerTeacher(username, password, fullName);
                // Optionally send teacher ID if backend API gets updated to accept it
            } else {
                // Student registration
                await registerUser(username, password, fullName, idNumber, photoFile);
            }
            navigate('/login', { state: { message: 'Registration successful! Please sign in.' } });
        } catch (err) {
            setError(err.message || 'An error occurred during registration.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 relative z-10 w-full">
            <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-5 glass-panel-heavy overflow-hidden">

                {/* Left Side: Branding & Info */}
                <div className="hidden md:flex flex-col justify-between p-10 bg-gradient-to-br from-primary-900/40 to-dark-bg border-r border-dark-border/50 md:col-span-2 relative overflow-hidden">
                    <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary-600/20 rounded-full blur-3xl"></div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20 mb-6">
                            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2 leading-tight">Create your<br />account.</h2>
                        <p className="text-dark-muted text-sm mt-4">Join the automated biometric attendance platform to secure your records instantly.</p>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="p-8 sm:p-10 md:col-span-3 bg-dark-bg/40">
                    <div className="md:hidden flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white">Create Account</h2>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/50 text-red-500 text-sm rounded-lg flex items-start gap-2 animate-fade-in">
                                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Role Selection Tabs */}
                        <div className="flex bg-dark-bg p-1 rounded-xl border border-dark-border">
                            <button
                                type="button"
                                onClick={() => { setRole('student'); setError(''); }}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${role === 'student' ? 'bg-primary-600 text-white shadow-md' : 'text-dark-muted hover:text-white hover:bg-dark-border/50'}`}
                            >
                                Student
                            </button>
                            <button
                                type="button"
                                onClick={() => { setRole('teacher'); setError(''); }}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${role === 'teacher' ? 'bg-primary-600 text-white shadow-md' : 'text-dark-muted hover:text-white hover:bg-dark-border/50'}`}
                            >
                                Teacher
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label className="label-text">Full Name</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={fullName}
                                    placeholder="John Doe"
                                    onChange={e => setFullName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="label-text">Username</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={username}
                                    placeholder="johndoe"
                                    onChange={e => setUsername(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label className="label-text">Password</label>
                                <input
                                    type="password"
                                    className="input-field"
                                    value={password}
                                    placeholder="••••••••"
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="label-text">{role === 'student' ? 'SAP ID' : 'Teacher ID'}</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={idNumber}
                                    placeholder={role === 'student' ? "e.g. 70322300066" : "e.g. TCH-1234"}
                                    onChange={e => setIdNumber(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Biometric Section for Students */}
                        {role === 'student' && (
                            <div className="pt-4 mt-2 border-t border-dark-border/50 animate-fade-in">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="label-text !mb-0 text-white font-semibold">Biometric Identity</label>
                                    {!photoPreview && !cameraActive && (
                                        <div className="text-xs text-dark-muted flex gap-2">
                                            <button type="button" onClick={startCamera} className="hover:text-primary-400 transition-colors">Use Camera</button>
                                            <span>or</span>
                                            <button type="button" onClick={() => fileInputRef.current?.click()} className="hover:text-primary-400 transition-colors">Upload Photo</button>
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-dark-muted mb-4">Provide a clear, front-facing photo for facial recognition.</p>

                                {/* Input State */}
                                {!photoPreview && !cameraActive && (
                                    <div className="w-full border-2 border-dashed border-dark-border rounded-xl p-8 flex flex-col items-center justify-center gap-4 bg-dark-bg/30 hover:bg-dark-bg/50 transition-colors group">
                                        <div className="flex gap-4">
                                            <button
                                                type="button"
                                                onClick={startCamera}
                                                className="flex flex-col items-center gap-2 p-4 rounded-lg bg-dark-border/30 hover:bg-primary-600/20 hover:text-primary-400 transition-colors text-dark-muted border border-transparent hover:border-primary-500/30"
                                            >
                                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                <span className="text-sm font-medium">Take Photo</span>
                                            </button>

                                            <div className="w-px bg-dark-border my-2"></div>

                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex flex-col items-center gap-2 p-4 rounded-lg bg-dark-border/30 hover:bg-primary-600/20 hover:text-primary-400 transition-colors text-dark-muted border border-transparent hover:border-primary-500/30"
                                            >
                                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                <span className="text-sm font-medium">Upload File</span>
                                            </button>
                                        </div>
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                                    </div>
                                )}

                                {/* Camera State */}
                                {cameraActive && (
                                    <div className="space-y-4 animate-fade-in">
                                        <div className="aspect-video bg-black rounded-xl overflow-hidden border border-primary-500/30 relative shadow-glow">
                                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                                            <div className="absolute inset-0 border-2 border-primary-500/50 rounded-xl pointer-events-none opacity-50"></div>
                                        </div>
                                        <div className="flex gap-3">
                                            <button type="button" onClick={capturePhoto} className="flex-1 btn-primary py-2.5">
                                                Capture Photo
                                            </button>
                                            <button type="button" onClick={stopCamera} className="px-6 btn-secondary py-2.5">
                                                Cancel
                                            </button>
                                        </div>
                                        <canvas ref={canvasRef} className="hidden" />
                                    </div>
                                )}

                                {/* Preview State */}
                                {photoPreview && (
                                    <div className="space-y-4 animate-fade-in">
                                        <div className="aspect-video bg-black rounded-xl overflow-hidden border border-success/50 relative">
                                            <img src={photoPreview} className="w-full h-full object-cover" alt="Captured identity" />
                                            <div className="absolute top-3 right-3 bg-success/90 backdrop-blur-sm text-black text-xs font-bold px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-lg">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                Ready
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <button type="button" onClick={retakePhoto} className="flex-1 btn-secondary py-2.5 flex justify-center items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                Reset Photo
                                            </button>
                                        </div>
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="pt-6">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-primary py-3.5 text-base shadow-primary-500/25 flex justify-center items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Processing...
                                    </>
                                ) : 'Complete Registration'}
                            </button>
                        </div>

                        <p className="text-center text-sm text-dark-muted mt-6">
                            Already have an account?{' '}
                            <button type="button" onClick={() => navigate('/login')} className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                                Sign in
                            </button>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
