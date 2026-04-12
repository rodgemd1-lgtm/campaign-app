# Windmill Workflows for ResumeAI QRSQPI Pipeline

This directory contains Windmill workflow definitions for automated deliverable generation.

## Structure

```
windmill/
├── flows/
│   └── qrsqpi_generate_deliverables.yaml   # Main 8-step flow definition
├── scripts/
│   ├── qrsqpi_fetch_session.py              # Step 1: Fetch session data
│   ├── qrsqpi_generate_resume_docx.py       # Step 2: Generate DOCX resume
│   ├── qrsqpi_generate_resume_pdf.py         # Step 3: Generate PDF resume
│   ├── qrsqpi_generate_cover_letters.py       # Step 4: Generate cover letters
│   ├── qrsqpi_generate_job_matches.py         # Step 5: Generate job matches XLSX
│   ├── qrsqpi_generate_linkedin_profile.py    # Step 6: Generate LinkedIn text
│   ├── qrsqpi_generate_monte_carlo_pdf.py     # Step 7: Generate MC report PDF
│   └── qrsqpi_finalize_deliverables.py        # Step 8: Package & finalize
└── schedules/
    └── qrsqpi_auto_deliverables.yaml           # Auto-trigger schedule
```

## Setup

1. Start Windmill: `docker compose up -d` (runs on port 8000)
2. Login: admin@windmill.dev / changeme
3. Upload each script via the Windmill UI or API
4. Create the flow from `flows/qrsqpi_generate_deliverables.yaml`
5. Enable the schedule from `schedules/qrsqpi_auto_deliverables.yaml`

## API Deployment

Use the Windmill API to deploy scripts and flows:

```bash
# Deploy a script
curl -X POST http://localhost:8000/api/w/default/scripts/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d @scripts/qrsqpi_fetch_session.json

# Deploy the flow
curl -X POST http://localhost:8000/api/w/default/flows/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d @flows/qrsqpi_generate_deliverables.json
```

## Key Format Rules for Windmill

1. **6-field cron** (seconds first): `0 */5 * * * *` = every 5 minutes
2. **modules must be ARRAY** not object/map in flow YAML
3. **input_transforms**: use `"javascript"` type for dynamic expressions (NOT `"frontend"`)
4. **timezone is REQUIRED** on schedules
5. Empty POST response = success

## Flow Steps

| Step | Script | Output |
|------|--------|--------|
| 1 | fetch_session | Session data with scores, rewrites, MC data |
| 2 | generate_resume_docx | Optimized resume in Word format |
| 3 | generate_resume_pdf | Resume as print-ready PDF |
| 4 | generate_cover_letters | N cover letters (one per target role) |
| 5 | generate_job_matches | Excel with 30 ranked job matches |
| 6 | generate_linkedin_profile | Copyable LinkedIn profile text |
| 7 | generate_monte_carlo_pdf | Probability report PDF |
| 8 | finalize_deliverables | Package + ZIP + update session status |