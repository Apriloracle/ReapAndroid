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
  const [selectedCode, setSelectedCode] = useState<any>(null);
  const [showHint, setShowHint] = useState(true);
  const [showSwipeIcon, setShowSwipeIcon] = useState(true);


  // Animation styles
  const animations = `
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
       @keyframes swipeHint {
      0% { transform: translateX(0) scale(1); opacity: 0.8; }
      50% { transform: translateX(20px) scale(1.1); opacity: 1; }
      100% { transform: translateX(0) scale(1); opacity: 0.8; }
    }
  `;

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
      <style>{animations}</style>
      
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '1rem' }}>
          Loading deals...
        </div>
      ) : (
        <div style={{ 
          width: '100%', 
          minHeight: '426px',
          display: 'flex', 
          justifyContent: 'center',
          padding: '16px 0',
          position: 'relative'
        }}>
          {validRecommendations.length > 0 ? (
            currentDeal && (
              <div key={currentDeal.dealId} style={{ 
                width: 360, 
                minHeight: 426,
                position: 'relative',
                backgroundColor: '#F7F7F7',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* Swipe Icon Overlay */}
                {showSwipeIcon && currentDealIndex === 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    right: '20px',
                    transform: 'translateY(-50%)',
                    fontSize: '32px',
                    animation: 'swipeHint 1.5s ease-in-out infinite',
                    zIndex: 2,
                    pointerEvents: 'none',
                    opacity: 0.8
                  }}>
                    👆
                  </div>
                )}
                {/* Image Section */}
                <div style={{ 
                  position: 'relative',
                  width: '100%',
                  flex: '1 1 60%',
                  minHeight: '250px',
                  background: 'linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(72, 72, 72, 0.75) 54%, #010101 92%)'
                }}>
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

                {/* Content Section */}
                <div style={{ 
                  padding: '16px',
                  background: '#010101',
                  flex: '0 0 auto',
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
                        fontSize: '18px',
                        fontFamily: 'Sora, sans-serif',
                        fontWeight: 600,
                        color: '#D45B2D'
                      }}>
                        ${currentDeal.dealValue}
                      </div>
                    )}
                  </div>

                  {/* Deal Codes Section */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    flexWrap: 'wrap',
                    marginTop: '8px',
                    position: 'relative'
                  }}>
                    <div style={{
                      width: '100%',
                      fontSize: '10px',
                      color: 'rgba(250, 131, 3, 0.7)',
                      fontStyle: 'italic',
                      marginBottom: '4px'
                    }}>
                      Tap code for more details 
                    </div>

                    {parseCodes().map((code: any, index: number) => {
                      const hasSummary = !!code.summary;
                      let isFirstClickable = false;
                      
                      // Find first code with summary
                      if (hasSummary) {
                        const previousCodes = parseCodes().slice(0, index);
                        isFirstClickable = !previousCodes.some(c => c.summary);
                      }

                      return (
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
                            maxWidth: '100%',
                            cursor: hasSummary ? 'pointer' : 'default',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'transform 0.2s ease, opacity 0.2s ease',
                            animation: isFirstClickable ? 'pulse 1.5s ease-in-out 2' : 'none'
                          }}
                          onClick={() => {
                            if (hasSummary) {
                              setSelectedCode(code);
                              setShowHint(false);
                            }
                          }}
                        >
                          {/* to show codes or summary in boxes */}
                          {code.code || code.summary}
                          {hasSummary && (
                            <span style={{ 
                              fontSize: '10px',
                              opacity: 0.7,
                              display: 'inline-block',
                              transform: 'translateY(1px)'
                            }}>
                              
                            </span>
                          )}
                        </div>
                      )
                    })}

                    {/* Mobile Tooltip */}
                    {showHint && parseCodes().some(code => code.summary) && (
                      <div style={{
                        position: 'absolute',
                        bottom: '-28px',
                        fontSize: '10px',
                        color: 'rgba(250, 131, 3, 0.7)',
                        width: '100%',
                        textAlign: 'center',
                        animation: 'fadeIn 0.5s ease'
                      }}>
                        Tap code for more details
                      </div>
                    )}
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
              No deals available at the moment
            </div>
          )}

          {/* Summary Popup Modal */}
          {selectedCode && (
            <div 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
              }}
              onClick={() => setSelectedCode(null)}
            >
              <div 
                style={{
                  backgroundColor: '#000000',
                  padding: '20px',
                  borderRadius: '8px',
                  maxWidth: '80%',
                  maxHeight: '80%',
                  overflow: 'auto',
                  color: '#D45B2D',
                  fontFamily: 'Sora, sans-serif',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {selectedCode.code && (
                  <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
                    Code: {selectedCode.code}
                  </div>
                )}
                <div>{selectedCode.summary}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SwiperComponent;
