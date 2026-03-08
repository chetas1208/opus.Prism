#!/bin/bash
# -------------------------------------------------------------
# Script to serve Qwen2.5 7B Instruct via vLLM
# -------------------------------------------------------------
# This model acts as the "Chatbot & Light Logic Engine"
# Default endpoint: http://localhost:8002/v1

echo "Starting vLLM server for Qwen2.5-7B-Instruct..."
python3 -m vllm.entrypoints.openai.api_server \
    --model Qwen/Qwen2.5-7B-Instruct \
    --port 8002 \
    --dtype auto \
    --max-model-len 8192 \
    --gpu-memory-utilization 0.9 \
    --host 0.0.0.0
