#!/bin/bash
# -------------------------------------------------------------
# Script to serve InternVL2 8B via LMDeploy
# -------------------------------------------------------------
# This Vision Language Model acts as the "TextGuard QA Critic"
# Default endpoint: http://localhost:23333/v1

echo "Starting LMDeploy OpenAI-compatible API for InternVL2-8B..."
lmdeploy serve api_server OpenGVLab/InternVL2-8B \
    --server-name 0.0.0.0 \
    --server-port 23333 \
    --session-len 8192 \
    --cache-max-entry-count 0.2
