"""
Windmill Script: Fetch QRSQPI session data
Retrieves scored resume data from storage given a session ID
"""

import json
import urllib.request


def main(session_id: str) -> dict:
    """
    Fetch QRSQPI session results from storage.

    Args:
        session_id: The QRSQPI session identifier

    Returns:
        dict: The full session data including baseScore, panelEvaluation,
              monteCarlo, lineRewrite, and intakeAnalysis
    """
    # In production, this would fetch from your database or object store
    # For now, this demonstrates the expected interface
    url = f"http://localhost:8000/api/w/default/sessions/{session_id}"

    req = urllib.request.Request(url, method="GET")
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", "Bearer <wm_token>")

    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            return data
    except urllib.error.HTTPError as e:
        return {"error": f"Failed to fetch session: {e.code}", "session_id": session_id}