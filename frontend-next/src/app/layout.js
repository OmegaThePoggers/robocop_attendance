import './globals.css';

export const metadata = {
    title: 'SmartAttend 2.0 — Attendance System',
    description: 'Face recognition-based attendance tracking system',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
