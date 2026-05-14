import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { getJobs, applyToJob, getApplications } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const FreelancerDashboard = () => {
  const { user: currentUser } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [appliedJobIds, setAppliedJobIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const freelancerId = currentUser?._id;

  const loadData = useCallback(async () => {
    if (!freelancerId) {
      setIsLoading(false);
      return;
    }
    
    // Only show full loading if we have no jobs yet
    if (jobs.length === 0) setIsLoading(true);
    
    try {
      const [jobsData, appsData] = await Promise.all([
        getJobs(),
        getApplications({ freelancerId })
      ]);
      const openJobs = (jobsData.jobs || []).filter(job => job.status === 'Open');
      setJobs(openJobs);
      const myApps = appsData.applications || [];
      setAppliedJobIds(myApps.map(a => a.jobId?._id || a.jobId));
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [freelancerId, jobs.length]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyingJobId, setApplyingJobId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApplyClick = (jobId) => {
    if (appliedJobIds.includes(jobId)) {
      toast.error('You have already applied for this job.');
      return;
    }
    setApplyingJobId(jobId);
    setShowApplyModal(true);
  };

  const submitApplication = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const message = fd.get('message');

    if (!message || !applyingJobId || !freelancerId) return;

    setIsSubmitting(true);
    try {
      await applyToJob(applyingJobId, freelancerId, message);
      await loadData();
      toast.success('Application submitted successfully!');
      setShowApplyModal(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && jobs.length === 0) {
    return (
      <div className="text-center text-muted" style={{ padding: '4rem 0' }}>
        <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
        Loading available gigs...
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="dashboard-header">
        <h2>Available Gigs</h2>
        <p className="text-muted">Find your next Web3 opportunity</p>
      </div>

      <div className="job-feed">
        {jobs.map(job => (
          <div key={job._id} className="glass-panel job-card">
            <div className="job-card-header">
              <h3>{job.title}</h3>
              <span className="job-budget">{job.budget} ETH</span>
            </div>
            <p className="text-muted job-desc">{job.description}</p>
            <div className="job-card-meta">
              <span className={`deadline-label ${new Date(job.deadline) < new Date() ? 'expired' : ''}`}>
                Deadline: {new Date(job.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div className="job-card-footer">
              {appliedJobIds.includes(job._id) ? (
                <button className="btn-outline-subtle" disabled style={{ opacity: 0.6 }}>Applied ✓</button>
              ) : (
                <button className="btn-glow" onClick={() => handleApplyClick(job._id)}>Apply Now</button>
              )}
            </div>
          </div>
        ))}
        {jobs.length === 0 && (
          <div className="glass-panel text-center" style={{ padding: '3rem' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: '1rem', opacity: 0.5 }}>
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
            <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>No jobs available</h3>
            <p className="text-muted">Check back later for new opportunities!</p>
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
            <form onSubmit={submitApplication}>
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

export default FreelancerDashboard;
