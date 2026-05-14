import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getUnreadCount } from '../services/api';
import { io } from 'socket.io-client';
import logo from '../assets/logo.png';

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);

const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const ChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const Navbar = () => {
  const { account, user, connect, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  const role = user?.role;
  const isAuthenticated = !!account;

  useEffect(() => {
    if (!isAuthenticated || !user?._id) return;

    const loadUnread = async () => {
      try {
        const res = await getUnreadCount(user._id);
        setUnreadCount(res.count);
      } catch (err) {
        console.error('Failed to load unread count:', err);
      }
    };

    loadUnread();

    const socket = io('http://localhost:5000');
    socket.on(`new_notification_${user._id}`, () => {
      loadUnread();
    });

    return () => socket.disconnect();
  }, [isAuthenticated, user?._id]);
  
  const displayAccount = account 
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : '';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setIsDropdownOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  const renderNavLinks = () => {
    if (!isAuthenticated || !role) {
      return (
        <>
          <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>Home</Link>
          <a href="/#how-it-works" className="nav-link">How it Works</a>
          <a href="/#opportunities" className="nav-link">Opportunities</a>
          <Link to="/security" className={`nav-link ${isActive('/security') ? 'active' : ''}`}>Security</Link>
        </>
      );
    }

    if (role === 'freelancer') {
      return (
        <>
          <Link to="/dashboard/freelancer" className={`nav-link ${isActive('/dashboard/freelancer') ? 'active' : ''}`}>Jobs</Link>
          <Link to="/dashboard/freelancer/applications" className={`nav-link ${isActive('/dashboard/freelancer/applications') ? 'active' : ''}`}>My Applications</Link>
          <Link to="/dashboard/freelancer/profile" className={`nav-link ${isActive('/dashboard/freelancer/profile') ? 'active' : ''}`}>Profile</Link>
          <div className="nav-divider-vertical"></div>
          <a href="/#how-it-works" className="nav-link">How it Works</a>
          <a href="/#opportunities" className="nav-link">Opportunities</a>
        </>
      );
    }

    if (role === 'client') {
      return (
        <>
          <Link to="/dashboard/client" className={`nav-link ${isActive('/dashboard/client') ? 'active' : ''}`}>My Jobs</Link>
          <Link to="/dashboard/client/post-job" className={`nav-link ${isActive('/dashboard/client/post-job') ? 'active' : ''}`}>Post Job</Link>
          <Link to="/dashboard/client/applications" className={`nav-link ${isActive('/dashboard/client/applications') ? 'active' : ''}`}>Applications</Link>
          <div className="nav-divider-vertical"></div>
          <a href="/#how-it-works" className="nav-link">How it Works</a>
          <a href="/#opportunities" className="nav-link">Opportunities</a>
        </>
      );
    }
  };

  return (
    <div className="navbar-wrapper fade-in-nav">
      <nav className="navbar-modern">
        <div className="nav-left">
          <Link to="/" className="nav-brand" state={{ bypassRedirect: true }}>
            <img src={logo} alt="ChainHire" className="nav-logo" />
          </Link>
        </div>

        <div className="nav-middle">
          {renderNavLinks()}
        </div>

        <div className="nav-right">
          {!isAuthenticated ? (
            <div className="nav-actions-guest">
              <button className="btn-glow" onClick={connect}>Connect Wallet</button>
            </div>
          ) : (
            <div className="nav-actions-user">
              <button className="icon-btn" style={{ position: 'relative' }}>
                <BellIcon />
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              </button>
              
              <div className="user-menu-container" ref={dropdownRef}>
                <button 
                  className="user-profile-btn"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <div className="user-avatar">
                    <UserIcon />
                  </div>
                  <span className="wallet-address">{displayAccount}</span>
                  <ChevronDown />
                </button>

                {isDropdownOpen && (
                  <div className="dropdown-menu fade-in-down">
                    <div className="dropdown-header">
                      <span className="dropdown-role">{role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Connected'}</span>
                    </div>
                    
                    {role === 'freelancer' && (
                      <>
                        <Link to="/dashboard/freelancer" className="dropdown-item">Jobs</Link>
                        <Link to="/dashboard/freelancer/applications" className="dropdown-item">My Applications</Link>
                        <Link to="/dashboard/freelancer/profile" className="dropdown-item">Profile</Link>
                      </>
                    )}
                    {role === 'client' && (
                      <>
                        <Link to="/dashboard/client" className="dropdown-item">My Jobs</Link>
                        <Link to="/dashboard/client/post-job" className="dropdown-item">Post Job</Link>
                        <Link to="/dashboard/client/applications" className="dropdown-item">Applications</Link>
                      </>
                    )}
                    
                    <div className="dropdown-divider"></div>
                    <button className="dropdown-item text-danger" onClick={handleLogout}>
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
