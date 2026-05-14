const LoadingScreen = () => {
  return (
    <div className="role-selection-overlay fade-in" style={{ zIndex: 9999 }}>
      <div className="role-selection-container" style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="role-icon-wrapper" style={{ margin: '0 auto 1.5rem auto' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin-animation">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
          </svg>
        </div>
        <h2 style={{ marginBottom: '0.5rem' }}>Checking wallet session...</h2>
        <p className="text-muted">Securely connecting to the blockchain.</p>
        
        <style>{`
          .spin-animation {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default LoadingScreen;
