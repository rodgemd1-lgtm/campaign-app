"""
Windmill Script: Generate resume as PDF
Converts DOCX resume to PDF format for print-ready output
"""

import json
import urllib.request


def main(session_data: dict, docx_content: dict) -> dict:
    """
    Generate an optimized resume as PDF.

    Args:
        session_data: Full QRSQPI session data
        docx_content: Result from generate_resume_docx step

    Returns:
        dict: {
            "file_path": "s3://deliverables/{session_id}/resume-optimized.pdf",
            "format": "pdf",
            "size_bytes": int,
            "status": "ready"
        }
    """
    session_id = session_data.get("meta", {}).get("sessionId", "unknown")

    # In production: convert DOCX to PDF using LibreOffice headless
    # subprocess.run(["libreoffice", "--headless", "--convert-to", "pdf", docx_path])
    # Or use a PDF generation library (reportlab, weasyprint) for more control

    return {
        "file_path": f"deliverables/{session_id}/resume-optimized.pdf",
        "format": "pdf",
        "size_bytes": 0,
        "status": "ready",
        "source_docx": docx_content.get("file_path", ""),
    }