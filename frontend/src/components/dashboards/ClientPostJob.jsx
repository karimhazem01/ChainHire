import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { createJob, getUserProfile, updateUserProfile } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const ClientPostJob = () => {
  const { user: currentUser, account, syncUser } = useAuth();
  const fileInputRef = useRef(null);
  const userIdentifier = currentUser?._id || currentUser?.walletAddress || account;
  const [profile, setProfile] = useState({ skills: '', bio: '', avatar: null });
  const [previewAvatar, setPreviewAvatar] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);

  const loadProfile = useCallback(async () => {
    const profileIdentifier = currentUser?.walletAddress || currentUser?._id || account;
    if (!profileIdentifier) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const { user } = await getUserProfile(profileIdentifier);
      if (user) {
        setProfile({
          skills: (user.skills?.length > 0) ? user.skills.join(', ') : '',
          bio: user.bio || '', avatar: user.profileImage || null
        });
      }
    } catch (err) { console.error("Error loading profile:", err); }
    finally { setIsLoading(false); }
  }, [currentUser?.walletAddress, currentUser?._id, account]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // Avatar
  const handleAvatarClick = () => fileInputRef.current?.click();
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) { const reader = new FileReader(); reader.onloadend = () => setPreviewAvatar(reader.result); reader.readAsDataURL(file); }
  };
  const handleSaveAvatar = async () => {
    if (!previewAvatar) return;
    try { await updateUserProfile(userIdentifier, { profileImage: previewAvatar }); setPreviewAvatar(null); await syncUser(currentUser?.walletAddress || account); loadProfile(); }
    catch (err) { console.error(err); toast.error('Failed to update avatar'); }
  };
  const handleCancelAvatar = () => { setPreviewAvatar(null); if (fileInputRef.current) fileInputRef.current.value = ''; };
  const handleRemoveAvatar = async () => {
    if (!window.confirm("Remove your profile picture?")) return;
    try { await updateUserProfile(userIdentifier, { profileImage: null }); await syncUser(currentUser?.walletAddress || account); loadProfile(); }
    catch (err) { console.error(err); toast.error('Failed to remove avatar'); }
  };

  // Profile edit
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await updateUserProfile(userIdentifier, { skills: fd.get('skills').split(',').map(s => s.trim()).filter(Boolean), bio: fd.get('bio') });
      setShowEditModal(false); await syncUser(currentUser?.walletAddress || account); loadProfile();
    } catch (err) { console.error(err); toast.error('Failed to update profile'); }
  };

  // Post job
  const handlePostJob = async (e) => {
    e.preventDefault();
    setIsPosting(true);
    const fd = new FormData(e.target);
    try {
      await createJob({
        jobId: Date.now(), 
        title: fd.get('title'),
        description: fd.get('description'), 
        budget: Number(fd.get('budget')),
        deadline: fd.get('deadline'),
        clientId: currentUser?._id
      });
      e.target.reset();
      toast.success('Job posted successfully!');
    } catch (err) { console.error(err); toast.error('Failed to post job'); }
    finally { setIsPosting(false); }
  };

  const skillsArray = typeof profile.skills === 'string' ? profile.skills.split(',').map(s => s.trim()).filter(Boolean) : profile.skills;

  if (isLoading) return <div className="text-center text-muted" style={{ padding: '4rem 0' }}>Loading...</div>;

  return (
    <div className="fade-in">
      <div className="dashboard-header"><h2>Post a Job</h2><p className="text-muted">Create a new gig and find talented Web3 freelancers</p></div>

      <div className="post-job-grid">
        {/* Profile Card */}
        <div className="glass-panel profile-page-card">
          <div className="profile-page-top">
            <div className="profile-avatar-large client-avatar avatar-upload-wrapper" onClick={handleAvatarClick} title="Upload Profile Picture">
              {previewAvatar || profile.avatar ? (
                <img src={previewAvatar || profile.avatar} alt="Profile" className="avatar-image" />
              ) : (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
              )}
              <div className="avatar-upload-overlay">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" style={{ display: 'none' }} />
            </div>
            <div className="profile-page-info">
              <h3>Client</h3>
              <span className="wallet-badge">{account}</span>
              {previewAvatar && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button className="btn-glow" style={{ padding: '0.2rem 0.75rem', fontSize: '0.8rem' }} onClick={handleSaveAvatar}>Save</button>
                  <button className="btn-outline-subtle" style={{ padding: '0.2rem 0.75rem', fontSize: '0.8rem' }} onClick={handleCancelAvatar}>Cancel</button>
                </div>
              )}
              {!previewAvatar && profile.avatar && (
                <button className="btn-outline-subtle text-danger" style={{ padding: '0.2rem 0.75rem', fontSize: '0.8rem', border: 'none', background: 'rgba(239,68,68,0.1)', marginTop: '0.5rem' }} onClick={handleRemoveAvatar}>Remove Photo</button>
              )}
            </div>
          </div>
          <div className="profile-body">
            <h4>Skills</h4>
            <div className="skills-container">
              {skillsArray.length > 0 ? skillsArray.map((s, i) => <span key={i} className="skill-tag">{s}</span>) : <span className="text-muted">No skills added yet.</span>}
            </div>
            <h4>Bio</h4>
            <p className="text-muted" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{profile.bio || 'No bio added yet.'}</p>
            <button className="btn-outline-subtle w-100 mt-2" onClick={() => setShowEditModal(true)}>Edit Profile</button>
          </div>
        </div>

        {/* Post Job Form */}
        <div className="glass-panel">
          <h3 className="section-title" style={{ marginBottom: '1.5rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.5rem', verticalAlign: 'middle' }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Create New Job
          </h3>
          <form onSubmit={handlePostJob}>
            <div className="form-group"><label>Job Title</label><input type="text" name="title" required placeholder="e.g. Smart Contract Developer" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group"><label>Budget (ETH)</label><input type="number" name="budget" required step="0.01" min="0" placeholder="e.g. 5.5" /></div>
              <div className="form-group"><label>Deadline</label><input type="date" name="deadline" required /></div>
            </div>
            <div className="form-group"><label>Description</label><textarea name="description" required rows="5" placeholder="Describe the project requirements, deliverables, and timeline..."></textarea></div>
            <button type="submit" className="btn-glow w-100" disabled={isPosting}>{isPosting ? 'Posting...' : 'Post Job'}</button>
          </form>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="modal-overlay"><div className="glass-panel modal-content fade-in-down">
          <div className="modal-header"><h2>Edit Profile</h2><button className="icon-btn" onClick={() => setShowEditModal(false)}>✕</button></div>
          <form onSubmit={handleSaveProfile}>
            <div className="form-group"><label>Skills (comma separated)</label><input type="text" name="skills" defaultValue={profile.skills} placeholder="e.g. Hiring, Management, UI/UX" /></div>
            <div className="form-group"><label>Bio</label><textarea name="bio" rows="4" defaultValue={profile.bio} placeholder="Tell freelancers about your company/projects..."></textarea></div>
            <div className="modal-actions"><button type="button" className="btn-outline-subtle" onClick={() => setShowEditModal(false)}>Cancel</button><button type="submit" className="btn-glow">Save Changes</button></div>
          </form>
        </div></div>
      )}
    </div>
  );
};

export default ClientPostJob;
