import openai
import os
from dotenv import load_dotenv

# Load the environment variables
load_dotenv()

# Retrieve the API key from the .env file
api_key = os.getenv("OPENAI_API_KEY")

if not api_key:
    print("Error: OPENAI_API_KEY not found in .env file.")
else:
    openai.api_key = api_key

    try:
        # Test the API by generating a simple message
        response = openai.ChatCompletion.create(
            model="gpt-4",  # Use "gpt-3.5-turbo" if GPT-4 isn't available
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "This is a test message for the OpenAI API."}
            ],
            max_tokens=50
        )
        print("API Response:", response["choices"][0]["message"]["content"].strip())
    except openai.error.OpenAIError as e:
        print("OpenAI API Error:", str(e))
