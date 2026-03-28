import { Navigate } from 'react-router';
import { useApp } from '../context/AppContext';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { currentUser } = useApp();
  if (!currentUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
