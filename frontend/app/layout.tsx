import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from './context/AuthContext';
import PrefetchMonitor  from '../components/PrefetchMonitor'
import { AppViewProvider } from './context/AppViewContext';

export const metadata: Metadata = {
  title: 'LLM Service Monitor',
  description: 'Monitor OpenAI, Anthropic, Gemini, and Grok',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppViewProvider>
            <div className="shell">
              {/* <div className="pill">LLM observability</div> */}
              <PrefetchMonitor />
              {children}
            </div>
          </AppViewProvider>
        </AuthProvider>
      </body>
    </html>
  );
}