import './globals.css';

export const metadata = {
  title: 'RecoverAI — AI Revenue Recovery Agent',
  description: 'Autonomous AI-powered revenue recovery platform for Razorpay track 03',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
