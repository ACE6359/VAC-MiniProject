"""
Text-to-Speech utilities for Voice Calculator application.
Provides functions for generating audio from text and managing audio files.
"""
from gtts import gTTS
import os
import uuid
import logging
import tempfile
import shutil
from pathlib import Path
import time

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
VOICE_DIR = os.path.join(os.path.dirname(__file__), "static", "voice")
MAX_CACHE_SIZE = 100  # Maximum number of TTS files to keep
CLEANUP_THRESHOLD = 80  # Cleanup when we reach this many files

# Ensure voice directory exists
os.makedirs(VOICE_DIR, exist_ok=True)

def generate_tts(text: str, lang: str = "en", slow: bool = False) -> str:
    """
    Generate a TTS mp3 file for the given text.
    Returns the filename (not full path).
    
    Args:
        text (str): Text to convert to speech
        lang (str): Language code for TTS (default: "en")
        slow (bool): Whether to speak slowly (default: False)
    
    Returns:
        str: Generated MP3 filename (without path)
    
    Raises:
        RuntimeError: If TTS generation fails
    """
    if not text:
        logger.warning("Empty text provided for TTS generation")
        return None
    
    # Check cache size and clean up if needed
    _check_cache_size()
    
    try:
        # Create a unique filename
        filename = f"{uuid.uuid4().hex}.mp3"
        filepath = os.path.join(VOICE_DIR, filename)
        
        # Create TTS in a temporary file first to avoid partial files
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            temp_path = temp_file.name
        
        # Generate the TTS file
        tts = gTTS(text=text, lang=lang, slow=slow)
        tts.save(temp_path)
        
        # Move the completed file to the final location
        shutil.move(temp_path, filepath)
        
        logger.info(f"Generated TTS file: {filename} for text: '{text[:30]}{'...' if len(text) > 30 else ''}'")
        return filename
    
    except Exception as e:
        logger.error(f"TTS generation failed: {str(e)}")
        # Clean up temp file if it exists
        if 'temp_path' in locals() and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass
        raise RuntimeError(f"TTS generation failed: {str(e)}")

def get_tts_path(filename: str) -> str:
    """
    Get the full path for a TTS filename.
    
    Args:
        filename (str): TTS filename
    
    Returns:
        str: Full path to the TTS file
    """
    return os.path.join(VOICE_DIR, filename)

def _check_cache_size():
    """
    Check the number of files in the TTS cache directory and clean up old files if needed.
    """
    try:
        # Get all mp3 files in the voice directory
        voice_files = [f for f in os.listdir(VOICE_DIR) if f.endswith('.mp3')]
        
        # If we're over the threshold, clean up
        if len(voice_files) > CLEANUP_THRESHOLD:
            logger.info(f"TTS cache size ({len(voice_files)}) exceeds threshold ({CLEANUP_THRESHOLD}). Cleaning up...")
            
            # Get file paths with their modification times
            file_times = []
            for filename in voice_files:
                file_path = os.path.join(VOICE_DIR, filename)
                mod_time = os.path.getmtime(file_path)
                file_times.append((file_path, mod_time))
            
            # Sort by modification time (oldest first)
            file_times.sort(key=lambda x: x[1])
            
            # Delete oldest files until we're under the maximum
            files_to_delete = len(file_times) - MAX_CACHE_SIZE
            if files_to_delete > 0:
                for i in range(files_to_delete):
                    try:
                        os.remove(file_times[i][0])
                        logger.debug(f"Deleted old TTS file: {os.path.basename(file_times[i][0])}")
                    except Exception as e:
                        logger.warning(f"Failed to delete old TTS file {file_times[i][0]}: {str(e)}")
                
                logger.info(f"Cleaned up {files_to_delete} old TTS files")
    
    except Exception as e:
        logger.error(f"Error during TTS cache cleanup: {str(e)}")

def delete_tts_file(filename: str) -> bool:
    """
    Delete a TTS file.
    
    Args:
        filename (str): TTS filename to delete
    
    Returns:
        bool: True if deleted successfully, False otherwise
    """
    if not filename:
        return False
    
    try:
        filepath = get_tts_path(filename)
        if os.path.exists(filepath):
            os.remove(filepath)
            logger.info(f"Deleted TTS file: {filename}")
            return True
        else:
            logger.warning(f"TTS file not found for deletion: {filename}")
            return False
    except Exception as e:
        logger.error(f"Failed to delete TTS file {filename}: {str(e)}")
        return False

def batch_generate_tts(texts: list, lang: str = "en") -> dict:
    """
    Generate multiple TTS files in batch.
    
    Args:
        texts (list): List of strings to convert to speech
        lang (str): Language code for TTS
    
    Returns:
        dict: Mapping of input texts to their filenames
    """
    results = {}
    for text in texts:
        try:
            filename = generate_tts(text, lang)
            results[text] = filename
        except Exception as e:
            logger.error(f"Failed to generate TTS for '{text}': {str(e)}")
            results[text] = None
    
    return results

def speak_calculation(expression: str, result: str) -> tuple:
    """
    Generate TTS for a calculation and its result.
    
    Args:
        expression (str): The calculation expression
        result (str): The calculation result
    
    Returns:
        tuple: (expression_filename, result_filename)
    """
    expression_speech = f"Calculating {expression}"
    result_speech = f"The result is {result}"
    
    try:
        expr_filename = generate_tts(expression_speech)
        result_filename = generate_tts(result_speech)
        return (expr_filename, result_filename)
    except Exception as e:
        logger.error(f"Failed to generate speech for calculation: {str(e)}")
        return (None, None)
    
text_to_speech = generate_tts
