import './globals.css';

export const metadata = {
    title: {
        default: 'SmartAttend 2.0 — Attendance System',
        template: '%s | SmartAttend 2.0',
    },
    description: 'Face recognition-based attendance tracking system',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
