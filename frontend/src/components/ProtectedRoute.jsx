import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

function ProtectedRoute({ children, allowedRoles }) {
    const token = localStorage.getItem('token');

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;

        if (decoded.exp < currentTime) {
            localStorage.removeItem('token');
            return <Navigate to="/login" replace />;
        }

        if (allowedRoles && !allowedRoles.includes(decoded.role)) {
            // User authenticated but authorized
            // In a real app we might redirect to a 'Forbidden' page
            // Here just stay at specific place or login
            return <Navigate to="/" replace />; // Or show warning
        }

    } catch (e) {
        localStorage.removeItem('token');
        return <Navigate to="/login" replace />;
    }

    return children;
}

export default ProtectedRoute;
