import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const FreelancerIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
  </svg>
);

const ClientIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const RoleSelection = ({ onComplete }) => {
  const { user, loading } = useAuth();
  const [selectedRole, setSelectedRole] = useState(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    // If user already has a role, skip selection
    if (!loading && user && user.role) {
      navigate(`/dashboard/${user.role}`, { replace: true });
    }
  }, [user, loading, navigate]);

  const handleContinue = () => {
    if (selectedRole && onComplete) {
      onComplete(selectedRole);
    }
  };

  const handleGoBack = () => {
    navigate('/', { state: { bypassRedirect: true } });
  };

  if (loading) return null; // Or a loading spinner

  return (
    <div className="role-selection-overlay fade-in">
      <div className="role-selection-container">
        <div className="role-header stagger-1">
          <h2>I am a:</h2>
          <p className="role-subtitle">Choose how you want to use the platform</p>
        </div>
        
        <div className="role-cards stagger-2">
          {/* Freelancer Card */}
          <div 
            className={`role-card ${selectedRole === 'freelancer' ? 'selected' : ''}`}
            onClick={() => setSelectedRole('freelancer')}
          >
            <div className="role-icon-wrapper">
              <FreelancerIcon />
            </div>
            <h3>Freelancer</h3>
            <p>Offer your skills, apply to jobs, and get paid securely through blockchain escrow.</p>
            <div className="selection-indicator">
              <div className="indicator-inner"></div>
            </div>
          </div>

          {/* Client Card */}
          <div 
            className={`role-card ${selectedRole === 'client' ? 'selected' : ''}`}
            onClick={() => setSelectedRole('client')}
          >
            <div className="role-icon-wrapper">
              <ClientIcon />
            </div>
            <h3>Client</h3>
            <p>Post jobs, hire talented freelancers, and pay safely with decentralized escrow.</p>
            <div className="selection-indicator">
              <div className="indicator-inner"></div>
            </div>
          </div>
        </div>

        <div className="role-footer stagger-3" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <button 
            className="btn btn-continue" 
            disabled={!selectedRole}
            onClick={handleContinue}
          >
            Continue to Dashboard
          </button>
          <button 
            className="text-muted" 
            style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            onClick={handleGoBack}
          >
            Click to go back
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
