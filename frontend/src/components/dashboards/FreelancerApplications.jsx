import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import ChatModal from '../messaging/ChatModal';
import { io } from 'socket.io-client';
import { getApplications, getJobs, getUnreadCount } from '../../services/api';

const FreelancerApplications = () => {
  const { user: currentUser } = useAuth();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({});
  
  // Chat state
  const [chatConfig, setChatConfig] = useState({
    isOpen: false,
    jobId: null,
    jobTitle: '',
    otherUser: null,
    applicationStatus: ''
  });

  const freelancerId = currentUser?._id;

  const loadData = useCallback(async () => {
    if (!freelancerId) {
      setIsLoading(false);
      return;
    }
    
    if (applications.length === 0) setIsLoading(true);
    
    try {
      const appsData = await getApplications({ freelancerId });
      const myApps = (appsData.applications || []).map(app => {
        return {
          ...app,
          jobTitle: app.jobId?.title || 'Unknown Job',
          jobBudget: app.jobId?.budget || '—',
          jobStatus: app.jobId?.status || 'Unknown'
        };
      });
      setApplications(myApps);

      // Load unread counts per app
      const res = await fetch(`http://localhost:5000/api/messages/unread-per-app/${freelancerId}`);
      const data = await res.json();
      setUnreadCounts(data.counts || {});

    } catch (err) {
      console.error("Error loading applications:", err);
    } finally {
      setIsLoading(false);
    }
  }, [freelancerId, applications.length]);

  useEffect(() => {
    loadData();

    if (!freelancerId) return;
    const socket = io('http://localhost:5000');
    socket.on(`new_notification_${freelancerId}`, () => {
      fetch(`http://localhost:5000/api/messages/unread-per-app/${freelancerId}`)
        .then(res => res.json())
        .then(data => setUnreadCounts(data.counts || {}))
        .catch(console.error);
    });

    return () => socket.disconnect();
  }, [loadData, freelancerId]);

  const openChat = (app) => {
    // For freelancers, the 'otherUser' is the client who posted the job
    // We need to ensure app.jobId.clientId is populated or available
    setChatConfig({
      isOpen: true,
      jobId: app.jobId?._id || app.jobId,
      jobTitle: app.jobTitle,
      otherUser: app.jobId?.clientId, // Assuming populated in backend
      applicationStatus: app.status
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'accepted': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'pending': return '#f59e0b';
      default: return 'var(--text-muted)';
    }
  };

  if (isLoading && applications.length === 0) {
    return (
      <div className="text-center text-muted" style={{ padding: '4rem 0' }}>
        <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
        Loading your applications...
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="dashboard-header">
        <h2>My Applications</h2>
        <p className="text-muted">Track the status of jobs you've applied to</p>
      </div>

      {applications.length === 0 ? (
        <div className="glass-panel text-center" style={{ padding: '3rem' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: '1rem', opacity: 0.5 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
          <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>No applications yet</h3>
          <p className="text-muted">Browse available gigs in the Jobs tab and start applying!</p>
        </div>
      ) : (
        <div className="applications-grid">
          {applications.map(app => (
            <div key={app._id || app.id} className="glass-panel application-detail-card">
              <div className="app-detail-header">
                <div>
                  <h3 style={{ color: 'var(--text-main)', marginBottom: '0.25rem' }}>{app.jobTitle}</h3>
                  <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                    Budget: <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{app.jobBudget} ETH</span>
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {/* Freelancers can only chat if accepted or client messaged (logic handled in ChatModal but we show the button if they have an app) */}
                  <button className="icon-btn-text" onClick={() => openChat(app)} title="Message Client" style={{ position: 'relative' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    <span>Message</span>
                    {unreadCounts[app.jobId?._id || app.jobId] > 0 && (
                      <span className="notification-badge" style={{ top: '-8px', right: '-8px' }}>
                        {unreadCounts[app.jobId?._id || app.jobId]}
                      </span>
                    )}
                  </button>
                  <span 
                    className={`status-badge ${app.status?.toLowerCase()}`}
                    style={{ 
                      borderColor: getStatusColor(app.status),
                      color: getStatusColor(app.status)
                    }}
                  >
                    {app.status}
                  </span>
                </div>
              </div>

              <div className="app-detail-body">
                <p className="text-muted" style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>
                  "{app.message}"
                </p>
              </div>

              <div className="app-detail-footer">
                <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                  Job Status: <span className={`status-badge ${app.jobStatus?.toLowerCase()}`}>{app.jobStatus}</span>
                </span>
                {app.createdAt && (
                  <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                    Applied: {new Date(app.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chat Modal */}
      {chatConfig.isOpen && (
        <ChatModal 
          isOpen={chatConfig.isOpen}
          onClose={() => setChatConfig(prev => ({ ...prev, isOpen: false }))}
          jobId={chatConfig.jobId}
          jobTitle={chatConfig.jobTitle}
          currentUser={currentUser}
          otherUser={chatConfig.otherUser}
          applicationStatus={chatConfig.applicationStatus}
        />
      )}
    </div>
  );
};

export default FreelancerApplications;
