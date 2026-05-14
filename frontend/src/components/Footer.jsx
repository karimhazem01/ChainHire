import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import logo from '../assets/logo.png';

const Footer = () => {
  const { connect, account } = useAuth();

  const handleConnect = (e) => {
    e.preventDefault();
    if (!account) connect();
  };

  return (
    <footer className="footer-modern">
      <div className="container">
        <div className="footer-grid">
          {/* Left Column: Brand & Socials */}
          <div className="footer-brand">
            <Link to="/" className="nav-brand">
              <img src={logo} alt="ChainHire" className="footer-logo" />
            </Link>
            <p className="text-muted footer-tagline">Work without borders. Trust without compromise.</p>
            <div className="social-icons" style={{ marginTop: '1.5rem' }}>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Twitter">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-1 2.14-3 2.85c-.34 2.26-1.89 4.46-4.01 5.77-2.11 1.31-4.74 1.76-6.99 1.15-2.25-.61-4.02-2.19-4.81-4.14-.11.23-.19.46-.24.7-.17 1.1-.03 2.22.42 3.23.45 1.01 1.2 1.86 2.12 2.43-.88-.03-1.74-.26-2.5-.67v.06c0 1.25.43 2.44 1.23 3.38.8.94 1.93 1.57 3.16 1.79-.46.12-.94.19-1.42.19-.34 0-.67-.03-1-.09.33 1.03 1 1.92 1.88 2.52.88.6 1.93.93 3.02.93a12.01 12.01 0 0 1-8.89-2.51c1.33.85 2.89 1.31 4.5 1.31 5.4 0 9.24-4.47 9.24-9.25 0-.14 0-.28-.01-.42.57-.41 1.07-.92 1.47-1.51z"></path></svg>
              </a>
              <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Discord">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"></circle><circle cx="15" cy="12" r="1"></circle><path d="M21 11.5a8.38 8.38 0 0 0-.9-3.85 8.38 8.38 0 0 0-3.2-3.2 8.38 8.38 0 0 0-3.85-.9 8.38 8.38 0 0 0-3.85.9 8.38 8.38 0 0 0-3.2 3.2 8.38 8.38 0 0 0-.9 3.85c0 1.05.2 2.05.57 3a10.6 10.6 0 0 1 2.36 2.36 10.6 10.6 0 0 1 2.36-2.36c.95.37 1.95.57 3 .57 1.05 0 2.05-.2 3-.57a10.6 10.6 0 0 1 2.36 2.36 10.6 10.6 0 0 1 2.36-2.36c.37-.95.57-1.95.57-3z"></path></svg>
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Github">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
              </a>
            </div>
          </div>
          
          {/* Middle Column: Platform */}
          <div className="link-group">
            <h4>Platform</h4>
            <a href="/#how-it-works">How It Works</a>
            <a href="/#opportunities">Latest Opportunities</a>
            <a href="#" onClick={handleConnect}>{account ? 'Wallet Connected ✓' : 'Connect Wallet'}</a>
          </div>
          
          {/* Right Column: Support */}
          <div className="link-group">
            <h4>Support</h4>
            <a href="mailto:[karimhazem05@gmail.com]">Contact Us</a>
            <a href="https://github.com/issues" target="_blank" rel="noopener noreferrer">Report a Bug</a>
            <Link to="/security">Security</Link>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="footer-bottom-bar">
          <div className="bottom-left">
            <p>© 2026 ChainHire. All rights reserved.</p>
          </div>
          <div className="bottom-center">
            <p className="footer-motto">Decentralized · Trustless · Borderless</p>
          </div>
          <div className="bottom-right">
            <div className="network-status">
              <span className="dot pulse-green"></span>
              <span className="network-text">Ethereum Sepolia Testnet</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
