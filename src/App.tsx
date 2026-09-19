import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth';
import { useAuth } from './session';
import Entry from './Entry';
import Recruiter from './Recruiter';
import Candidate from './Candidate';
import Connect from './Connect';
import { ErrorMessage, Loading } from './ui';
import type { ReactNode } from 'react';

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
      </AuthProvider>
    </BrowserRouter>
  );
}
