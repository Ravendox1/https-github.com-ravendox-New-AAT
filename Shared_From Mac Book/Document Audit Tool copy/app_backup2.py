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
    icd10s = data.get('icd10s', [])

    if not note:
        return jsonify({"error": "Admission note is missing."}), 400

    # Constructing additional ICD-10 string if provided
    icd10_list = "\n".join([f"- {code}" for code in icd10s]) if icd10s else "None provided."

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

Admission Note:
{note}

ICD-10 Codes Provided:
{icd10_list}

Enhanced summary:
"""
                }
            ],
            max_tokens=1000,
            temperature=0.7
        )
        result = response['choices'][0]['message']['content'].strip()

        # Example metrics to include in the response
        estimated_gmlos = 4.8  # Replace with dynamic calculation if applicable
        estimated_cmi = 1.63  # This value can be adjusted or calculated based on the ICD-10 codes and complexity
        rvu_estimation = len(icd10s) * 1.5 if icd10s else 3.0  # Adjusted logic to calculate RVU based on selected ICD-10 codes

        return jsonify({
            "result": result,
            "gmlos": estimated_gmlos,
            "cmi": estimated_cmi,
            "rvu": rvu_estimation
        })

    except openai.error.OpenAIError as api_error:
        print(f"OpenAI API error: {api_error}")
        return jsonify({"error": "Failed to connect to OpenAI API. Please try again later."}), 500
    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({"error": "An unexpected error occurred. Please try again."}), 500

# Run the app
if __name__ == '__main__':
    app.run(debug=True, port=5100)
