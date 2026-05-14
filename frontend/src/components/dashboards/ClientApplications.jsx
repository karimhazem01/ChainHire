import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import ChatModal from '../messaging/ChatModal';
import { io } from 'socket.io-client';
import { getJobs, getApplications, acceptApplication, rejectApplication, getApplicantInfo } from '../../services/api';
import { getContract, getWeb3Provider } from '../../utils/web3';
import { ethers } from 'ethers';

const ClientApplications = () => {
  const { user: currentUser, isWrongNetwork } = useAuth();
  const [applicationsReceived, setApplicationsReceived] = useState([]);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [txLoading, setTxLoading] = useState(null); // application ID being processed
  
  // Chat state
  const [chatConfig, setChatConfig] = useState({
    isOpen: false,
    jobId: null,
    jobTitle: '',
    otherUser: null,
    applicationStatus: ''
  });

  const clientId = currentUser?._id;

  const loadData = useCallback(async () => {
    if (!clientId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const jobsData = await getJobs();
      const allJobs = jobsData.jobs || [];
      const clientJobs = allJobs.filter(j => j.clientId === clientId || j.clientId?._id === clientId);
      if (clientJobs.length === 0) {
        setApplicationsReceived([]);
        return;
      }

      const appsData = await getApplications({ jobId: clientJobs.map(j => j._id).join(',') });
      const enrichedApps = (appsData.applications || []).map(app => {
        const job = allJobs.find(j => j._id === (app.jobId?._id || app.jobId));
        const fData = app.freelancerId && typeof app.freelancerId === 'object'
          ? app.freelancerId
          : { walletAddress: 'Unknown', name: 'Unknown Freelancer', bio: '', skills: [] };
        return {
          ...app,
          jobTitle: job?.title || app.jobId?.title || 'Unknown Job',
          jobData: job,
          freelancerWallet: fData.walletAddress,
          freelancerData: fData
        };
      });
      setApplicationsReceived(enrichedApps);
      
      // Load unread counts
      const res = await fetch(`http://localhost:5000/api/messages/unread-per-app/${clientId}`);
      const countData = await res.json();
      setUnreadCounts(countData.counts || {});

    } catch (err) { console.error("Error loading applications:", err); }
    finally { setIsLoading(false); }
  }, [clientId]);

  useEffect(() => {
    loadData();

    if (!clientId) return;
    const socket = io('http://localhost:5000');
    socket.on(`new_notification_${clientId}`, () => {
      fetch(`http://localhost:5000/api/messages/unread-per-app/${clientId}`)
        .then(res => res.json())
        .then(data => setUnreadCounts(data.counts || {}))
        .catch(console.error);
    });

    return () => socket.disconnect();
  }, [loadData, clientId]);

  const openChat = (app) => {
    setChatConfig({
      isOpen: true,
      jobId: app.jobId?._id || app.jobId,
      jobTitle: app.jobTitle,
      otherUser: app.freelancerData,
      applicationStatus: app.status
    });
  };

  const handleUpdateAppStatus = async (appId, status, jobId) => {
    if (isWrongNetwork && status === 'Accepted') {
      toast.error("Please switch to Sepolia Testnet to fund this job.");
      return;
    }

    try {
      if (status === 'Accepted') {
        const app = applicationsReceived.find(a => (a._id || a.id) === appId);
        if (!app || !app.jobData) throw new Error("Job details not found");

        const freelancerWallet = app.freelancerWallet;
        if (!freelancerWallet || freelancerWallet === 'Unknown') {
          toast.error("Freelancer wallet address is required to fund the escrow.");
          return;
        }

        setTxLoading(appId);
        
        try {
          const provider = getWeb3Provider();
          const signer = await provider.getSigner();
          const contract = await getContract(signer);

          const budgetInWei = ethers.parseEther(app.jobData.budget.toString());
          const deadlineTimestamp = Math.floor(new Date(app.jobData.deadline).getTime() / 1000);

          console.log(`Funding job ${jobId} with ${app.jobData.budget} ETH...`);
          
          const tx = await contract.fundJob(jobId, freelancerWallet, deadlineTimestamp, {
            value: budgetInWei
          });

          console.log("Transaction sent:", tx.hash);
          await tx.wait();
          console.log("Transaction confirmed!");
          
          // 1. Accept the application in MongoDB
          await acceptApplication(jobId, appId);

          // 2. Update the Job status in MongoDB to 'Funded'
          await fetch(`http://localhost:5000/api/jobs/${jobId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Funded' })
          });

          toast.success("Application accepted and escrow funded successfully!");
        } catch (web3Err) {
          console.error("Blockchain transaction failed:", web3Err);
          let msg = "Failed to fund escrow.";
          if (web3Err.code === 'ACTION_REJECTED') msg = "Transaction rejected in MetaMask.";
          else if (web3Err.message.includes("insufficient funds")) msg = "Insufficient ETH to fund the job.";
          else if (web3Err.message.includes("Deadline must be in the future")) msg = "Job deadline must be in the future.";
          
          toast.error(msg);
          setTxLoading(null);
          return;
        }
      } else if (status === 'Rejected') {
        await rejectApplication(jobId, appId);
      }
      
      if (chatConfig.isOpen && chatConfig.jobId === jobId) {
        setChatConfig(prev => ({ ...prev, applicationStatus: status }));
      }
      
      loadData();
    } catch (err) { 
      console.error(err); 
      toast.error(`Failed to ${status.toLowerCase()} application`); 
    } finally {
      setTxLoading(null);
    }
  };

  const handleViewApplicant = async (app) => {
    setSelectedApplicant(app.freelancerData);
    const fId = app.freelancerId?._id || app.freelancerId;
    const wallet = app.freelancerWallet;

    if (fId) {
      try {
        const data = await getApplicantInfo(fId);
        let updatedUser = data.user;

        if (wallet && wallet !== 'Unknown' && !isWrongNetwork) {
          try {
            const provider = getWeb3Provider();
            const contract = await getContract(provider);
            const rep = await contract.getReputation(wallet);
            updatedUser = {
              ...updatedUser,
              reputation: {
                points: Number(rep[0]),
                jobsDone: Number(rep[1]),
                earned: ethers.formatEther(rep[2])
              }
            };
          } catch (e) { console.warn("Failed to fetch reputation:", e.message); }
        }

        if (updatedUser) setSelectedApplicant(updatedUser);
      } catch (err) { console.error("Error fetching applicant:", err); }
    }
  };

  const handleViewResume = (resumeData) => {
    if (!resumeData) return;
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write('<iframe src="' + resumeData + '" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>');
    }
  };

  if (isLoading) return <div className="text-center text-muted" style={{ padding: '4rem 0' }}>Loading applications...</div>;

  return (
    <div className="fade-in">
      <div className="dashboard-header">
        <h2>Applications Received</h2>
        <p className="text-muted">Review proposals from top Web3 talent</p>
      </div>

      {applicationsReceived.length === 0 ? (
        <div className="glass-panel text-center" style={{ padding: '3rem' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: '1rem', opacity: 0.5 }}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>No applications yet</h3>
          <p className="text-muted">Post some jobs to start receiving applications from freelancers!</p>
        </div>
      ) : (
        <div className="job-feed">
          {applicationsReceived.map(app => (
            <div key={app._id || app.id} className="glass-panel application-card">
              <div className="app-card-header">
                <div>
                  <h4 className="text-accent hover-underline" style={{ cursor: 'pointer', fontWeight: 600, display: 'inline-block' }} onClick={() => handleViewApplicant(app)} title="View Freelancer Profile">
                    {app.freelancerWallet || (typeof app.freelancerId === 'object' ? app.freelancerId?.walletAddress : app.freelancerId)}
                  </h4>
                  <div className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    Applied for: <span style={{ color: 'var(--text-main)' }}>{app.jobTitle}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button className="icon-btn-text" onClick={() => openChat(app)} title="Message Applicant" style={{ position: 'relative' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    <span>Message</span>
                    {unreadCounts[app.jobId?._id || app.jobId] > 0 && (
                      <span className="notification-badge" style={{ top: '-8px', right: '-8px' }}>
                        {unreadCounts[app.jobId?._id || app.jobId]}
                      </span>
                    )}
                  </button>
                  <span className={`status-badge ${app.status?.toLowerCase()}`}>{app.status}</span>
                </div>
              </div>
              <p className="app-message">"{app.message}"</p>
              {app.status === 'Pending' && (
                <div className="app-card-actions">
                  <button 
                    className="btn-outline-subtle success-hover" 
                    onClick={() => handleUpdateAppStatus(app._id || app.id, 'Accepted', app.jobId?._id || app.jobId)}
                    disabled={txLoading !== null}
                  >
                    {txLoading === (app._id || app.id) ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="loading-spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></div>
                        <span>Funding...</span>
                      </div>
                    ) : 'Accept'}
                  </button>
                  <button 
                    className="btn-outline-subtle danger-hover" 
                    onClick={() => handleUpdateAppStatus(app._id || app.id, 'Rejected', app.jobId?._id || app.jobId)}
                    disabled={txLoading !== null}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* View Applicant Profile Modal */}
      {selectedApplicant && (
        <div className="modal-overlay"><div className="glass-panel modal-content fade-in-down" style={{ maxWidth: '600px' }}>
          <div className="modal-header"><h2>Freelancer Profile</h2><button className="icon-btn" onClick={() => setSelectedApplicant(null)}>✕</button></div>
          
          <div className="profile-header">
            <div className="profile-avatar-large">
              {selectedApplicant.profileImage ? <img src={selectedApplicant.profileImage} alt="Profile" className="avatar-image" /> : (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              )}
            </div>
            <div>
              <h3>{selectedApplicant.name || "Anonymous User"}</h3>
              <span className="wallet-badge">{selectedApplicant.walletAddress}</span>
              
              {selectedApplicant.reputation && (
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>
                    <div style={{ fontWeight: 800, color: 'var(--primary)' }}>{selectedApplicant.reputation.points}</div>
                    <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Reputation</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>
                    <div style={{ fontWeight: 800, color: '#10b981' }}>{selectedApplicant.reputation.jobsDone}</div>
                    <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Jobs Done</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="profile-body" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>Skills</h4>
              <div className="skills-container">
                {selectedApplicant.skills && (Array.isArray(selectedApplicant.skills) ? selectedApplicant.skills.length > 0 : selectedApplicant.skills.trim().length > 0) ? (
                  (Array.isArray(selectedApplicant.skills) ? selectedApplicant.skills : selectedApplicant.skills.split(',')).map((skill, i) => <span key={i} className="skill-tag">{skill.trim()}</span>)
                ) : <span className="text-muted">No skills listed.</span>}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>Bio</h4>
              <p className="text-muted" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.95rem' }}>{selectedApplicant.bio || "No bio available."}</p>
            </div>

            {/* Resume Section */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>Resume</h4>
              {selectedApplicant.resume ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'rgba(99,102,241,0.08)', borderRadius: '0.5rem' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                  <button onClick={() => handleViewResume(selectedApplicant.resume)} style={{ background: 'none', border: 'none', color: 'var(--primary)', padding: 0, fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'underline', fontWeight: 500 }}>View Applicant's Resume</button>
                </div>
              ) : <p className="text-muted" style={{ fontSize: '0.9rem' }}>No resume uploaded.</p>}
            </div>

            {/* Portfolio Section */}
            <div>
              <h4 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>Portfolio</h4>
              {selectedApplicant.portfolio && selectedApplicant.portfolio.length > 0 ? (
                <div className="portfolio-list" style={{ gap: '0.75rem' }}>
                  {selectedApplicant.portfolio.map((item, index) => (
                    <div key={index} className="portfolio-item" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)' }}>
                      <div style={{ flex: 1 }}>
                        <h5 style={{ color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>{item.title}</h5>
                        {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-accent" style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>{item.url}</a>}
                        {item.description && <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>{item.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-muted" style={{ fontSize: '0.9rem' }}>No portfolio items provided.</p>}
            </div>
          </div>

          <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
            <button className="btn-glow w-100" onClick={() => setSelectedApplicant(null)}>Close Profile</button>
          </div>
        </div></div>
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

export default ClientApplications;
