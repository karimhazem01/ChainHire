import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingScreen from '../LoadingScreen';

const RoleGuard = () => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user || !user.role) {
    return <Navigate to="/select-role" replace />;
  }

  return <Outlet />;
};

export default RoleGuard;
