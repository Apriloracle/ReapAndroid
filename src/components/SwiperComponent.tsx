import React, { useState } from 'react';
import { useSwipeable } from 'react-swipeable';

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
  const [imageLoaded, setImageLoaded] = useState(false);

  const { ref: swipeRef } = useSwipeable({
    onSwipedLeft: () => {
      const newIndex = Math.min(currentDealIndex + 1, validRecommendations.length - 1);
      setCurrentDealIndex(newIndex);
    },
    onSwipedRight: () => {
      const newIndex = Math.max(currentDealIndex - 1, 0);
      setCurrentDealIndex(newIndex);
    },
    trackMouse: true,
  });

  const currentDeal = validRecommendations[currentDealIndex];

  const handleImageLoad = () => setImageLoaded(true);
  const handleImageError = () => {
    setImageLoaded(false);
    if (currentDealIndex < validRecommendations.length - 1) {
      setCurrentDealIndex(currentDealIndex + 1);
    }
  };

  const parseCodes = () => {
    try {
      const codes = JSON.parse(currentDeal?.codes || '[]');
      return Array.isArray(codes) ? codes : [];
    } catch (e) {
      console.error('Error parsing codes:', e);
      return [];
    }
  };

  return (
    <div style={{ marginTop: '0rem' }} ref={swipeRef}>
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '1rem' }}>
          Loading deals...
        </div>
      ) : (
        <div style={{ 
          width: '100%', 
          minHeight: '426px',  // Changed to minHeight
          display: 'flex', 
          justifyContent: 'center',
          padding: '16px 0'
        }}>
          {validRecommendations.length > 0 ? (
            currentDeal && (
              <div key={currentDeal.dealId} style={{ 
                width: 360, 
                minHeight: 426,  // Changed to minHeight
                position: 'relative',
                backgroundColor: '#F7F7F7',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                flexDirection: 'column'  // Added for better content flow
              }}>
                {/* Image Section with Flexible Height */}
                <div style={{ 
                  position: 'relative',
                  width: '100%',
                  flex: '1 1 60%',  // Flexible height
                  minHeight: '250px',
                  background: 'linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(72, 72, 72, 0.75) 54%, #010101 92%)'
                }}>
                  {/* Merchant Logo */}
                  <img
                    src={currentDeal.logoAbsoluteUrl}
                    alt={currentDeal.merchantName}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      maxWidth: '80%',
                      maxHeight: '80%',
                      objectFit: 'contain',
                      display: imageLoaded ? 'block' : 'none'
                    }}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                  />

                  {/* Image Loading State */}
                  {!imageLoaded && (
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      color: 'white',
                      textAlign: 'center',
                      fontSize: '14px'
                    }}>
                      Loading merchant logo...
                    </div>
                  )}
                </div>

                {/* Content Section with Auto Height */}
                <div style={{ 
                  padding: '16px',
                  background: '#010101',
                  flex: '0 0 auto',  // Auto height
                  minHeight: '176px'
                }}>
                  {/* Merchant Info */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ 
                      fontSize: '20px',
                      fontFamily: 'Montserrat, sans-serif',
                      fontWeight: 600,
                      color: '#FFFFFF',
                      marginBottom: '8px',
                      lineHeight: '1.2'
                    }}>
                      {currentDeal.merchantName}
                    </div>
                    {currentDeal.dealValue && (
                      <div style={{
                        fontSize: '18px',  // Reduced font size
                        fontFamily: 'Sora, sans-serif',
                        fontWeight: 600,
                        color: '#D45B2D'
                      }}>
                        ${currentDeal.dealValue}
                      </div>
                    )}
                  </div>

                  {/* Deal Codes with Improved Wrapping */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    flexWrap: 'wrap',
                    marginTop: '8px'
                  }}>
                    {parseCodes().map((code: any, index: number) => (
                      <div 
                        key={index}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #D45B2D',
                          background: 'rgba(212, 91, 45, 0.1)',
                          fontSize: '12px',
                          fontFamily: 'Sora, sans-serif',
                          fontWeight: 500,
                          color: '#D45B2D',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '100%'
                        }}
                      >
                        {code.summary || code.code}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          ) : (
            <div style={{ 
              textAlign: 'center', 
              marginTop: '1rem',
              color: '#666',
              fontSize: '16px'
            }}>
              Please reload app to see your deals
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SwiperComponent;
