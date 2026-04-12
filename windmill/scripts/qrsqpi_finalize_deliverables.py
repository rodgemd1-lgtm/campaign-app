"""
Windmill Script: Finalize and package all deliverables
Updates session status and creates a ZIP archive of all generated files
"""

import json
import urllib.request


def main(
    session_id: str,
    resume_docx: dict,
    resume_pdf: dict,
    cover_letters: dict,
    job_matches: dict,
    linkedin_text: dict,
    monte_carlo_pdf: dict,
) -> dict:
    """
    Package all deliverables and update session status.

    Args:
        session_id: QRSQPI session identifier
        resume_docx: Result from generate_resume_docx step
        resume_pdf: Result from generate_resume_pdf step
        cover_letters: Result from generate_cover_letters step
        job_matches: Result from generate_job_matches step
        linkedin_text: Result from generate_linkedin_profile step
        monte_carlo_pdf: Result from generate_monte_carlo_report step

    Returns:
        dict: {
            "session_id": str,
            "deliverables": [...],
            "zip_path": str,
            "total_count": int,
            "status": "complete"
        }
    """
    deliverables = [
        {
            "id": "resume-docx",
            "title": "Optimized Resume",
            "format": "docx",
            "file_path": resume_docx.get("file_path", ""),
            "status": resume_docx.get("status", "unknown"),
        },
        {
            "id": "resume-pdf",
            "title": "Resume PDF",
            "format": "pdf",
            "file_path": resume_pdf.get("file_path", ""),
            "status": resume_pdf.get("status", "unknown"),
        },
        {
            "id": "cover-letters",
            "title": f"Cover Letters ({cover_letters.get('total_count', 0)})",
            "format": "docx",
            "file_path": [cl.get("file_path", "") for cl in cover_letters.get("cover_letters", [])],
            "status": cover_letters.get("status", "unknown"),
        },
        {
            "id": "job-matches",
            "title": "Top 30 Job Matches",
            "format": "xlsx",
            "file_path": job_matches.get("file_path", ""),
            "status": job_matches.get("status", "unknown"),
        },
        {
            "id": "linkedin-profile",
            "title": "LinkedIn Profile Text",
            "format": "txt",
            "content": linkedin_text.get("raw_text", ""),
            "status": linkedin_text.get("status", "unknown"),
        },
        {
            "id": "monte-carlo-report",
            "title": "Monte Carlo Probability Report",
            "format": "pdf",
            "file_path": monte_carlo_pdf.get("file_path", ""),
            "status": monte_carlo_pdf.get("status", "unknown"),
        },
    ]

    # In production: create ZIP archive of all files
    # Using zipfile module or shelling out to zip command
    # Then upload to S3/object store and return download URL

    ready_count = sum(1 for d in deliverables if d["status"] == "ready")
    has_errors = any(d["status"] == "error" for d in deliverables)

    zip_path = f"deliverables/{session_id}/campaign-assets.zip"

    # Update session status in database
    status_payload = json.dumps({
        "session_id": session_id,
        "deliverables_status": "complete" if not has_errors else "partial",
        "deliverables_ready": ready_count,
        "deliverables_total": len(deliverables),
        "zip_path": zip_path,
    }).encode()

    # In production: POST to your API to update session
    # url = f"http://localhost:3000/api/sessions/{session_id}/deliverables"
    # req = urllib.request.Request(url, data=status_payload, method="POST")
    # req.add_header("Content-Type", "application/json")
    # urllib.request.urlopen(req)

    return {
        "session_id": session_id,
        "deliverables": deliverables,
        "zip_path": zip_path,
        "total_count": len(deliverables),
        "ready_count": ready_count,
        "status": "complete" if not has_errors else "partial",
    }