import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children, admin }: { children: React.ReactNode; admin?: boolean }) {
  const { token, user, loading } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-gray-500 text-sm">
        Loading…
      </div>
    );
  }
  if (!token || !user) return <Navigate to="/login" state={{ from: loc }} replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
