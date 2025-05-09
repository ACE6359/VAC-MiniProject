// Calculator.js
class Calculator {
  constructor() {
    this.input = document.getElementById('input');
    this.micBtn = document.getElementById('micBtn');
    this.buttons = document.querySelectorAll('.button-grid button');
    this.clearBtn = document.getElementById('clear');
    this.deleteBtn = document.getElementById('delete');
    
    this.calculation = '';
    this.setupEventListeners();
    this.loadLastCalculation();
  }
  
  setupEventListeners() {
    // Number and operator buttons
    this.buttons.forEach(button => {
      if (button.id !== 'clear' && button.id !== 'delete') {
        button.addEventListener('click', () => {
          const value = button.textContent;
          
          if (value === '=') {
            this.calculateResult();
          } else {
            this.calculation += value;
            this.updateDisplay();
          }
        });
      }
    });
    
    // Clear button
    this.clearBtn.addEventListener('click', () => {
      this.calculation = '';
      this.updateDisplay();
    });
    
    // Delete button
    this.deleteBtn.addEventListener('click', () => {
      this.calculation = this.calculation.slice(0, -1);
      this.updateDisplay();
    });
    
    // Voice recognition
    this.setupVoiceRecognition();
    
    // Keyboard input
    document.addEventListener('keydown', (e) => this.handleKeyboardInput(e));
  }
  
  loadLastCalculation() {
    // Load from local storage temporarily, will be replaced with DB fetch
    const lastCalc = localStorage.getItem('lastCalculation');
    if (lastCalc) {
      this.calculation = lastCalc;
      this.updateDisplay();
    }
    
    // In production, fetch from backend
    this.fetchLastCalculation();
  }
  
  async fetchLastCalculation() {
    try {
      const response = await fetch('/api/calculation/last');
      if (response.ok) {
        const data = await response.json();
        if (data.calculation) {
          this.calculation = data.calculation;
          this.updateDisplay();
        }
      }
    } catch (error) {
      console.error('Failed to fetch last calculation:', error);
    }
  }
  
  updateDisplay() {
    this.input.value = this.calculation;
    // Store locally for immediate access
    localStorage.setItem('lastCalculation', this.calculation);
  }
  
  async calculateResult() {
    try {
      const expression = this.calculation;
      
      // First try client-side calculation for simple expressions
      let result;
      try {
        // Use Function instead of eval for slightly better security
        result = new Function('return ' + expression)();
      } catch (e) {
        // If client-side fails, try server-side calculation
        result = await this.calculateServerSide(expression);
      }
      
      // Check if we got a valid result
      if (result !== undefined && !isNaN(result)) {
        // Add to history via History component
        window.historyManager.addEntry(`${expression} = ${result}`);
        
        // Update display
        this.calculation = String(result);
        this.updateDisplay();
        this.input.classList.add('success-flash');
        setTimeout(() => this.input.classList.remove('success-flash'), 500);
      } else {
        throw new Error('Invalid calculation');
      }
    } catch (error) {
      console.error('Calculation error:', error);
      this.calculation = 'Error';
      this.updateDisplay();
      setTimeout(() => {
        this.calculation = '';
        this.updateDisplay();
      }, 1500);
    }
  }
  
