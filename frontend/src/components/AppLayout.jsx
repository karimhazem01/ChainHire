import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { useAuth } from '../hooks/useAuth';
import { switchToSepolia } from '../utils/web3';

const AppLayout = () => {
  const { isWrongNetwork } = useAuth();

  return (
    <div className="app-layout">
      {isWrongNetwork && (
        <div className="network-warning">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          <span>Please switch to <strong>Sepolia Testnet</strong> to use blockchain features.</span>
          <button 
            onClick={switchToSepolia}
            style={{ 
              marginLeft: '1rem', 
              padding: '0.25rem 0.75rem', 
              background: 'white', 
              color: '#b91c1c', 
              border: 'none', 
              borderRadius: '4px', 
              fontWeight: 700, 
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            Switch Network
          </button>
        </div>
      )}
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default AppLayout;
