// Listen for the 'appinstalled' event
window.addEventListener('appinstalled', () => {
  console.log('PWA successfully installed');
  
  // Send the install event to Google Analytics
  sendAnalyticsEvent('PWA Installed');
});

// Function to send event data to Google Analytics
function sendAnalyticsEvent(eventAction) {
  if (typeof gtag === 'function') {
    gtag('event', eventAction, {
      event_category: 'PWA',
      event_label: 'Installation',
    });
  } else {
    console.warn('Google Analytics not initialized');
  }
}
