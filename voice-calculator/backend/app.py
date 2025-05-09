"""
Voice Calculator Backend
Flask API to handle calculations, voice recognition, and database operations.
"""

from flask import Flask, request, jsonify, send_from_directory
import os
import re
import json
import traceback
from sympy import sympify, SympifyError

# Import custom modules
from db_utils import init_db, get_calculation_history as get_history, add_calculation as add_history_entry, clear_history
from ai_utils import process_voice_command
from tts_utils import generate_tts as text_to_speech

app = Flask(__name__, static_folder='../frontend')

# Initialize database
init_db()

@app.route('/')
def index():
    """Serve the main application page."""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def static_files(path):
    """Serve static files."""
    return send_from_directory(app.static_folder, path)

@app.route('/api/calculate', methods=['POST'])
def calculate():
    """Calculate the result of a mathematical expression."""
    try:
        data = request.json
        expression = data.get('expression', '')
        
        # Basic validation
        if not expression:
            return jsonify({'error': 'No expression provided'}), 400
        
        # Security: Only allow valid mathematical expressions
        # Remove anything that's not a number, operator, decimal point, parentheses, or math functions
        clean_expr = re.sub(r'[^0-9+\-*/.()\s^a-zA-Z]', '', expression)
        
        # Check if the expression is trying to execute code
        if any(keyword in clean_expr.lower() for keyword in ['import', 'exec', 'eval', 'os', 'sys', '__']):
            return jsonify({'error': 'Invalid expression'}), 400
        
        # Try to evaluate safely using sympy
        try:
            result = float(sympify(clean_expr))
            
            # Round to reasonable precision for display
            if result.is_integer():
                result = int(result)
            elif abs(result) > 1e10 or (abs(result) < 1e-10 and result != 0):
                # Use scientific notation for very large/small numbers
                result = f"{result:.10e}"
            else:
                # Limit decimal places
                result = round(result, 10)
                
            return jsonify({'result': result})
        except (SympifyError, ValueError, TypeError) as e:
            app.logger.error(f"Calculation error: {str(e)}")
            return jsonify({'error': 'Invalid expression'}), 400
            
    except Exception as e:
        app.logger.error(f"Server error in calculate: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': 'Server error'}), 500

@app.route('/api/voice-process', methods=['POST'])
def voice_process():
    """Process voice commands using AI."""
    try:
        data = request.json
        transcript = data.get('transcript', '')
        
        if not transcript:
            return jsonify({'error': 'No transcript provided'}), 400
        
        # Use AI to process voice command
        result = process_voice_command(transcript)
        
        return jsonify(result)
    except Exception as e:
        app.logger.error(f"Voice processing error: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': 'Voice processing failed'}), 500

@app.route('/api/tts', methods=['POST'])
def generate_tts():
    """Generate text-to-speech audio."""
    try:
        data = request.json
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Generate audio file
        audio_path = text_to_speech(text)
        
        return jsonify({'audio_url': f'/audio/{os.path.basename(audio_path)}'})
    except Exception as e:
        app.logger.error(f"TTS error: {str(e)}")
        return jsonify({'error': 'Text-to-speech generation failed'}), 500

@app.route('/api/history', methods=['GET', 'POST', 'DELETE'])
def handle_history():
    """Get, add, or clear calculation history."""
    try:
        if request.method == 'GET':
            # Get history entries
            history = get_history()
            return jsonify({'history': history})
            
        elif request.method == 'POST':
            # Add new history entry
            data = request.json
            entry = data.get('entry', '')
            
            if not entry:
                return jsonify({'error': 'No entry provided'}), 400
                
            add_history_entry(entry)
            return jsonify({'success': True})
            
        elif request.method == 'DELETE':
            # Clear history
            clear_history()
            return jsonify({'success': True})
            
    except Exception as e:
        app.logger.error(f"History operation error: {str(e)}")
        return jsonify({'error': 'History operation failed'}), 500

@app.route('/api/preferences/theme', methods=['GET', 'POST'])
def handle_theme_preference():
    """Get or set theme preference."""
    try:
        if request.method == 'GET':
            # Try to read from file
            theme_file = os.path.join(os.path.dirname(__file__), '..', 'user_preferences.json')
            
            if os.path.exists(theme_file):
                with open(theme_file, 'r') as f:
                    preferences = json.load(f)
                    return jsonify({'theme': preferences.get('theme', 'light')})
            
            return jsonify({'theme': 'light'})  # Default
            
        elif request.method == 'POST':
            data = request.json
            theme = data.get('theme', 'light')
            
            # Validate
            if theme not in ['light', 'dark']:
                return jsonify({'error': 'Invalid theme'}), 400
                
            # Save to file
            theme_file = os.path.join(os.path.dirname(__file__), '..', 'user_preferences.json')
            
            preferences = {}
            if os.path.exists(theme_file):
                with open(theme_file, 'r') as f:
                    preferences = json.load(f)
                    
            preferences['theme'] = theme
            
            with open(theme_file, 'w') as f:
                json.dump(preferences, f)
                
            return jsonify({'success': True})
            
    except Exception as e:
        app.logger.error(f"Theme preference error: {str(e)}")
        return jsonify({'error': 'Theme operation failed'}), 500

@app.route('/api/calculation/last', methods=['GET'])
def get_last_calculation():
    """Get the last calculation."""
    try:
        history = get_history()
        if history:
            # Extract just the result from the last history entry
            last_entry = history[0]
            result = last_entry.split('=')[1].strip() if '=' in last_entry else ''
            return jsonify({'calculation': result})
        
        return jsonify({'calculation': ''})
    except Exception as e:
        app.logger.error(f"Last calculation error: {str(e)}")
        return jsonify({'error': 'Failed to get last calculation'}), 500

if __name__ == '__main__':
    # Use environment variables for configuration
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    app.run(host='0.0.0.0', port=port, debug=debug)