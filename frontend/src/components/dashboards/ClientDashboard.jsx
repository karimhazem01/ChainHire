import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { getJobs, updateJob, deleteJob } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { getContract, getWeb3Provider } from '../../utils/web3';
import { ethers } from 'ethers';

const ClientDashboard = () => {
  const { user: currentUser, isWrongNetwork } = useAuth();
  const [myJobs, setMyJobs] = useState([]);
  const [editingJob, setEditingJob] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [onChainData, setOnChainData] = useState({}); // jobId -> { amount, status, freelancer }
  const [txLoading, setTxLoading] = useState(null); // jobId being processed
  const [lastTxHash, setLastTxHash] = useState({}); // jobId -> hash

  const clientId = currentUser?._id;

  const fetchOnChainData = useCallback(async (jobs) => {
    if (jobs.length === 0 || isWrongNetwork) return;
    try {
      const provider = getWeb3Provider();
      const contract = await getContract(provider);
      const data = {};
      
      for (const job of jobs) {
        // Fetch on-chain data for all jobs to keep status in sync
        try {
          const result = await contract.getJob(job._id);
          const onChainStatus = Number(result[4]);
          
          data[job._id] = {
            client: result[0],
            freelancer: result[1],
            amount: ethers.formatEther(result[2]),
            deadline: Number(result[3]),
            status: onChainStatus // 0: Open, 1: Funded, 2: Completed, 3: Cancelled, 4: Disputed, 5: Refunded
          };

          // Sync backend if it's lagging (On-chain says Funded, but DB says Open/Assigned)
          if (onChainStatus === 1 && (job.status === 'Open' || job.status === 'Assigned')) {
            console.log(`Syncing backend status for job ${job._id} to Funded...`);
            await fetch(`http://localhost:5000/api/jobs/${job._id}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'Funded' })
            });
            // Refresh local state to show buttons immediately
            setMyJobs(prev => prev.map(j => j._id === job._id ? { ...j, status: 'Funded' } : j));
          }
        } catch (e) {
          // If getJob reverts, it likely means the job hasn't been funded yet
        }
      }
      setOnChainData(data); // Replace old data to clear stale statuses
    } catch (err) {
      console.error("Error fetching on-chain data:", err);
    }
  }, [isWrongNetwork]);

  const loadData = useCallback(async () => {
    if (!clientId) {
      setIsLoading(false);
      return;
    }
    
    if (myJobs.length === 0) setIsLoading(true);
    
    try {
      const jobsData = await getJobs();
      const allJobs = jobsData.jobs || [];
      const clientJobs = allJobs.filter(j => j.clientId === clientId || j.clientId?._id === clientId);
      setMyJobs(clientJobs);
      fetchOnChainData(clientJobs);
    } catch (err) { console.error("Error loading jobs:", err); }
    finally { setIsLoading(false); }
  }, [clientId, myJobs.length, fetchOnChainData]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleBlockchainAction = async (jobId, action) => {
    if (isWrongNetwork) {
      toast.error("Please switch to Sepolia Testnet.");
      return;
    }

    setTxLoading(jobId);
    try {
      const provider = getWeb3Provider();
      const signer = await provider.getSigner();
      const contract = await getContract(signer);

      console.log(`Performing action ${action} for job ${jobId}...`);
      let tx;
      if (action === 'approve') tx = await contract.approveDelivery(jobId);
      else if (action === 'cancel') tx = await contract.cancelJob(jobId);
      else if (action === 'dispute') tx = await contract.raiseDispute(jobId);

      setLastTxHash(prev => ({ ...prev, [jobId]: tx.hash }));
      await tx.wait();
      
      let newStatus = 'Completed';
      if (action === 'cancel') newStatus = 'Cancelled';
      if (action === 'dispute') newStatus = 'Disputed';

      // Update backend
      await fetch(`http://localhost:5000/api/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      toast.success(`Job ${action}d successfully!`);
      loadData();
    } catch (err) {
      console.error(`Action ${action} failed:`, err);
      toast.error(`Blockchain action failed: ${err.message}`);
    } finally {
      setTxLoading(null);
    }
  };

  const handleSaveEditJob = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await updateJob(editingJob._id, { 
        title: fd.get('title'), 
        description: fd.get('description'), 
        budget: Number(fd.get('budget')),
        deadline: fd.get('deadline')
      });
      setEditingJob(null); loadData();
    } catch (err) { console.error(err); toast.error('Failed to update job'); }
  };

  const handleDeleteJob = async () => {
    if (!window.confirm("Are you sure you want to delete this job? All applications will also be lost.")) return;
    try { await deleteJob(editingJob._id); setEditingJob(null); loadData(); }
    catch (err) { console.error(err); toast.error('Failed to delete job'); }
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'open': return { color: '#38bdf8', borderColor: '#38bdf8' };
      case 'funded': return { color: '#fbbf24', borderColor: '#fbbf24' };
      case 'completed': return { color: '#10b981', borderColor: '#10b981' };
      case 'cancelled': return { color: '#ef4444', borderColor: '#ef4444' };
      case 'disputed': return { color: '#f87171', borderColor: '#f87171' };
      case 'refunded': return { color: '#f87171', borderColor: '#f87171', fontStyle: 'italic' };
      default: return {};
    }
  };

  if (isLoading && myJobs.length === 0) return <div className="text-center text-muted" style={{ padding: '4rem 0' }}>Loading your jobs...</div>;

  return (
    <div className="fade-in">
      <div className="dashboard-header">
        <h2>My Posted Jobs</h2>
        <p className="text-muted">Manage and track the jobs you've created</p>
      </div>

      {myJobs.length === 0 ? (
        <div className="glass-panel text-center" style={{ padding: '3rem' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: '1rem', opacity: 0.5 }}>
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
          <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>No jobs posted yet</h3>
          <p className="text-muted">Head to the "Post Job" tab to create your first gig!</p>
        </div>
      ) : (
        <div className="job-feed">
          {myJobs.map(job => (
            <div key={job._id} className="glass-panel job-card">
              <div className="job-card-header">
                <h3>{job.title}</h3>
                <div style={{ textAlign: 'right' }}>
                  <span className="job-budget">{job.budget} ETH</span>
                  {onChainData[job._id] && (
                    <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                      ✓ {onChainData[job._id].amount} ETH Locked
                    </div>
                  )}
                </div>
              </div>
              <p className="text-muted job-desc">{job.description}</p>
              
              {lastTxHash[job._id] && (
                <div style={{ marginBottom: '1rem', padding: '0.5rem', background: 'rgba(56, 189, 248, 0.05)', borderRadius: '6px', fontSize: '0.75rem', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Last Tx: </span>
                  <a href={`https://sepolia.etherscan.io/tx/${lastTxHash[job._id]}`} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', textDecoration: 'underline' }}>
                    {lastTxHash[job._id].substring(0, 20)}...
                  </a>
                </div>
              )}

              <div className="job-card-meta">
                <span className={`deadline-label ${job.deadline && new Date(job.deadline) < new Date() ? 'expired' : ''}`}>
                  Deadline: {job.deadline ? new Date(job.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'No deadline'}
                </span>
                {job.freelancerId && (
                  <span className="deadline-label" style={{ background: 'rgba(99, 102, 241, 0.05)' }}>
                    Freelancer: {job.freelancerId.name || 'Assigned'}
                  </span>
                )}
              </div>

              <div className="job-card-footer" style={{ justifyContent: 'space-between' }}>
                <span className={`status-badge ${job.status?.toLowerCase()}`} style={getStatusStyle(job.status)}>{job.status}</span>
                
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {job.status === 'Open' && (
                    <button className="btn-outline-subtle" onClick={() => setEditingJob(job)}>Edit</button>
                  )}
                  
                  {/* Show actions only if status is strictly Funded and not resolved/disputed */}
                  {(job.status === 'Funded' || onChainData[job._id]?.status === 1) && 
                   job.status !== 'Disputed' && 
                   job.status !== 'Completed' && 
                   job.status !== 'Cancelled' &&
                   onChainData[job._id]?.status === 1 && (
                    <>
                      <button 
                        className="btn-glow" 
                        style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                        onClick={() => handleBlockchainAction(job._id, 'approve')}
                        disabled={txLoading !== null}
                      >
                        {txLoading === job._id ? 'Processing...' : 'Approve Delivery'}
                      </button>
                      <button 
                        className="btn-outline-subtle danger-hover" 
                        style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                        onClick={() => handleBlockchainAction(job._id, 'cancel')}
                        disabled={txLoading !== null}
                      >
                        Cancel
                      </button>
                      <button 
                        className="btn-outline-subtle" 
                        style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', color: '#f87171' }}
                        onClick={() => handleBlockchainAction(job._id, 'dispute')}
                        disabled={txLoading !== null}
                      >
                        Dispute
                      </button>
                    </>
                  )}
                  
                  {job.status === 'Disputed' && (
                    <div style={{ fontSize: '0.85rem', color: '#f87171', fontWeight: 500, padding: '0.4rem' }}>
                      ⚖️ Dispute Pending (Awaiting Freelancer)
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Job Modal */}
      {editingJob && (
        <div className="modal-overlay"><div className="glass-panel modal-content fade-in-down">
          <div className="modal-header"><h2>Edit Job Details</h2><button className="icon-btn" onClick={() => setEditingJob(null)}>✕</button></div>
          <form onSubmit={handleSaveEditJob}>
            <div className="form-group"><label>Job Title</label><input type="text" name="title" required defaultValue={editingJob.title} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group"><label>Budget (ETH)</label><input type="number" name="budget" required step="0.01" defaultValue={editingJob.budget} /></div>
              <div className="form-group"><label>Deadline</label><input type="date" name="deadline" required defaultValue={editingJob.deadline ? new Date(editingJob.deadline).toISOString().split('T')[0] : ''} /></div>
            </div>
            <div className="form-group"><label>Description</label><textarea name="description" required rows="4" defaultValue={editingJob.description}></textarea></div>
            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              <button type="button" className="btn-outline-subtle danger-hover" onClick={handleDeleteJob}>Delete Job</button>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn-outline-subtle" onClick={() => setEditingJob(null)}>Cancel</button>
                <button type="submit" className="btn-glow">Save Changes</button>
              </div>
            </div>
          </form>
        </div></div>
      )}
    </div>
  );
};

export default ClientDashboard;
