import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth';
import { useAuth } from './session';
import { lazy, Suspense } from 'react';
const Entry = lazy(() => import('./Entry'));
const Recruiter = lazy(() => import('./Recruiter'));
const Candidate = lazy(() => import('./Candidate'));
const Connect = lazy(() => import('./Connect'));
import { ErrorMessage, Loading } from './ui';
import type { ReactNode } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';

function Protected({ kind, children }: { kind: 'candidate' | 'recruiter'; children: ReactNode }) {
  const { user, loading, error } = useAuth();
  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} />;
  if (!user) return <Navigate to="/" replace />;
  if (user.kind !== kind)
    return <Navigate to={user.kind === 'recruiter' ? '/workspace' : '/profile'} replace />;
  return children;
}
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Entry />} />
              <Route
                path="/workspace"
                element={
                  <Protected kind="recruiter">
                    <Recruiter />
                  </Protected>
                }
              />
              <Route
                path="/profile"
                element={
                  <Protected kind="candidate">
                    <Candidate />
                  </Protected>
                }
              />
              <Route path="/connect/:eventId" element={<Connect />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          <Toaster theme="light" position="bottom-right" />
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
