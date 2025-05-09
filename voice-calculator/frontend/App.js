// App.js - Main frontend application entry point
import Calculator from './Calculator.js';
import History from './History.js';
import ThemeSelector from './ThemeSelector.js';

class App {
  constructor() {
    this.initializeComponents();
    this.registerServiceWorker();
  }

  initializeComponents() {
    // Initialize components and make them globally available
    // This allows components to reference each other
    window.themeSelector = new ThemeSelector();
    window.historyManager = new History();
    window.calculator = new Calculator();

    // Check for online/offline status
    this.setupOnlineStatusMonitoring();
  }

  setupOnlineStatusMonitoring() {
    const statusIndicator = document.createElement('div');
    statusIndicator.className = 'status-indicator';
    document.querySelector('.app-container').appendChild(statusIndicator);

    const updateOnlineStatus = () => {
      if (navigator.onLine) {
        statusIndicator.textContent = '🟢';
        statusIndicator.title = 'Online - All features available';
        statusIndicator.classList.remove('offline');
      } else {
        statusIndicator.textContent = '🔴';
        statusIndicator.title = 'Offline - Some features may be limited';
        statusIndicator.classList.add('offline');
        this.showOfflineNotification();
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus(); // Initial check
  }

  showOfflineNotification() {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'offline-notification';
    notification.textContent = 'You are offline. Some features may be limited.';
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.className = 'close-notification';
    closeBtn.addEventListener('click', () => document.body.removeChild(notification));
    notification.appendChild(closeBtn);
    
    // Add to body and auto-remove after 5 seconds
    document.body.appendChild(notification);
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 5000);
  }

  registerServiceWorker() {
    // Register service worker for PWA functionality
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(registration => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
          })
          .catch(error => {
            console.error('ServiceWorker registration failed: ', error);
          });
      });
    }
  }
}

// Initialize app when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  new App();
});

export default App;