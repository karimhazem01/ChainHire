import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { getUserProfile, updateUserProfile } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { getContract, getWeb3Provider } from '../../utils/web3';
import { ethers } from 'ethers';

const FreelancerProfile = () => {
  const { user: currentUser, account, setUser, isWrongNetwork } = useAuth();
  const fileInputRef = useRef(null);
  const resumeInputRef = useRef(null);
  const userIdentifier = currentUser?._id || currentUser?.walletAddress || account;
  
  const [profile, setProfile] = useState({ 
    skills: '', 
    bio: '', 
    avatar: null, 
    resume: null, 
    portfolio: [] 
  });
  const [reputation, setReputation] = useState({ points: 0, jobsDone: 0, earned: '0' });
  const [previewAvatar, setPreviewAvatar] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [editingPortfolioIndex, setEditingPortfolioIndex] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchReputation = useCallback(async () => {
    if (!account || isWrongNetwork) return;
    try {
      const provider = getWeb3Provider();
      const contract = await getContract(provider);
      const result = await contract.getReputation(account);
      setReputation({
        points: Number(result[0]),
        jobsDone: Number(result[1]),
        earned: ethers.formatEther(result[2])
      });
    } catch (err) {
      console.warn("Failed to fetch reputation:", err.message);
    }
  }, [account, isWrongNetwork]);

  // Sync local profile state with global currentUser
  useEffect(() => {
    if (currentUser) {
      setProfile({
        skills: Array.isArray(currentUser.skills) ? currentUser.skills.join(', ') : '',
        bio: currentUser.bio || '',
        avatar: currentUser.profileImage || null,
        resume: currentUser.resume || null,
        portfolio: Array.isArray(currentUser.portfolio) ? currentUser.portfolio : []
      });
      setIsLoading(false);
      fetchReputation();
    } else if (account) {
        setIsLoading(true);
    }
  }, [currentUser, account, fetchReputation]);

  const handleAvatarClick = () => fileInputRef.current?.click();
  
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) { 
        const reader = new FileReader(); 
        reader.onloadend = () => setPreviewAvatar(reader.result); 
        reader.readAsDataURL(file); 
    }
  };

  const handleSaveAvatar = async () => {
    if (!previewAvatar || !userIdentifier) return;
    setIsSaving(true);
    try { 
        const { user: updatedUser } = await updateUserProfile(userIdentifier, { profileImage: previewAvatar }); 
        setPreviewAvatar(null); 
        setUser(updatedUser);
    }
    catch (err) { console.error("Avatar save error:", err); toast.error('Failed to update avatar'); }
    finally { setIsSaving(false); }
  };

  const handleCancelAvatar = () => { setPreviewAvatar(null); if (fileInputRef.current) fileInputRef.current.value = ''; };

  const handleRemoveAvatar = async () => {
    if (!window.confirm("Remove your profile picture?") || !userIdentifier) return;
    setIsSaving(true);
    try { 
        const { user: updatedUser } = await updateUserProfile(userIdentifier, { profileImage: null }); 
        setUser(updatedUser);
    }
    catch (err) { console.error("Avatar remove error:", err); toast.error('Failed to remove avatar'); }
    finally { setIsSaving(false); }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!userIdentifier) return;
    const fd = new FormData(e.target);
    const skills = fd.get('skills').split(',').map(s => s.trim()).filter(Boolean);
    const bio = fd.get('bio');
    setIsSaving(true);
    try {
      const { user: updatedUser } = await updateUserProfile(userIdentifier, { skills, bio });
      setUser(updatedUser);
      setShowEditModal(false); 
    } catch (err) { console.error("Profile save error:", err); toast.error('Failed to update profile'); }
    finally { setIsSaving(false); }
  };

  const handleResumeUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !userIdentifier) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Resume must be less than 10MB'); return; }
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      setIsSaving(true);
      try { 
          const base64Data = reader.result;
          const { user: updatedUser } = await updateUserProfile(userIdentifier, { resume: base64Data }); 
          setUser(updatedUser);
          toast.success('Resume uploaded successfully!');
      }
      catch (err) { 
          console.error("Resume upload error:", err); 
          toast.error(`Failed to upload resume: ${err.message}`); 
      }
      finally { setIsSaving(false); }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveResume = async () => {
    if (!window.confirm("Remove your resume?") || !userIdentifier) return;
    setIsSaving(true);
    try { 
        const { user: updatedUser } = await updateUserProfile(userIdentifier, { resume: null }); 
        setUser(updatedUser); 
    }
    catch (err) { console.error("Resume remove error:", err); toast.error('Failed to remove resume'); }
    finally { setIsSaving(false); }
  };

  const handleSavePortfolioItem = async (e) => {
    e.preventDefault();
    if (!userIdentifier) return;
    const fd = new FormData(e.target);
    const item = { title: fd.get('title'), url: fd.get('url'), description: fd.get('description') };
    
    const currentPortfolio = Array.isArray(profile.portfolio) ? profile.portfolio : [];
    let updated = [...currentPortfolio];
    
    if (editingPortfolioIndex !== null) {
        updated[editingPortfolioIndex] = item;
    } else {
        updated.push(item);
    }
    
    setIsSaving(true);
    try { 
        const { user: updatedUser } = await updateUserProfile(userIdentifier, { portfolio: updated }); 
        setUser(updatedUser);
        setShowPortfolioModal(false); 
        setEditingPortfolioIndex(null); 
    }
    catch (err) { console.error("Portfolio save error:", err); toast.error(`Failed to save portfolio item: ${err.message}`); }
    finally { setIsSaving(false); }
  };

  const handleDeletePortfolioItem = async (index) => {
    if (!window.confirm("Remove this portfolio item?") || !userIdentifier) return;
    setIsSaving(true);
    try { 
        const currentPortfolio = Array.isArray(profile.portfolio) ? profile.portfolio : [];
        const updated = currentPortfolio.filter((_, i) => i !== index);
        const { user: updatedUser } = await updateUserProfile(userIdentifier, { portfolio: updated }); 
        setUser(updatedUser);
    }
    catch (err) { console.error("Portfolio delete error:", err); toast.error('Failed to remove portfolio item'); }
    finally { setIsSaving(false); }
  };

  const handleViewResume = () => {
    if (!profile.resume) return;
    const newWindow = window.open();
    if (newWindow) {
        newWindow.document.write('<iframe src="' + profile.resume  + '" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>');
    }
  };

  const skillsArray = typeof profile.skills === 'string' ? profile.skills.split(',').map(s => s.trim()).filter(Boolean) : [];

  if (isLoading) return <div className="text-center text-muted" style={{ padding: '4rem 0' }}>Loading profile...</div>;

  return (
    <div className="fade-in">
      <div className="dashboard-header">
        <h2>My Profile</h2>
        <p className="text-muted">Manage your freelancer identity and showcase your work</p>
      </div>

      {isSaving && (
        <div style={{ position: 'fixed', top: '100px', right: '20px', zIndex: 1000, background: 'var(--primary)', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', animation: 'fade-in 0.3s ease' }}>
          Saving changes...
        </div>
      )}

      <div className="profile-page-grid">
        {/* Profile Card */}
        <div className="glass-panel profile-page-card">
          <div className="profile-page-top">
            <div className="profile-avatar-large avatar-upload-wrapper" onClick={handleAvatarClick} title="Upload Profile Picture">
              {previewAvatar || profile.avatar ? (
                <img src={previewAvatar || profile.avatar} alt="Profile" className="avatar-image" />
              ) : (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              )}
              <div className="avatar-upload-overlay">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" style={{ display: 'none' }} />
            </div>
            <div className="profile-page-info">
              <h3>{currentUser?.name || 'Freelancer'}</h3>
              <span className="wallet-badge">{account}</span>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>{reputation.points}</div>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Reputation</div>
                </div>
                <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>{reputation.jobsDone}</div>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Jobs Done</div>
                </div>
                <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24' }}>{reputation.earned}</div>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>ETH Earned</div>
                </div>
              </div>

              {previewAvatar && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button className="btn-glow" style={{ padding: '0.2rem 0.75rem', fontSize: '0.8rem' }} onClick={handleSaveAvatar} disabled={isSaving}>Save</button>
                  <button className="btn-outline-subtle" style={{ padding: '0.2rem 0.75rem', fontSize: '0.8rem' }} onClick={handleCancelAvatar}>Cancel</button>
                </div>
              )}
              {!previewAvatar && profile.avatar && (
                <button className="btn-outline-subtle text-danger" style={{ padding: '0.2rem 0.75rem', fontSize: '0.8rem', border: 'none', background: 'rgba(239, 68, 68, 0.1)', marginTop: '0.5rem' }} onClick={handleRemoveAvatar} disabled={isSaving}>Remove Photo</button>
              )}
            </div>
          </div>
          <div className="profile-body">
            <h4>Skills</h4>
            <div className="skills-container">
              {skillsArray.length > 0 ? skillsArray.map((skill, i) => <span key={i} className="skill-tag">{skill}</span>) : <span className="text-muted">No skills added yet.</span>}
            </div>
            <h4>Bio</h4>
            <p className="text-muted" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{profile.bio || 'No bio added yet.'}</p>
            <button className="btn-glow w-100 mt-2" onClick={() => setShowEditModal(true)}>Edit Profile</button>
          </div>
        </div>

        {/* Resume */}
        <div className="glass-panel">
          <h3 className="section-title" style={{ marginBottom: '1rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.5rem', verticalAlign: 'middle' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            Resume
          </h3>
          {profile.resume ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'rgba(99,102,241,0.08)', borderRadius: '0.75rem', marginBottom: '1rem' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                <div style={{ flex: 1 }}>
                    <p style={{ color: 'var(--text-main)', margin: 0, fontWeight: 500 }}>Resume uploaded ✓</p>
                    <button onClick={handleViewResume} style={{ background: 'none', border: 'none', color: 'var(--primary)', padding: 0, fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}>View Current Resume</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-outline-subtle" style={{ flex: 1 }} onClick={() => resumeInputRef.current?.click()} disabled={isSaving}>Replace</button>
                <button className="btn-outline-subtle text-danger" style={{ flex: 1, border: 'none', background: 'rgba(239,68,68,0.1)' }} onClick={handleRemoveResume} disabled={isSaving}>Remove</button>
              </div>
            </div>
          ) : (
            <div className="resume-upload-area" onClick={() => resumeInputRef.current?.click()}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: '0.75rem' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              <p style={{ color: 'var(--text-main)', fontWeight: 500 }}>Upload Resume</p>
              <p className="text-muted" style={{ fontSize: '0.8rem' }}>PDF, DOC up to 10MB</p>
            </div>
          )}
          <input type="file" ref={resumeInputRef} onChange={handleResumeUpload} accept=".pdf,.doc,.docx" style={{ display: 'none' }} />
        </div>

        {/* Portfolio */}
        <div className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="section-title" style={{ margin: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.5rem', verticalAlign: 'middle' }}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
              Portfolio
            </h3>
            <button className="btn-outline-subtle" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }} onClick={() => { setEditingPortfolioIndex(null); setShowPortfolioModal(true); }}>+ Add Item</button>
          </div>
          {(!profile.portfolio || profile.portfolio.length === 0) ? (
            <div className="text-center text-muted" style={{ padding: '2rem 0' }}>
              <p>No portfolio items yet.</p>
              <p style={{ fontSize: '0.85rem' }}>Showcase your best work to attract clients!</p>
            </div>
          ) : (
            <div className="portfolio-list">
              {profile.portfolio.map((item, index) => (
                <div key={index} className="portfolio-item">
                  <div style={{ flex: 1 }}>
                    <h4 style={{ color: 'var(--text-main)', marginBottom: '0.25rem' }}>{item?.title || 'Untitled Project'}</h4>
                    {item?.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-accent" style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>{item.url}</a>}
                    {item?.description && <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{item.description}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button className="icon-btn" onClick={() => { setEditingPortfolioIndex(index); setShowPortfolioModal(true); }} title="Edit">✎</button>
                    <button className="icon-btn text-danger" onClick={() => handleDeletePortfolioItem(index)} title="Delete">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="modal-overlay"><div className="glass-panel modal-content fade-in-down">
          <div className="modal-header"><h2>Edit Profile</h2><button className="icon-btn" onClick={() => setShowEditModal(false)}>✕</button></div>
          <form onSubmit={handleSaveProfile}>
            <div className="form-group"><label>Skills (comma separated)</label><input type="text" name="skills" defaultValue={profile.skills} placeholder="e.g. Solidity, React, Node.js" /></div>
            <div className="form-group"><label>Bio</label><textarea name="bio" rows="4" defaultValue={profile.bio} placeholder="Tell clients about your experience..."></textarea></div>
            <div className="modal-actions"><button type="button" className="btn-outline-subtle" onClick={() => setShowEditModal(false)}>Cancel</button><button type="submit" className="btn-glow" disabled={isSaving}>Save Changes</button></div>
          </form>
        </div></div>
      )}

      {/* Portfolio Modal */}
      {showPortfolioModal && (
        <div className="modal-overlay"><div className="glass-panel modal-content fade-in-down">
          <div className="modal-header"><h2>{editingPortfolioIndex !== null ? 'Edit Portfolio Item' : 'Add Portfolio Item'}</h2><button className="icon-btn" onClick={() => { setShowPortfolioModal(false); setEditingPortfolioIndex(null); }}>✕</button></div>
          <form onSubmit={handleSavePortfolioItem}>
            <div className="form-group"><label>Project Title</label><input type="text" name="title" required defaultValue={(editingPortfolioIndex !== null && profile.portfolio) ? profile.portfolio[editingPortfolioIndex]?.title : ''} placeholder="e.g. NFT Marketplace DApp" /></div>
            <div className="form-group"><label>URL (optional)</label><input type="url" name="url" defaultValue={(editingPortfolioIndex !== null && profile.portfolio) ? profile.portfolio[editingPortfolioIndex]?.url : ''} placeholder="https://github.com/..." /></div>
            <div className="form-group"><label>Description (optional)</label><textarea name="description" rows="3" defaultValue={(editingPortfolioIndex !== null && profile.portfolio) ? profile.portfolio[editingPortfolioIndex]?.description : ''} placeholder="Briefly describe the project..."></textarea></div>
            <div className="modal-actions"><button type="button" className="btn-outline-subtle" onClick={() => { setShowPortfolioModal(false); setEditingPortfolioIndex(null); }}>Cancel</button><button type="submit" className="btn-glow" disabled={isSaving}>{editingPortfolioIndex !== null ? 'Save Changes' : 'Add Item'}</button></div>
          </form>
        </div></div>
      )}
    </div>
  );
};

export default FreelancerProfile;
