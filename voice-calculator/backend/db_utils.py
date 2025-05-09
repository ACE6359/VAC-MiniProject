"""
Database utilities for Voice Calculator application.
Handles database initialization, queries, and CRUD operations.
"""
import sqlite3
import os
import logging
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'history', 'history.db')
MAX_HISTORY_ENTRIES = 50  # Maximum number of history entries to store

def get_db_connection():
    """Create and return a database connection (initializes DB if needed)."""
    # Ensure the directory exists
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Return rows as dictionaries
    
    # Initialize database tables if they don't exist
    _initialize_db(conn)
    return conn

def _initialize_db(conn):
    """Initialize the database tables if they don't exist."""
    cursor = conn.cursor()
    
    # Create calculation history table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS calculation_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            expression TEXT NOT NULL,
            result TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            voice_input BOOLEAN DEFAULT 0
        )
    ''')
    
    # Create settings table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    ''')
    
    conn.commit()
    logger.debug("Database tables ensured.")

def add_calculation(expression, result, voice_input=False):
    """
    Add a calculation to history.

    Args:
        expression (str): The calculation expression
        result (str): The calculation result
        voice_input (bool): Whether the calculation was from voice input

    Returns:
        int: ID of the newly inserted record
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO calculation_history (expression, result, timestamp, voice_input)
            VALUES (?, ?, ?, ?)
        ''', (expression, result, datetime.now().isoformat(), int(voice_input)))
        
        record_id = cursor.lastrowid
        
        # Enforce history limit
        cursor.execute('''
            DELETE FROM calculation_history
            WHERE id IN (
                SELECT id FROM calculation_history
                ORDER BY timestamp DESC
                LIMIT -1 OFFSET ?
            )
        ''', (MAX_HISTORY_ENTRIES,))
        
        conn.commit()
        logger.info(f"Added calculation to history: {expression} = {result}")
        return record_id

    except sqlite3.Error as e:
        logger.error(f"Error adding calculation: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            conn.close()

def get_calculation_history(limit=None):
    """
    Get calculation history.

    Args:
        limit (int, optional): Maximum number of records to return

    Returns:
        list: List of calculation history records
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if limit:
            cursor.execute('''
                SELECT * FROM calculation_history 
                ORDER BY timestamp DESC 
                LIMIT ?
            ''', (limit,))
        else:
            cursor.execute('''
                SELECT * FROM calculation_history 
                ORDER BY timestamp DESC
            ''')
        
        results = [dict(row) for row in cursor.fetchall()]
        logger.info(f"Retrieved {len(results)} history records")
        return results

    except sqlite3.Error as e:
        logger.error(f"Error retrieving history: {e}")
        raise
    finally:
        if conn:
            conn.close()

def delete_calculation(record_id):
    """
    Delete a calculation from history.

    Args:
        record_id (int): ID of the record to delete

    Returns:
        bool: True if successful, False otherwise
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM calculation_history WHERE id = ?', (record_id,))
        success = cursor.rowcount > 0
        conn.commit()
        
        if success:
            logger.info(f"Deleted history record {record_id}")
        else:
            logger.warning(f"No history record found with ID {record_id}")
        return success

    except sqlite3.Error as e:
        logger.error(f"Error deleting history record: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

def clear_history():
    """
    Clear all calculation history.

    Returns:
        int: Number of records deleted
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM calculation_history')
        count = cursor.rowcount
        conn.commit()
        
        logger.info(f"Cleared history, deleted {count} records")
        return count

    except sqlite3.Error as e:
        logger.error(f"Error clearing history: {e}")
        if conn:
            conn.rollback()
        return 0
    finally:
        if conn:
            conn.close()

def get_setting(key, default=None):
    """
    Get a setting value.

    Args:
        key (str): Setting key
        default: Default value if setting doesn't exist

    Returns:
        str: Setting value
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT value FROM settings WHERE key = ?', (key,))
        row = cursor.fetchone()
        return row['value'] if row else default

    except sqlite3.Error as e:
        logger.error(f"Error retrieving setting '{key}': {e}")
        return default
    finally:
        if conn:
            conn.close()

def set_setting(key, value):
    """
    Set a setting value.

    Args:
        key (str): Setting key
        value (str): Setting value

    Returns:
        bool: True if successful
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', (key, str(value)))
        conn.commit()
        logger.info(f"Set setting: {key} = {value}")
        return True

    except sqlite3.Error as e:
        logger.error(f"Error setting '{key}': {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

def get_voice_calculations(limit=10):
    """
    Get calculation history specifically from voice inputs.

    Args:
        limit (int): Maximum number of records to return

    Returns:
        list: List of voice calculation records
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM calculation_history 
            WHERE voice_input = 1
            ORDER BY timestamp DESC 
            LIMIT ?
        ''', (limit,))
        
        results = [dict(row) for row in cursor.fetchall()]
        logger.info(f"Retrieved {len(results)} voice-input records")
        return results

    except sqlite3.Error as e:
        logger.error(f"Error retrieving voice-input history: {e}")
        raise
    finally:
        if conn:
            conn.close()

def init_db():
    """
    Public function to initialize the database.
    Opens (and thus creates) the DB and then closes it.
    """
    conn = get_db_connection()
    conn.close()
    logger.info("Database initialized.")
