document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const input = document.getElementById('input');
  const micBtn = document.getElementById('micBtn');
  const buttons = document.querySelectorAll('.button-grid button');
  const clearBtn = document.getElementById('clear');
  const deleteBtn = document.getElementById('delete');
  const themeToggle = document.getElementById('themeToggle');
  const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
  const historyPanel = document.getElementById('historyPanel');
  const historyList = document.getElementById('historyList');
  
  // Variables
  let calculation = '';
  let history = [];
  let isRecording = false;
  let recognition;

  // Initialize speech recognition if available
  if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    // Handle recognition results
    recognition.onresult = function(event) {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      processVoiceCommand(transcript);
    };

    // Handle recognition end
    recognition.onend = function() {
      micBtn.classList.remove('recording');
      isRecording = false;
    };

    // Handle recognition errors
    recognition.onerror = function(event) {
      console.error('Speech recognition error:', event.error);
      micBtn.classList.remove('recording');
      isRecording = false;
    };
  }

  // Event Listeners
  
  // Mic button - toggle recording state with animation
  if (micBtn) {
    micBtn.addEventListener('click', function() {
      toggleMicrophone();
    });
  }

  // Number and operator buttons
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const value = button.textContent;
      
      if (value === '=') {
        calculate();
      } else {
        appendToInput(value);
      }
    });
  });

  // Clear button
  if (clearBtn) {
    clearBtn.addEventListener('click', clearInput);
  }

  // Delete button
  if (deleteBtn) {
    deleteBtn.addEventListener('click', deleteLastChar);
  }

  // Theme toggle
  if (themeToggle) {
    themeToggle.addEventListener('change', toggleTheme);
  }

  // History toggle
  if (toggleHistoryBtn) {
    toggleHistoryBtn.addEventListener('click', toggleHistory);
  }

  // Functions
  
  function toggleMicrophone() {
    // Regardless of speech recognition availability, toggle the animation
    if (isRecording) {
      // If already recording, stop
      if (recognition) {
        recognition.stop();
      }
      micBtn.classList.remove('recording');
      isRecording = false;
    } else {
      // Start recording if speech recognition is available
      if (recognition) {
        try {
          recognition.start();
        } catch (e) {
          console.error('Error starting speech recognition:', e);
        }
      }
      // Always show the animation regardless if recognition is supported
      micBtn.classList.add('recording');
      isRecording = true;
      
      // If no speech recognition, add a timeout to stop the animation after 10 seconds
      if (!recognition) {
        setTimeout(() => {
          micBtn.classList.remove('recording');
          isRecording = false;
        }, 10000);
      }
    }
  }
  
  function appendToInput(value) {
    calculation += value;
    input.value = calculation;
  }

  function clearInput() {
    calculation = '';
    input.value = '';
  }

  function deleteLastChar() {
    calculation = calculation.slice(0, -1);
    input.value = calculation;
  }

  function calculate() {
    if (!calculation) return;
    
    try {
      // Save current calculation to history
      history.push(calculation);
      
      // Use Function constructor for safer evaluation
      const result = Function('"use strict"; return (' + calculation + ')')();
      
      // Update display and add to history
      input.value = result;
      calculation = String(result);
      
      // Update history display
      addToHistoryDisplay(calculation + ' = ' + result);
      
    } catch (error) {
      input.value = 'Error';
      setTimeout(clearInput, 1500);
    }
  }

  function toggleTheme() {
    if (themeToggle.checked) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  function toggleHistory() {
    historyPanel.classList.toggle('visible');
    toggleHistoryBtn.textContent = historyPanel.classList.contains('visible') ? 'Hide History ↑' : 'Show History ↓';
  }

  function addToHistoryDisplay(item) {
    const li = document.createElement('li');
    li.textContent = item;
    historyList.prepend(li);
  }

  function processVoiceCommand(command) {
    console.log('Voice command:', command);
    
    // Handle calculation commands
    if (command.includes('calculate') || command.includes('equals') || command.includes('equal')) {
      // Extract the mathematical expression
      let expression = command.replace(/(calculate|equals|equal|what is)/g, '').trim();
      
      // Replace spoken words with operators
      expression = expression.replace(/plus/g, '+')
                            .replace(/minus/g, '-')
                            .replace(/times/g, '*')
                            .replace(/multiplied by/g, '*')
                            .replace(/divided by/g, '/')
                            .replace(/divide by/g, '/');
      
      // Set the expression and calculate
      calculation = expression;
      input.value = expression;
      calculate();
    }
    // Handle direct calculations like "2 plus 2"
    else if (/\d/.test(command) && (
      command.includes('plus') || 
      command.includes('minus') || 
      command.includes('times') || 
      command.includes('divided by') ||
      command.includes('multiply by')
    )) {
      // Convert spoken words to mathematical operators
      let expression = command.replace(/plus/g, '+')
                             .replace(/minus/g, '-')
                             .replace(/times/g, '*')
                             .replace(/multiplied by/g, '*')
                             .replace(/multiply by/g, '*')
                             .replace(/divided by/g, '/')
                             .replace(/divide by/g, '/');
      
      // Set the expression and calculate
      calculation = expression;
      input.value = expression;
      calculate();
    }
    // Handle clear command
    else if (command.includes('clear')) {
      clearInput();
    }
    // Handle direct numbers or expressions
    else if (/\d/.test(command) || /[\+\-\*\/]/.test(command)) {
      calculation = command;
      input.value = command;
    }
  }
});