import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const GuestGuard = () => {
  const { account, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // Return null or the Outlet while loading to prevent premature redirection
    return <Outlet />;
  }

  if (location.state?.bypassRedirect) {
    return <Outlet />;
  }

  if (account && user && user.role) {
    return <Navigate to={`/dashboard/${user.role}`} replace />;
  } else if (account && (!user || !user.role)) {
    return <Navigate to="/select-role" replace />;
  }

  return <Outlet />;
};

export default GuestGuard;
