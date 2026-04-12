"""
Windmill Script: Generate tailored cover letters for each target role
Uses AI to create role-specific cover letters optimized for ATS
"""

import json
import urllib.request


def main(session_data: dict, target_roles: list) -> dict:
    """
    Generate cover letters for each target role.

    Args:
        session_data: Full QRSQPI session data
        target_roles: List of target role dictionaries with title, company, etc.

    Returns:
        dict: {
            "cover_letters": [...],
            "total_count": int,
            "status": "ready"
        }
    """
    session_id = session_data.get("meta", {}).get("sessionId", "unknown")
    base_score = session_data.get("baseScore", {})
    keywords = base_score.get("keywords", [])
    strengths = base_score.get("strengths", [])

    cover_letters = []

    for i, role in enumerate(target_roles):
        role_title = role.get("title", f"Target Role {i+1}")
        company = role.get("company", "the organization")

        # In production: call OpenAI/Claude API to generate personalized cover letter
        # using session_data context, keywords, and role details
        cover_letter = {
            "role_title": role_title,
            "company": company,
            "file_path": f"deliverables/{session_id}/cover-letter-{i+1}.docx",
            "format": "docx",
            "keywords_matched": keywords[:5],  # Top 5 keywords for this role
            "strengths_highlighted": strengths[:3],
        }
        cover_letters.append(cover_letter)

    return {
        "cover_letters": cover_letters,
        "total_count": len(cover_letters),
        "status": "ready",
    }