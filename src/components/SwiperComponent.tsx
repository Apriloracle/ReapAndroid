import React, { useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import styles from '../styles/ProductCard.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';

interface SwiperComponentProps {
  recommendations: any[];
  currentDealIndex: number;
  setCurrentDealIndex: (index: number) => void;
  isLoading: boolean;
}

const SwiperComponent: React.FC<SwiperComponentProps> = ({
  recommendations,
  currentDealIndex,
  setCurrentDealIndex,
  isLoading,
}) => {
  const validRecommendations = recommendations.filter(deal => deal.logoAbsoluteUrl);

  const { ref: swipeRef } = useSwipeable({
    onSwipedLeft: () => {
      const newIndex = Math.min(currentDealIndex + 1, validRecommendations.length - 1);
      setCurrentDealIndex(newIndex);
    },
    onSwipedRight: () => {
      const newIndex = Math.max(currentDealIndex - 1, 0);
      setCurrentDealIndex(newIndex);
    },
    onSwiping: (eventData) => {
      eventData.event.preventDefault();
    },
    trackMouse: true,
  });

  const currentDeal = validRecommendations[currentDealIndex];

  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageLoaded(false);
    console.error(`Error loading image: ${currentDeal?.logoAbsoluteUrl}`);

    if (currentDealIndex < validRecommendations.length - 1) {
      setCurrentDealIndex(currentDealIndex + 1);
    }
  };

  return (
    <div style={{ marginTop: '0rem' }} ref={swipeRef}>
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '1rem' }}>Loading deals...</div>
      ) : (
        <div
          style={{
            width: '100%',
            height: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {validRecommendations.length > 0 ? (
            currentDeal && (
              <div key={currentDeal.dealId} className={styles.productCard}>
                <div
                  style={{
                    position: 'relative',
                    width: '350px',
                    height: '250px',
                    backgroundColor: '#ffffff',
                    borderRadius: '1px',
                    overflow: 'hidden',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <img
                    src={currentDeal.logoAbsoluteUrl}
                    alt={currentDeal.merchantName}
                    style={{ display: 'none' }}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                  />
                  {imageLoaded && (
                    <img
                      src={currentDeal.logoAbsoluteUrl}
                      alt={currentDeal.merchantName}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  )}
                  {!imageLoaded && (
                    <div style={{ textAlign: 'center' }}>Image not available</div>
                  )}
                </div>
                <div
                  style={{
                    fontSize: '1.15rem',
                    lineHeight: '1.2',
                    marginTop: '0.5rem',
                    textAlign: 'center',
                  }}
                >
                  <div>{currentDeal.merchantName}</div>
                  {currentDeal.codes &&
                    (() => {
                      try {
                        const codes = JSON.parse(currentDeal.codes);
                        if (Array.isArray(codes) && codes.length > 0) {
                          return (
                            <>
                              <div>Code: {codes[0].code}</div>
                              <div>{codes[0].summary}</div>
                            </>
                          );
                        }
                      } catch (e) {
                        console.error('Error parsing codes:', e);
                      }
                      return null;
                    })()}
                </div>
              </div>
            )
          ) : (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              Please reload to see deals.
            </div>
          )}

          {currentDealIndex >= validRecommendations.length - 1 && validRecommendations.length > 0 && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>No more deals to display.</div>
          )}

           {/* Arrow Button Container */}
           {!isLoading && validRecommendations.length > 0 && (
            <div className={styles.arrowButtonContainer}>
              {/* Left Arrow Button */}
              <button
                className={styles.arrowButton}
                onClick={() => {
                  const newIndex = Math.max(currentDealIndex - 1, 0);
                  setCurrentDealIndex(newIndex);
                }}
              >
                <FontAwesomeIcon 
                  icon={faArrowLeft} 
                  size="3x" 
                  style={{ color: "#f05e23" }} // Your hex color 
                />
              </button>

              {/* Right Arrow Button */}
              <button
                className={styles.arrowButton}
                onClick={() => {
                  const newIndex = Math.min(currentDealIndex + 1, validRecommendations.length - 1);
                  setCurrentDealIndex(newIndex);
                }}
              >
                <FontAwesomeIcon 
                  icon={faArrowRight} 
                  size="3x" 
                  style={{ color: "#f05e23" }} // Your hex color
                />
              </button>
            </div>
          
          )}
        </div>
      )}
    </div>
  );
};

export default SwiperComponent;
