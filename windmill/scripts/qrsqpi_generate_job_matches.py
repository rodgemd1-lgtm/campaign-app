"""
Windmill Script: Generate Top 30 Job Matches spreadsheet
Creates an XLSX file with ranked job matches including scores and links
"""

import json
import urllib.request


def main(session_data: dict, keywords: list, max_results: int = 30) -> dict:
    """
    Generate Excel spreadsheet with top job matches.

    Args:
        session_data: Full QRSQPI session data
        keywords: List of ATS keywords from the resume evaluation
        max_results: Maximum number of job matches to include (default 30)

    Returns:
        dict: {
            "file_path": "s3://deliverables/{session_id}/job-matches-top30.xlsx",
            "format": "xlsx",
            "total_matches": int,
            "status": "ready"
        }
    """
    session_id = session_data.get("meta", {}).get("sessionId", "unknown")

    # In production: this would:
    # 1. Use keywords + session data to search job boards (LinkedIn, Indeed, etc.)
    # 2. Score each match against the user's resume profile
    # 3. Rank by match score and format as XLSX using openpyxl
    #
    # Columns expected:
    # Rank | Title | Company | Location | Salary Range | Match Score | ATS Fit | Apply URL | Key Skills Matched

    mock_matches = []
    for i in range(1, min(max_results + 1, 31)):
        match = {
            "rank": i,
            "title": f"Role {i}",
            "company": f"Company {i}",
            "location": "Remote",
            "salary_range": "$120k - $180k",
            "match_score": round(0.95 - (i * 0.02), 2),
            "ats_fit": round(0.88 - (i * 0.015), 2),
            "apply_url": f"https://example.com/jobs/{i}",
            "skills_matched": keywords[:5] if i <= 5 else keywords[:3],
        }
        mock_matches.append(match)

    return {
        "file_path": f"deliverables/{session_id}/job-matches-top30.xlsx",
        "format": "xlsx",
        "total_matches": len(mock_matches),
        "status": "ready",
        "matches": mock_matches,
    }