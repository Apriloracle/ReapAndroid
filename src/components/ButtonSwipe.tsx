import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faShoppingBag, faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import styles from '../styles/ButtonSwipe.module.css';

interface ButtonSwipeProps {
  currentDealIndex: number;
  onReject: () => void;
  onAccept: (deal: any) => void;
  deal: any;
  localWalletAddress: string | null;
  address: string | undefined;
}

const ButtonSwipe: React.FC<ButtonSwipeProps> = ({
  currentDealIndex,
  onReject,
  onAccept,
  deal,
  localWalletAddress,
  address,
}) => {
  const handleAccept = async () => {
    if (!deal || (!localWalletAddress && !address)) {
      console.error('Deal data or userId is missing.');
      return;
    }

    const userId = localWalletAddress || address;

    try {
      const response = await fetch(
        'https://asia-southeast1-fourth-buffer-421320.cloudfunctions.net/kindredDealActivation',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userId,
            dealId: deal.dealId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to activate deal');
      }

      const data = await response.json();
      if (data && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        console.error('Redirect URL not found in response data.');
      }
    } catch (error) {
      console.error('Error activating deal:', error);
    }
  };

  return (
    <div className={styles.buttonContainer}>
   

      {/* Reject (X) Button */}
      <button className={styles.rejectButton} onClick={onReject}>
        <FontAwesomeIcon icon={faTimesCircle} size="3x" color="red" />
      </button>

      {/* Accept (Shopping Bag) Button */}
      <button className={styles.acceptButton} onClick={handleAccept}>
        <FontAwesomeIcon icon={faShoppingBag} size="3x" color="green" />
      </button>

    
    </div>
  );
};

export default ButtonSwipe;