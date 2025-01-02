import openai
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Set the API key
openai.api_key = os.getenv("OPENAI_API_KEY")

try:
    # Send a test request to the GPT-4 model
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[
            {"role": "user", "content": "Is my GPT-4 API working correctly?"}
        ],
        max_tokens=50,
    )
    print("API Response:", response["choices"][0]["message"]["content"].strip())
except openai.error.InvalidRequestError as e:
    print("Invalid Request Error:", e)
except openai.error.AuthenticationError as e:
    print("Authentication Error: Invalid API key or permissions.")
except Exception as e:
    print("Other Error:", e)
