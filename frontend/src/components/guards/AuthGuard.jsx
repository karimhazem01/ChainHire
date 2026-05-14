import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingScreen from '../LoadingScreen';

const AuthGuard = () => {
  const { account, user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  // Must have a connected wallet
  if (!account) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default AuthGuard;
