const API_URL = 'http://localhost:5000/api';

// Users API
export const authLogin = async (walletAddress, name, role, publicKey = null) => {
    const res = await fetch(`${API_URL}/users/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, name, role, publicKey })
    });
    if (!res.ok) throw new Error('Failed to authenticate');
    return res.json();
};

export const getUserProfile = async (identifier) => {
    const res = await fetch(`${API_URL}/users/${identifier}`);
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get user profile');
    }
    return res.json();
};

export const getApplicantInfo = async (freelancerId) => {
    const res = await fetch(`${API_URL}/users/${freelancerId}`);
    if (!res.ok) throw new Error('Failed to get applicant info');
    return res.json();
};

export const updateUserProfile = async (userId, data) => {
    const res = await fetch(`${API_URL}/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update profile');
    }
    return res.json();
};

// Jobs API
export const getJobs = async () => {
    const res = await fetch(`${API_URL}/jobs`);
    if (!res.ok) throw new Error('Failed to get jobs');
    return res.json();
};

export const createJob = async (jobData) => {
    const res = await fetch(`${API_URL}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobData)
    });
    if (!res.ok) throw new Error('Failed to create job');
    return res.json();
};

export const updateJob = async (jobId, jobData) => {
    const res = await fetch(`${API_URL}/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobData)
    });
    if (!res.ok) throw new Error('Failed to update job');
    return res.json();
};

export const deleteJob = async (jobId) => {
    const res = await fetch(`${API_URL}/jobs/${jobId}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete job');
    return res.json();
};

// Applications API
export const getApplications = async (query = {}) => {
    const params = new URLSearchParams(query);
    const res = await fetch(`${API_URL}/applications?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to get applications');
    return res.json();
};

export const applyToJob = async (jobId, freelancerId, message) => {
    const res = await fetch(`${API_URL}/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freelancerId, message })
    });
    if (!res.ok) throw new Error('Failed to apply to job');
    return res.json();
};

export const acceptApplication = async (jobId, applicationId) => {
    const res = await fetch(`${API_URL}/jobs/${jobId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId })
    });
    if (!res.ok) throw new Error('Failed to accept application');
    return res.json();
};

export const rejectApplication = async (jobId, applicationId) => {
    const res = await fetch(`${API_URL}/jobs/${jobId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId })
    });
    if (!res.ok) throw new Error('Failed to reject application');
    return res.json();
};

// Messaging API
export const getMessages = async (jobId, p1, p2) => {
    const res = await fetch(`${API_URL}/messages/${jobId}/${p1}/${p2}`);
    if (!res.ok) throw new Error('Failed to get messages');
    return res.json();
};

export const sendMessage = async (messageData) => {
    const res = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to send message');
    }
    return res.json();
};

export const getUnreadCount = async (userId) => {
    const res = await fetch(`${API_URL}/messages/unread-count/${userId}`);
    if (!res.ok) throw new Error('Failed to get unread count');
    return res.json();
};

export const markMessagesAsRead = async (jobId, userId, otherId) => {
    const res = await fetch(`${API_URL}/messages/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, userId, otherId })
    });
    if (!res.ok) throw new Error('Failed to mark messages as read');
    return res.json();
};
