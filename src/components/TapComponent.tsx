import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SurveyQuestion from './SurveyQuestion';

interface TapComponentProps {
  score: number;
  dailyTaps: number;
  isDailyLimitReached: boolean;
  localWalletAddress: string | null;
  address: string | undefined;
  handleTransfer: () => Promise<void>;
  error: string | null;
}

const TapComponent: React.FC<TapComponentProps> = ({
  score,
  dailyTaps,
  isDailyLimitReached,
  localWalletAddress,
  address,
  handleTransfer,
  error
}) => {
  const navigate = useNavigate();
  const [showSurvey, setShowSurvey] = useState<boolean>(false);

  const handleSurveyResponse = async (question: string, response: string) => {
    console.log(`Survey question: ${question}`);
    console.log(`Survey response: ${response}`);
  };

  return (
    <div style={{ padding: '1rem', backgroundColor: '#000000', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '1rem' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5" stroke="#f05e23" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 19L5 12L12 5" stroke="#f05e23" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h2 style={{ color: '#f05e23', margin: 0 }}>Tap to Earn</h2>
      </div>

      <div style={{ padding: '0.5rem', marginBottom: '0.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
          <svg style={{ width: '2rem', height: '2rem', color: '#F59E0B', marginRight: '0.5rem' }} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 011-1h1V7a1 1 0 012 0v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1H8a1 1 0 01-1-1z" clipRule="evenodd" fillRule="evenodd"></path>
          </svg>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#FFFFFF' }}>{score}</p>
        </div>
        <p style={{ fontSize: '0.875rem', color: '#A0AEC0' }}></p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ position: 'relative', width: '13rem', height: '13rem' }}>
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            background: 'linear-gradient(135deg, #f05e23, #d54d1b)', 
            borderRadius: '9999px', 
            opacity: 0.3, 
            animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite'
          }}></div>
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            background: 'linear-gradient(135deg, #f05e23, #d54d1b)', 
            borderRadius: '9999px', 
            opacity: 0.3, 
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite', 
            animationDelay: '0.5s'
          }}></div>
          <button
            onClick={handleTransfer}
            disabled={isDailyLimitReached || (!localWalletAddress && !address)}
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #f05e23, #d54d1b)',
              color: 'white',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              fontWeight: 'bold',
              border: 'none',
              cursor: isDailyLimitReached || (!localWalletAddress && !address) ? 'not-allowed' : 'pointer',
              transition: 'all 300ms ease-in-out',
              boxShadow: '0 10px 20px rgba(240,94,35,0.3), inset 0 -5px 10px rgba(0,0,0,0.2), 0 0 0 6px rgba(240,94,35,0.2), 0 0 0 12px rgba(240,94,35,0.1)',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              transform: 'translateY(0)',
              opacity: isDailyLimitReached || (!localWalletAddress && !address) ? 0.5 : 1,
            }}
          >
            <span style={{
              position: 'relative',
              zIndex: 2,
            }}>
              {isDailyLimitReached ? 'Limit Reached' : (!localWalletAddress && !address ? 'Connect Wallet' : '')}
            </span>
            <div style={{
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              borderRadius: '9999px',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)',
              opacity: 1,
              transition: 'opacity 300ms ease-in-out',
            }}></div>
          </button>
        </div>

        {error && (
          <p style={{ marginTop: '0.5rem', color: '#EF4444', fontSize: '0.875rem' }}>{error}</p>
        )}
      </div>

      {showSurvey && (
        <SurveyQuestion
          onResponse={handleSurveyResponse}
          onClose={() => setShowSurvey(false)}
        />
      )}
    </div>
  );
};

export default TapComponent; 