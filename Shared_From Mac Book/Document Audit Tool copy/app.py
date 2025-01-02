from flask import Flask, send_from_directory, jsonify, request, make_response
from flask_cors import CORS  # Enable CORS
import openai
from dotenv import load_dotenv
import os
import logging

# Load environment variables
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

# Initialize Flask app
app = Flask(__name__, static_folder='static')
CORS(app)  # Enable CORS globally for the app

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("AdmissionAuditSystem")

# Root route for basic testing
@app.route('/')
def home():
    logger.info("Root endpoint accessed.")
    return "Welcome to the Admission Audit System!"

# Route to serve the Audit Note HTML file
@app.route('/audit-note', methods=['GET'])
def audit_note():
    try:
        logger.info("Serving Audit_Note_02.html...")
        response = make_response(send_from_directory('static', 'Audit_Note_02.html'))
        # Add Cache-Control headers
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response
    except FileNotFoundError:
        logger.error("Audit_Note_02.html not found in the static folder.")
        return jsonify({"error": "Audit_Note_02.html not found in the static folder."}), 404
    except Exception as e:
        logger.error(f"Unexpected error serving Audit_Note_02.html: {e}")
        return jsonify({"error": "Could not serve Audit_Note_02.html."}), 500

# Route to serve the ICD-10 JSON data
@app.route('/icd10-data', methods=['GET'])
def get_icd10data():
    try:
        logger.info("Serving ICD10data.json...")
        response = make_response(send_from_directory('static', 'ICD10data.json', as_attachment=False))
        # Add Cache-Control headers
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response
    except FileNotFoundError:
        logger.error("ICD10data.json file not found in the static folder.")
        return jsonify({"error": "ICD10data.json not found in the static folder."}), 404
    except Exception as e:
        logger.error(f"Unexpected error serving ICD10data.json: {e}")
        return jsonify({"error": "Could not serve ICD10data.json. Please try again later."}), 500

# Route to process and generate enhanced documentation
@app.route('/generate-summary', methods=['POST'])
def generate_summary():
    try:
        data = request.get_json()
        logger.debug(f"Received data for generation: {data}")
        
        # Validate input data
        note = data.get('note', '').strip()
        icd10s = data.get('icd10s', [])

        if not note:
            logger.warning("Missing admission note in request.")
            return jsonify({"error": "Admission note is missing."}), 400

        icd10_list = "\n".join([f"- {code}" for code in icd10s]) if icd10s else "None provided."
        logger.info(f"Processing note: {note}")
        logger.info(f"ICD-10 codes provided: {icd10_list}")

        # Call OpenAI API to generate the enhanced documentation
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
            max_tokens=2000,
            temperature=0.7
        )
        result = response['choices'][0]['message']['content'].strip()

        # Dynamically calculate metrics
        estimated_gmlos = max(4.8, len(icd10s) * 1.2)  # Adjusted dynamic logic
        estimated_cmi = 1.63 + len(icd10s) * 0.1  # Adjusted dynamic logic
        rvu_estimation = len(icd10s) * 1.5 if icd10s else 3.0  # Adjusted RVU logic

        logger.info("Documentation generation successful.")
        return jsonify({
            "result": result,
            "gmlos": round(estimated_gmlos, 2),
            "cmi": round(estimated_cmi, 2),
            "rvu": round(rvu_estimation, 2)
        })

    except openai.error.OpenAIError as api_error:
        logger.error(f"OpenAI API error: {api_error}")
        return jsonify({"error": "Failed to connect to OpenAI API. Please try again later."}), 500
    except Exception as e:
        logger.error(f"Unexpected error during generation: {e}")
        return jsonify({"error": "An unexpected error occurred. Please try again."}), 500

# Run the app
if __name__ == '__main__':
    logger.info("Starting Admission Audit System Flask app...")
    app.run(debug=True, port=5100)
