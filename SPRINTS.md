# DocuMate - Sprint Outcomes

This retrospective summarizes the delivered work visible in the project history and current application. Confirm sprint dates, team assignments, and planned-versus-completed status against the team's actual records before submitting this as formal assessment evidence.

## Sprint 1 — Project foundation

**Objective:** Establish the application structure and prove the initial user experience.

**Outcomes**
- Bootstrapped the React web application and dependencies.
- Created the initial portal layout and document-management UI skeleton.
- Added initial Firebase sign-in scaffolding.
- Prototyped image preprocessing and Gemini-based document text extraction.

**SDLC evidence:** Initial project setup, architecture groundwork, early UI prototype, and proof-of-concept AI integration.

## Sprint 2 — OCR and AI document analysis

**Objective:** Process uploaded documents and return useful, language-aware results.

**Outcomes**
- Added a FastAPI AI service and Gemini Vision OCR for Sinhala and English.
- Added PDF page rendering, document summaries, tags, and categories.
- Added batch processing and combined summaries.
- Added text-to-speech audio for summaries, including Sinhala.

**SDLC evidence:** Implemented and integrated AI service endpoints; validated upload and analysis flows using sample image/PDF and batch scenarios.

## Sprint 3 — Backend, persistence, and search

**Objective:** Connect the portal and AI workflows to persistent document storage and backend services.

**Outcomes**
- Added the Express API and PostgreSQL-backed document records.
- Integrated Firebase authentication and group-based permissions.
- Added Elasticsearch indexing and document search, including fuzzy search.
- Added PDF-to-Word conversion and backend support for saved OCR/summary data.

**SDLC evidence:** Implemented service integration and persistent data workflows; exercised API, storage, permissions, and search behavior.

## Sprint 4 — Document workflows and usability

**Objective:** Complete core document organization and improve day-to-day portal use.

**Outcomes**
- Added document search/filter interactions and batch result presentation.
- Added trash and restore behavior, document metadata, and access-control improvements.
- Polished the portal and document views for responsive use.
- Improved Sinhala OCR and speech handling based on observed document results.

**SDLC evidence:** Iterative UI refinement, end-to-end workflow checks, and fixes driven by OCR and document-management feedback.

## Sprint 5 — Integration, reliability, and final UI polish

**Objective:** Stabilize the integrated web, API, and AI services and finish the principal user workflows.

**Outcomes**
- Completed integrated document upload, processing, persistence, search, and management flows.
- Added recent activity, starred documents, dynamic counts, a search-results view, and trash controls.
- Added settings and account-facing UI improvements.
- Moved uploaded document/audio objects to Supabase Storage and added cleanup handling.
- Improved batch combined-summary behavior, Sinhala language handling, and Gemini overload/quota error reporting.
- Added batch-summary audio lifecycle cleanup and removed the unused home-page demo action.

**SDLC evidence:** Integration and regression checks across the three application services; targeted mock tests, Python syntax checks, and frontend production builds for implemented fixes.

## Overall SDLC summary

1. **Requirements and planning:** Define document capture, OCR, search, storage, access control, and user workflows.
2. **Design:** Separate the portal, backend API, AI processing service, database, and external cloud integrations.
3. **Implementation:** Deliver the capabilities incrementally across the five sprint themes above.
4. **Integration and testing:** Validate service endpoints, upload and management paths, language selection, database migrations, and production frontend builds.
5. **Review and improvement:** Use observed user flows and OCR/audio issues to refine extraction, summaries, speech, reliability, and UI behavior.
6. **Deployment readiness:** Document service startup, environment configuration, private credentials, and database migration expectations in the root README.
