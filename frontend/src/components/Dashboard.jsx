import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Dashboard = () => {
  const { user } = useAuth();
  const role = user?.role;
  const location = useLocation();

  if (location.pathname === '/dashboard' || location.pathname === '/dashboard/') {
    return <Navigate to={`/dashboard/${role}`} replace />;
  }

  return (
    <div className="dashboard-layout" style={{ paddingTop: '100px', minHeight: '100vh' }}>
      <div className="container" style={{ maxWidth: '1440px' }}>
        <Outlet />
      </div>
    </div>
  );
};

export default Dashboard;
