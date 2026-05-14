import { Routes, Route, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import AppLayout from './components/AppLayout';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import FreelancerDashboard from './components/dashboards/FreelancerDashboard';
import FreelancerApplications from './components/dashboards/FreelancerApplications';
import FreelancerProfile from './components/dashboards/FreelancerProfile';
import ClientDashboard from './components/dashboards/ClientDashboard';
import ClientPostJob from './components/dashboards/ClientPostJob';
import ClientApplications from './components/dashboards/ClientApplications';
import Security from './components/Security';
import RoleSelection from './components/RoleSelection';
import AuthGuard from './components/guards/AuthGuard';
import RoleGuard from './components/guards/RoleGuard';
import GuestGuard from './components/guards/GuestGuard';
import { useAuth } from './hooks/useAuth';

function App() {
  const { account, connect, login, loading: isCheckingAuth } = useAuth();
  const navigate = useNavigate();

  const handleRoleSelectionComplete = async (selectedRole) => {
    try {
      const user = await login(selectedRole);
      navigate(`/dashboard/${user.role}`);
    } catch (error) {
      console.error("Failed to authenticate with backend", error);
      toast.error(`Authentication failed: ${error.message || "Please check backend connection."}`);
    }
  };

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          
          <Route path="/security" element={<Security />} />

          <Route element={<AuthGuard />}>
            <Route path="/select-role" element={<RoleSelection onComplete={handleRoleSelectionComplete} />} />
            
            <Route element={<RoleGuard />}>
              <Route path="/dashboard" element={<Dashboard />}>
                {/* Freelancer routes */}
                <Route path="freelancer" element={<FreelancerDashboard />} />
                <Route path="freelancer/applications" element={<FreelancerApplications />} />
                <Route path="freelancer/profile" element={<FreelancerProfile />} />
                
                {/* Client routes */}
                <Route path="client" element={<ClientDashboard />} />
                <Route path="client/post-job" element={<ClientPostJob />} />
                <Route path="client/applications" element={<ClientApplications />} />
              </Route>
            </Route>
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App;
