import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

const WalletIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
    <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"></path>
    <path d="M4 6v12c0 1.1.9 2 2 2h14v-4"></path>
    <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"></path>
  </svg>
);

const Home = () => {
  const { account, user, connect } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appliedJobIds, setAppliedJobIds] = useState([]);
  const navigate = useNavigate();

  const fetchJobs = async () => {
    try {
      setLoading(true);
      
      const fetchJobsPromise = axios.get('http://localhost:5000/api/jobs');
      const fetchAppsPromise = (user?._id && user?.role === 'freelancer')
        ? axios.get(`http://localhost:5000/api/applications?freelancerId=${user._id}`)
        : Promise.resolve({ data: { applications: [] } });

      const [jobsRes, appsRes] = await Promise.all([fetchJobsPromise, fetchAppsPromise]);
      
      const openJobs = (jobsRes.data.jobs || []).filter(job => job.status === 'Open');
      const myApps = appsRes.data.applications || [];
      
      setAppliedJobIds(myApps.map(a => a.jobId?._id || a.jobId));
      setJobs(openJobs);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [user?._id]);

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyingJobId, setApplyingJobId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const applyForJob = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const message = fd.get('message');
    
    if (!message || !applyingJobId || !user) return;

    setIsSubmitting(true);
    try {
      await axios.post(`http://localhost:5000/api/jobs/${applyingJobId}/apply`, {
        freelancerId: user._id,
        message
      });
      toast.success('Application submitted successfully!');
      setShowApplyModal(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit application. Make sure you are registered as a Freelancer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyClick = (jobId) => {
    if (!account) {
      handleCtaClick();
      return;
    }

    if (user?.role === 'client') {
      return; // Clients shouldn't be able to apply, button should be hidden anyway
    }

    if (user?.role === 'freelancer') {
      setApplyingJobId(jobId);
      setShowApplyModal(true);
    } else if (account && !user?.role) {
        navigate('/select-role');
    }
  };

  const role = user?.role;

  const handleCtaClick = async () => {
    if (!account) {
      try {
        await connect();
      } catch (err) {
        console.error("Connection failed", err);
      }
    } else if (!role) {
      navigate('/select-role');
    } else {
      navigate(`/dashboard/${role}`);
    }
  };

  let buttonText = 'Connect Wallet';
  if (account) {
    if (!role) {
      buttonText = 'Select Role';
    } else {
      buttonText = 'Go to Dashboard';
    }
  }

  return (
    <div>
      {/* Hero Landing Section */}
      <div className="hero-container">
        <video 
          className="hero-video" 
          autoPlay 
          loop 
          muted 
          playsInline
          poster="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
        >
          <source src="https://cdn.pixabay.com/video/2020/05/25/40149-425102570_large.mp4" type="video/mp4" />
        </video>
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1 className="hero-title">Work without borders. <span className="text-gradient">Trust without compromise.</span></h1>
          <p className="hero-subtitle">One secure wallet login to help you get hired</p>
          <button className="hero-cta" onClick={handleCtaClick}>
            <WalletIcon />
            {buttonText}
          </button>
        </div>
      </div>

      {/* Features Section */}
      <div className="features-section">
        <div className="container">
          <div className="features-header">
            <h2 className="section-title">Get ahead with <span className="text-gradient">ChainHire</span></h2>
            <p className="section-subtitle">We're serving up trusted insights and anonymous conversation, so you'll have the goods you need to succeed.</p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card glass-panel">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
              <h3>Wallet Security</h3>
              <p>Forget passwords. Use your crypto wallet for a secure, private, and instant login experience.</p>
            </div>

            <div className="feature-card glass-panel">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
              </div>
              <h3>Live Reputation</h3>
              <p>Build an unchangeable profile based on real successful contracts and client feedback.</p>
            </div>

            <div className="feature-card glass-panel">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              </div>
              <h3>Smart Escrow</h3>
              <p>Funds are held in secure smart contracts, released only when the job is done right.</p>
            </div>

            <div className="feature-card glass-panel">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              </div>
              <h3>0% Platform Tax</h3>
              <p>Take home what you earn. We minimize fees by eliminating the middleman entirely.</p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div id="how-it-works" className="how-it-works-section">
        <div className="container">
          <h2 className="section-title text-center">How It <span className="text-gradient">Works</span></h2>
          <div className="steps-container">
            <div className="step-item">
              <div className="step-number">1</div>
              <h3>Post Job</h3>
              <p>Clients list opportunities with clear requirements and budget in ETH.</p>
            </div>
            <div className="step-connector"></div>
            <div className="step-item">
              <div className="step-number">2</div>
              <h3>Apply</h3>
              <p>Freelancers pitch their skills and showcase their on-chain portfolio.</p>
            </div>
            <div className="step-connector"></div>
            <div className="step-item">
              <div className="step-number">3</div>
              <h3>Work</h3>
              <p>The chosen expert delivers quality work within the agreed timeline.</p>
            </div>
            <div className="step-connector"></div>
            <div className="step-item">
              <div className="step-number">4</div>
              <h3>Get Paid</h3>
              <p>Funds are instantly released from escrow to the freelancer's wallet.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Section (Innovative 1) */}
      <div className="trust-section">
        <div className="container">
          <div className="trust-content">
            <div className="trust-text">
              <h2 className="section-title">The Safety <span className="text-gradient">Net</span></h2>
              <p className="text-large">Every transaction is governed by code, not people. Our Smart Escrow ensures that freelancers get paid for their work and clients get what they paid for.</p>
              <ul className="trust-list">
                <li>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Automated release on approval
                </li>
                <li>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Immutable work history
                </li>
                <li>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Decentralized dispute resolution
                </li>
              </ul>
            </div>
            <div className="trust-visual glass-panel">
              <div className="contract-preview">
                <div className="contract-header">
                  <span className="dot red"></span><span className="dot yellow"></span><span className="dot green"></span>
                  <span className="contract-title">Escrow.sol</span>
                </div>
                <div className="contract-code">
                  <p><span className="keyword">function</span> <span className="fn">releaseFunds</span>() <span className="keyword">public</span> {'{'}</p>
                  <p className="indent"><span className="keyword">require</span>(msg.sender == client);</p>
                  <p className="indent">freelancer.<span className="fn">transfer</span>(address(<span className="keyword">this</span>).balance);</p>
                  <p>{'}'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section (Innovative 2) */}
      <div className="stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">1.2K+</div>
              <div className="stat-label">Active Gigs</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">450 ETH</div>
              <div className="stat-label">Total Paid Out</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">0%</div>
              <div className="stat-label">Platform Fees</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">Instant</div>
              <div className="stat-label">Payment Release</div>
            </div>
          </div>
        </div>
      </div>

      {/* Jobs Section */}
      <div id="opportunities" className="container" style={{ marginTop: '2rem' }}>
        <h2 className="text-gradient" style={{ marginBottom: '2rem' }}>Latest Opportunities</h2>
        {loading ? (
          <div className="text-main text-center">Loading jobs...</div>
        ) : (
          <div className="grid">
            {jobs.length === 0 ? <p>No jobs available right now.</p> : null}
            {jobs.map(job => (
              <div key={job._id} className="glass-panel">
                <h3>{job.title}</h3>
                <p className="text-muted">{job.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
                  <span style={{ fontWeight: '600' }}>{job.budget} ETH</span>
                  <span className={`badge ${job.status.toLowerCase()}`}>{job.status}</span>
                </div>
                {user?.role !== 'client' && job.status === 'Open' && (
                  appliedJobIds.includes(job._id) ? (
                    <button 
                      className="btn-outline-subtle" 
                      disabled 
                      style={{ width: '100%', marginTop: '1.5rem', opacity: 0.7 }}
                    >
                      Applied ✓
                    </button>
                  ) : (
                    <button 
                      className="btn btn-outline" 
                      style={{ width: '100%', marginTop: '1.5rem' }}
                      onClick={() => handleApplyClick(job._id)}
                    >
                      Apply Now
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content fade-in-down" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Apply for Position</h2>
              <button className="icon-btn" onClick={() => setShowApplyModal(false)}>✕</button>
            </div>
            <form onSubmit={applyForJob}>
              <div className="form-group">
                <label>Your Proposal / Message</label>
                <textarea 
                  name="message" 
                  required 
                  rows="5" 
                  placeholder="Explain why you are the best fit for this job..."
                  style={{ marginTop: '0.5rem' }}
                ></textarea>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-outline-subtle" onClick={() => setShowApplyModal(false)}>Cancel</button>
                <button type="submit" className="btn-glow" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
