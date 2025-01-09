import React from 'react';
import { useNavigate } from 'react-router-dom';

interface BalanceCardProps {
  totalBalance: number;
  availableApril: {
    value: string;
    display: string;
  };
  localWalletAddress: string | null; // Add this prop
}

const BalanceCard: React.FC<BalanceCardProps> = ({ totalBalance, availableApril, localWalletAddress }) => {
  const navigate = useNavigate();

  const formatUsdBalance = (balance: number): string => {
    return balance.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatAprilBalance = (value: string): string => {
    const number = parseFloat(value);
    return number.toFixed(2);
  };

  const handleCashoutClick = () => {
    navigate('/cashout');

    // Call the feeProxy endpoint in the background
    if (localWalletAddress) {
      fetch('https://asia-southeast1-fourth-buffer-421320.cloudfunctions.net/feeProxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: localWalletAddress }),
      }).catch(error => console.error('Error calling feeProxy:', error));
    } else {
      console.error('Local wallet address not available');
    }
  };

  const handleEarnClick = () => {
    navigate('/surveys');
  };

  return (
    <div style={{
      backgroundColor: '#000000',
      borderRadius: '10px',
      padding: '16px',
      color: 'white',
      marginBottom: '0px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '' }}>Total Balance</div>
          <div style={{ fontSize: '38px', fontWeight: '' }}>{formatUsdBalance(totalBalance)}</div>
        </div>
        <div style={{ 
          backgroundColor: '#202020', 
          borderRadius: '8px', 
          padding: '8px',
          minWidth: '12px'
        }}>
          <div style={{ fontSize: '14px', fontWeight: '' }}>
            {formatAprilBalance(availableApril.value)} <span style={{ fontSize: '12px', color: '#f05e23' }}>APRIL</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalanceCard;
