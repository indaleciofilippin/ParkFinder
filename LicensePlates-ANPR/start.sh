#!/bin/bash

# Start Streamlit app in background (port 8501)
echo "🚀 Starting Streamlit stream service on port 8501..."
streamlit run app_stream.py --server.port 8501 --server.address 0.0.0.0 --server.headless true --server.enableCORS false --server.enableXsrfProtection false &

# Start FastAPI microservice (port 8001)
echo "🚀 Starting FastAPI scan API on port 8001..."
python api.py
