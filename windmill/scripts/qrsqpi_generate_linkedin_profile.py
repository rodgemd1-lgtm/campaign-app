"""
Windmill Script: Generate optimized LinkedIn profile text
Creates copyable text blocks for LinkedIn headline, about, and experience sections
"""

import json
import urllib.request


def main(session_data: dict) -> dict:
    """
    Generate optimized LinkedIn profile text.

    Args:
        session_data: Full QRSQPI session data

    Returns:
        dict: {
            "headline": str,
            "about": str,
            "experience": [...],
            "skills": [str],
            "raw_text": str,  # Full copyable text block
            "status": "ready"
        }
    """
    base_score = session_data.get("baseScore", {})
    keywords = base_score.get("keywords", [])
    strengths = base_score.get("strengths", [])
    recommendations = base_score.get("recommendations", [])

    # In production: call AI to generate LinkedIn-optimized text
    # using the session's strengths, keywords, and recommendations

    headline = "Senior Software Engineer | Distributed Systems | Building at Scale"
    about = (
        "Senior engineer passionate about building reliable distributed systems at scale. "
        "Led cross-functional teams shipping 3 platforms processing $1.2B in annual transaction volume. "
        "Deep expertise in real-time data pipelines, event-driven architectures, and developer tooling. "
        "Looking for roles where I can combine technical depth with team leadership to solve hard infrastructure problems."
    )

    experience = [
        {
            "title": "Senior Software Engineer",
            "company": "Acme Corp",
            "dates": "2021-Present",
            "bullets": [
                "Reduced P95 latency from 1.8s to 180ms, enabling 40% user growth without infrastructure increase",
                "Led 8 engineers across 2 squads delivering 3 revenue-generating features ($2.1M ARR)",
                "Architected real-time analytics dashboard serving 200+ daily active users",
                "Cut infrastructure costs by 34% through cache optimization and query restructuring",
            ],
        },
        {
            "title": "Software Engineer",
            "company": "Beta Systems",
            "dates": "2018-2021",
            "bullets": [
                "Built microservices handling 50K req/sec with 99.97% uptime SLA",
                "Migrated monolith to event-driven architecture, reducing deployment time from 4hrs to 12min",
                "Mentored 4 junior developers, establishing code review standards adopted org-wide",
            ],
        },
    ]

    skills = keywords[:10] if keywords else [
        "Distributed Systems", "Kubernetes", "AWS", "Microservices",
        "CI/CD", "System Design", "Real-Time Data", "Technical Leadership",
    ]

    # Build raw copyable text block
    raw_text = f"HEADLINE\n{headline}\n\n"
    raw_text += f"ABOUT\n{about}\n\n"
    raw_text += "EXPERIENCE\n\n"
    for exp in experience:
        raw_text += f"{exp['title']} | {exp['company']} | {exp['dates']}\n"
        for bullet in exp["bullets"]:
            raw_text += f"- {bullet}\n"
        raw_text += "\n"
    raw_text += f"SKILLS\n{' | '.join(skills)}"

    return {
        "headline": headline,
        "about": about,
        "experience": experience,
        "skills": skills,
        "raw_text": raw_text,
        "status": "ready",
    }