import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faShoppingCart } from '@fortawesome/free-solid-svg-icons';
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

      // Get the redirect URL from the response
      const data = await response.json(); // Parse JSON response
      if (data && data.redirectUrl) {
        window.location.href = data.redirectUrl; // Redirect using the URL from the response
      } else {
        console.error('Redirect URL not found in response data.');
        // Handle error: redirect URL not in response
      }
    } catch (error) {
      console.error('Error activating deal:', error);
      // Handle error (e.g., show an error message to the user)
    }
  };

  return (
    <div className={styles.buttonContainer}>
      <button className={styles.rejectButton} onClick={onReject}>
        <FontAwesomeIcon icon={faTimesCircle} size="3x" color="red" />
      </button>
      <button className={styles.acceptButton} onClick={handleAccept}>
        <FontAwesomeIcon icon={faShoppingCart} size="3x" color="green" />
      </button>
    </div>
  );
};

export default ButtonSwipe;