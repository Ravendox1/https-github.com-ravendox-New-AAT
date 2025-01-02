from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS  # Enable CORS
import openai
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS globally for the app

# Root route for basic testing
@app.route('/')
def home():
    return "Welcome to the Admission Audit System!"

# Route to serve the static Audit Note HTML file
@app.route('/audit-note')
def audit_note():
    try:
        return send_from_directory('static', 'Audit_Note_02.html')
    except Exception as e:
        print(f"Error: {e}")
        return "Error: Could not find Audit_Note_02.html in the static folder.", 404

# Route to process and generate enhanced documentation
@app.route('/generate', methods=['POST'])
def generate():
    data = request.get_json()
    note = data.get('note', '')

    if not note:
        return jsonify({"error": "Admission note is missing."}), 400

    try:
        # OpenAI API call with the updated prompt
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant designed to enhance documentation for hospital admissions."
                },
                {
                    "role": "user",
                    "content": f"""
Based on the following admission note, generate an enhanced summary. Include ICD-10 codes, DRG, GMLOS, and relevant interventions, formatted as a smooth narrative suitable for medical documentation. 

At the end of the documentation, include:
1. The **estimated GMLOS** in bold.
2. A separate section that clearly states the **admission designation** (e.g., inpatient, observation, or discharge to home) based on Milliman and InterQual criteria, formatted in bold.

Admission Note:
{note}

Enhanced summary:
"""
                }
            ],
            max_tokens=1000,
            temperature=0.7
        )
        result = response['choices'][0]['message']['content'].strip()
        return jsonify({"result": result})
    except openai.error.OpenAIError as api_error:
        print(f"OpenAI API error: {api_error}")
        return jsonify({"error": "Failed to connect to OpenAI API. Please try again later."}), 500
    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({"error": "An unexpected error occurred. Please try again."}), 500

# Run the app
if __name__ == '__main__':
    app.run(debug=True, port=5100)
