import { Link } from 'react-router-dom';

const Security = () => {
  return (
    <div className="security-page fade-in">
      <div className="container">
        <div className="security-header text-center">
          <h1 className="section-title">Platform <span className="text-gradient">Security</span></h1>
          <p className="section-subtitle">Transparency and safety are the foundation of FreelanceNet.</p>
        </div>

        <div className="security-grid">
          {/* Section 1: Smart Contract Status */}
          <section className="glass-panel security-card">
            <div className="security-card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            </div>
            <h2>Smart Contract Status</h2>
            <div className="status-item">
              <span className="label">Network:</span>
              <span className="value">Ethereum Sepolia Testnet</span>
            </div>
            <div className="status-item">
              <span className="label">Contract Address:</span>
              <span className="value mono">TBD (Once Deployed)</span>
            </div>
            <div className="status-item">
              <span className="label">Audit Status:</span>
              <span className="value text-warning">Not yet audited — testnet only</span>
            </div>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="btn-outline-subtle w-100" style={{ marginTop: '1rem', textAlign: 'center' }}>View Source on GitHub</a>
          </section>

          {/* Section 2: How Escrow Works */}
          <section className="glass-panel security-card">
            <div className="security-card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            <h2>How Escrow Works</h2>
            <ul className="security-list">
              <li><strong>Non-Custodial:</strong> Funds are locked in a smart contract, never held by ChainHire admins.</li>
              <li><strong>Milestone Protection:</strong> ETH is only released when the client explicitly approves the delivery.</li>
              <li><strong>Immutable Logic:</strong> No admin or third party can withdraw or touch the funds while in escrow.</li>
            </ul>
          </section>

          {/* Section 3: Wallet Safety Tips */}
          <section className="glass-panel security-card">
            <div className="security-card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>
            <h2>Wallet Safety Tips</h2>
            <ul className="security-list">
              <li>Never share your seed phrase or private keys with anyone.</li>
              <li>Always verify the contract address on Etherscan before signing any transaction.</li>
              <li>Use a separate "hot wallet" for testing and keep your primary funds in cold storage.</li>
            </ul>
          </section>

          {/* Section 4: Bug Reporting */}
          <section className="glass-panel security-card">
            <div className="security-card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </div>
            <h2>Bug Reporting</h2>
            <p className="text-muted">Found a vulnerability or a bug? Your security research helps us grow.</p>
            <div style={{ marginTop: '1.5rem' }}>
              <a href="mailto:[karimhazem05@gmail.com]" className="btn-glow w-100" style={{ display: 'block', textAlign: 'center', marginBottom: '1rem' }}>Contact Security Team</a>
              <a href="https://github.com/issues" target="_blank" rel="noopener noreferrer" className="btn-outline-subtle w-100" style={{ display: 'block', textAlign: 'center' }}>Open GitHub Issue</a>
            </div>
          </section>
        </div>

        {/* Section 5: Disclaimer */}
        <div className="glass-panel disclaimer-box" style={{ marginTop: '4rem' }}>
          <h3>⚠️ Disclaimer</h3>
          <p>ChainHire is currently in <strong>Testnet</strong>. The smart contracts governing the escrow system have not been professionally audited by third-party security firms. Use of this platform is at your own risk. Do not use real funds or mainnet assets on this version of the marketplace.</p>
        </div>

        <div className="text-center" style={{ marginTop: '3rem' }}>
          <Link to="/" className="text-accent hover-underline">← Back to Home</Link>
        </div>
      </div>
    </div>
  );
};

export default Security;
