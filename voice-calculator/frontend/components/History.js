// History.js
class History {
  constructor() {
    this.historyList = document.getElementById('historyList');
    this.toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
    this.historyPanel = document.getElementById('historyPanel');
    
    this.history = [];
    this.maxHistoryItems = 10; // Maximum number of history items to display
    
    this.setupEventListeners();
    this.loadHistory();
  }
  
  setupEventListeners() {
    // Toggle history panel visibility
    this.toggleHistoryBtn.addEventListener('click', () => {
      this.historyPanel.classList.toggle('visible');
      this.toggleHistoryBtn.textContent = this.historyPanel.classList.contains('visible') 
        ? 'Hide History ↑' 
        : 'Show History ↓';
    });
  }
  
  async loadHistory() {
    // Try to fetch from backend first
    try {
      const response = await fetch('/api/history');
      if (response.ok) {
        const data = await response.json();
        this.history = data.history || [];
        this.updateHistoryDisplay();
      } else {
        throw new Error('Failed to fetch history');
      }
    } catch (error) {
      console.error('History fetch error:', error);
      
      // Fallback to localStorage if server fetch fails
      this.history = JSON.parse(localStorage.getItem('calcHistory')) || [];
      this.updateHistoryDisplay();
    }
  }
  
  async addEntry(entry) {
    // Add to local cache first
    this.history.unshift(entry); // Add to beginning
    if (this.history.length > this.maxHistoryItems) {
      this.history.pop(); // Keep only the maximum number of entries
    }
    
    // Update localStorage as backup
    localStorage.setItem('calcHistory', JSON.stringify(this.history));
    
    // Update UI
    this.updateHistoryDisplay();
    
    // Send to backend
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ entry })
      });
    } catch (error) {
      console.error('Failed to save history to server:', error);
    }
  }
  
  updateHistoryDisplay() {
    this.historyList.innerHTML = '';
    
    this.history.forEach(entry => {
      const li = document.createElement('li');
      li.className = 'history-item';
      li.textContent = entry;
      
      // Add click event to restore calculation
      li.addEventListener('click', () => {
        // Extract just the result part (after =)
        const resultPart = entry.split('=')[1]?.trim() || '';
        
        // Set as current calculation (using Calculator instance)
        if (window.calculator && resultPart) {
          window.calculator.calculation = resultPart;
          window.calculator.updateDisplay();
        }
      });
      
      this.historyList.appendChild(li);
    });
  }
  
  async clearHistory() {
    // Clear local data
    this.history = [];
    localStorage.removeItem('calcHistory');
    this.updateHistoryDisplay();
    
    // Clear backend data
    try {
      await fetch('/api/history', {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Failed to clear history on server:', error);
    }
  }
}

// Export for module usage
export default History;