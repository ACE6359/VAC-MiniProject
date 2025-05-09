// ThemeSelector.js
class ThemeSelector {
  constructor() {
    this.checkbox = document.getElementById('checkbox');
    this.currentTheme = 'light';
    
    this.setupEventListeners();
    this.loadThemePreference();
  }
  
  setupEventListeners() {
    this.checkbox.addEventListener('change', () => {
      this.toggleTheme();
    });
  }
  
  toggleTheme() {
    // Toggle between light and dark themes
    const isDarkMode = this.checkbox.checked;
    this.currentTheme = isDarkMode ? 'dark' : 'light';
    
    // Apply theme to document body
    document.body.classList.toggle('dark', isDarkMode);
    
    // Save preference
    this.saveThemePreference();
    
    // Announce theme change for screen readers
    this.announceThemeChange();
  }
  
  loadThemePreference() {
    // Try to load from server first
    this.fetchThemePreference()
      .catch(() => {
        // Fallback to localStorage if server fetch fails
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
          this.applyTheme(savedTheme);
        } else {
          // Check for system preference if no saved preference
          this.checkSystemPreference();
        }
      });
  }
  
  async fetchThemePreference() {
    try {
      const response = await fetch('/api/preferences/theme');
      if (response.ok) {
        const data = await response.json();
        if (data.theme) {
          this.applyTheme(data.theme);
        }
      } else {
        throw new Error('Failed to fetch theme preference');
      }
    } catch (error) {
      console.error('Theme preference fetch error:', error);
      throw error; // Re-throw to trigger fallback
    }
  }
  
  async saveThemePreference() {
    // Save to localStorage for immediate access
    localStorage.setItem('theme', this.currentTheme);
    
    // Save to server if possible
    try {
      await fetch('/api/preferences/theme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ theme: this.currentTheme })
      });
    } catch (error) {
      console.error('Failed to save theme preference to server:', error);
    }
  }
  
  applyTheme(theme) {
    this.currentTheme = theme;
    const isDarkMode = theme === 'dark';
    
    // Update checkbox state
    this.checkbox.checked = isDarkMode;
    
    // Apply theme to document body
    document.body.classList.toggle('dark', isDarkMode);
  }
  
  checkSystemPreference() {
    // Check if user has dark mode preference at OS level
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.applyTheme('dark');
    } else {
      this.applyTheme('light');
    }
    
    // Listen for changes in system preference
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const newTheme = e.matches ? 'dark' : 'light';
      this.applyTheme(newTheme);
    });
  }
  
  announceThemeChange() {
    // Create an announcement for screen readers
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('class', 'sr-only');
    announcement.textContent = `Theme changed to ${this.currentTheme} mode`;
    
    document.body.appendChild(announcement);
    
    // Remove the announcement after it's been read
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 3000);
  }
}

// Export for module usage
export default ThemeSelector;