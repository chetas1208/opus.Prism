#!/bin/bash
# -------------------------------------------------------------
# Script to serve Qwen2.5 14B Instruct via vLLM
# -------------------------------------------------------------
# This model acts as the "Variant Generator" and "Critic"
# Default endpoint: http://localhost:8001/v1

echo "Starting vLLM server for Qwen2.5-14B-Instruct..."
python3 -m vllm.entrypoints.openai.api_server \
    --model Qwen/Qwen2.5-14B-Instruct \
    --port 8001 \
    --dtype auto \
    --max-model-len 8192 \
    --gpu-memory-utilization 0.9 \
    --host 0.0.0.0