  async calculateServerSide(expression) {
    try {
      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ expression })
      });
      
      if (!response.ok) {
        throw new Error('Server calculation failed');
      }
      
      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('Server calculation error:', error);
      throw error;
    }
  }
  
  setupVoiceRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
      
      this.micBtn.addEventListener('click', () => this.startVoiceRecognition());
      
      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        this.processVoiceInput(transcript);
      };
      
      this.recognition.onend = () => {
        this.micBtn.style.backgroundColor = 'var(--mic-color)';
        this.micBtn.textContent = '🎤';
      };
      
      this.recognition.onerror = () => {
        this.micBtn.style.backgroundColor = 'var(--mic-color)';
        this.micBtn.textContent = '🎤';
        
        this.calculation = 'Voice Error';
        this.updateDisplay();
        setTimeout(() => {
          this.calculation = '';
          this.updateDisplay();
        }, 1500);
      };
    } else {
      this.micBtn.disabled = true;
      this.micBtn.title = 'Voice recognition not supported in this browser';
      this.micBtn.style.backgroundColor = '#ccc';
    }
  }
  
  startVoiceRecognition() {
    // Visual feedback
    this.micBtn.style.backgroundColor = '#ff6666';
    this.micBtn.textContent = '🔴';
    
    // Start recognition
    this.recognition.start();
  }
  
  async processVoiceInput(transcript) {
    console.log('Voice input:', transcript);
    
    // Try client-side processing first
    if (this.handleVoiceCommand(transcript)) {
      return; // Command handled locally
    }
    
    // If not handled locally, send to backend for AI processing
    try {
      const response = await fetch('/api/voice-process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transcript })
      });
      
      if (!response.ok) {
        throw new Error('Voice processing failed');
      }
      
      const data = await response.json();
      
      if (data.expression) {
        this.calculation = data.expression;
        this.updateDisplay();
        
        if (data.autoCalculate) {
          this.calculateResult();
        }
      } else if (data.error) {
        this.calculation = data.error;
        this.updateDisplay();
        setTimeout(() => {
          this.calculation = '';
          this.updateDisplay();
        }, 1500);
      }
    } catch (error) {
      console.error('Voice processing error:', error);
      this.calculation = 'Server Error';
      this.updateDisplay();
      setTimeout(() => {
        this.calculation = '';
        this.updateDisplay();
      }, 1500);
    }
  }
  
  handleVoiceCommand(transcript) {
    // Handle simple voice commands client-side
    
    // Clear command
    if (transcript.includes('clear') || transcript.includes('reset')) {
      this.calculation = '';
      this.updateDisplay();
      return true;
    }
    
    // Equals command
    if (transcript.includes('equals') || transcript.includes('result') || 
        transcript.includes('calculate') || transcript.includes('total')) {
      this.calculateResult();
      return true;
    }
    
    // Simple number and operator conversion
    // This is a fallback - more complex processing happens on the server
    const simpleExpression = transcript
      .replace(/plus/g, '+')
      .replace(/minus/g, '-')
      .replace(/times/g, '*')
      .replace(/multiplied by/g, '*')
      .replace(/divided by/g, '/')
      .replace(/divide by/g, '/')
      .replace(/point/g, '.');
    
    // Try to format as a valid expression
    try {
      // Remove anything that's not a number, operator, decimal point, or parentheses
      const cleanExpression = simpleExpression.replace(/[^0-9+\-*/.()]/g, '');
      
      if (cleanExpression && cleanExpression !== transcript) {
        this.calculation = cleanExpression;
        this.updateDisplay();
        return true;
      }
    } catch (error) {
      console.error('Voice command processing error:', error);
    }
    
    return false; // Not handled locally
  }
  
  handleKeyboardInput(e) {
    // Handle numeric keys (0-9)
    if ((e.key >= '0' && e.key <= '9') || 
        e.key === '+' || e.key === '-' || 
        e.key === '*' || e.key === '/' || 
        e.key === '.') {
      this.calculation += e.key;
      this.updateDisplay();
      e.preventDefault();
    } 
    // Handle Enter key as equals
    else if (e.key === 'Enter') {
      this.calculateResult();
      e.preventDefault();
    } 
    // Handle Backspace
    else if (e.key === 'Backspace') {
      this.calculation = this.calculation.slice(0, -1);
      this.updateDisplay();
      e.preventDefault();
    } 
    // Handle Escape key as clear
    else if (e.key === 'Escape') {
      this.calculation = '';
      this.updateDisplay();
      e.preventDefault();
    }
  }
}


// Export for module usage
export default Calculator;