// Mock seed data
const initialJobs = [
  { id: 1, title: 'Build NFT Minting DApp', description: 'Need a complete NFT minting dApp with a React frontend and Solidity smart contract.', budget: '5 ETH', clientId: 'user_client_1', status: 'Open', applications: [101] },
  { id: 2, title: 'Smart Contract Audit', description: 'Need an audit for a DeFi staking contract before mainnet launch.', budget: '2 ETH', clientId: 'user_client_1', status: 'Open', applications: [] }
];

const initialApplications = [
  { id: 101, jobId: 1, freelancerId: 'user_freelancer_1', freelancerWallet: '0xabc...123', message: 'I have built 5 similar DApps and have 3 years of React experience.', status: 'Pending' }
];

// Initialize storage if empty
export const initStorage = () => {
  if (!localStorage.getItem('marketplace_jobs')) {
    localStorage.setItem('marketplace_jobs', JSON.stringify(initialJobs));
  }
  if (!localStorage.getItem('marketplace_applications')) {
    localStorage.setItem('marketplace_applications', JSON.stringify(initialApplications));
  }
};

// Jobs API
export const getJobs = () => {
  initStorage();
  return JSON.parse(localStorage.getItem('marketplace_jobs')) || [];
};

export const saveJobs = (jobs) => {
  localStorage.setItem('marketplace_jobs', JSON.stringify(jobs));
};

export const addJob = (job) => {
  const jobs = getJobs();
  jobs.unshift(job); // Add to beginning
  saveJobs(jobs);
  return job;
};

// Applications API
export const getApplications = () => {
  initStorage();
  return JSON.parse(localStorage.getItem('marketplace_applications')) || [];
};

export const saveApplications = (apps) => {
  localStorage.setItem('marketplace_applications', JSON.stringify(apps));
};

export const addApplication = (application) => {
  const apps = getApplications();
  apps.unshift(application);
  saveApplications(apps);
  
  // Also update the job's applications array
  const jobs = getJobs();
  const jobIndex = jobs.findIndex(j => j.id === application.jobId);
  if (jobIndex > -1) {
    jobs[jobIndex].applications.push(application.id);
    saveJobs(jobs);
  }
  return application;
};

export const updateApplicationStatus = (appId, status) => {
  const apps = getApplications();
  const appIndex = apps.findIndex(a => a.id === appId);
  if (appIndex > -1) {
    apps[appIndex].status = status;
    saveApplications(apps);
    
    // If accepted, update the job status too
    if (status === 'Accepted') {
      const jobs = getJobs();
      const jobIndex = jobs.findIndex(j => j.id === apps[appIndex].jobId);
      if (jobIndex > -1) {
        jobs[jobIndex].status = 'Assigned';
        saveJobs(jobs);
      }
    }
  }
};

export const updateJob = (jobId, updatedData) => {
  const jobs = getJobs();
  const index = jobs.findIndex(j => j.id === jobId);
  if (index > -1) {
    jobs[index] = { ...jobs[index], ...updatedData };
    saveJobs(jobs);
  }
};

export const deleteJob = (jobId) => {
  let jobs = getJobs();
  jobs = jobs.filter(j => j.id !== jobId);
  saveJobs(jobs);

  // Also clean up applications for this job
  let apps = getApplications();
  apps = apps.filter(a => a.jobId !== jobId);
  saveApplications(apps);
};

export const updateUserProfile = (userId, data) => {
  // Update currentUser if it matches
  let currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (currentUser && currentUser.userId === userId) {
    currentUser = { ...currentUser, ...data };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
  }
  
  // Maintain a persistent list of all user profiles
  let users = JSON.parse(localStorage.getItem('marketplace_users')) || [];
  const uIndex = users.findIndex(u => u.userId === userId);
  if (uIndex > -1) {
    users[uIndex] = { ...users[uIndex], ...data };
  } else {
    users.push({ userId, ...data });
  }
  localStorage.setItem('marketplace_users', JSON.stringify(users));
};

export const getUserProfile = (userId) => {
  const users = JSON.parse(localStorage.getItem('marketplace_users')) || [];
  return users.find(u => u.userId === userId) || null;
};
