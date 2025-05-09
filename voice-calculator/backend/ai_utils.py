import re
import traceback
from sympy import sympify, SympifyError, simplify, pretty

# Mapping of spoken words to symbols
VOICE_REPLACEMENTS = {
    "plus": "+",
    "minus": "-",
    "times": "*",
    "multiplied by": "*",
    "divided by": "/",
    "over": "/",
    "into": "*",
    "power": "**",
    "to the power of": "**",
    "square root of": "sqrt",
    "squared": "**2",
    "cubed": "**3",
    "mod": "%",
    "modulus": "%",
    "percent": "/100",
}

def clean_voice_input(text):
    """
    Clean up voice input by replacing common phrases with symbols.

    Args:
        text (str): Raw transcribed voice input.

    Returns:
        str: Cleaned expression ready for evaluation.
    """
    text = text.lower()
    for word, symbol in VOICE_REPLACEMENTS.items():
        text = text.replace(word, symbol)
    text = re.sub(r"[^0-9a-zA-Z+\-*/().%^ ]", "", text)  # Remove unsupported characters
    return text.strip()

def process_voice_command(transcript):
    """
    Process voice input and return the evaluated result.

    Args:
        transcript (str): Transcribed voice input string.

    Returns:
        dict: A dictionary containing success status, result, error message, and steps (if any).
    """
    try:
        cleaned_input = clean_voice_input(transcript)

        if not cleaned_input:
            return {
                "success": False,
                "result": None,
                "error": "Empty or invalid expression.",
                "steps": None,
            }

        # Attempt symbolic parsing with SymPy
        expr = sympify(cleaned_input)
        simplified = simplify(expr)
        result = str(simplified)

        # For explanation, generate a pretty (step-like) form
        steps = pretty(expr) + " = " + pretty(simplified)

        return {
            "success": True,
            "result": result,
            "error": None,
            "steps": steps,
        }

    except SympifyError:
        return {
            "success": False,
            "result": None,
            "error": "Could not understand the math expression.",
            "steps": None,
        }
    except ZeroDivisionError:
        return {
            "success": False,
            "result": None,
            "error": "Division by zero is not allowed.",
            "steps": None,
        }
    except Exception as e:
        return {
            "success": False,
            "result": None,
            "error": f"Unexpected error: {str(e)}",
            "steps": traceback.format_exc()
        }
