# SetMyCareer Voice Agent

This folder is the Claude-ready knowledge and behaviour package for the SetMyCareer AI career counsellor.

It is intentionally separate from the counsellor console and client app:

- `training-data/` contains ingestible JSONL records for Claude Project knowledge, RAG, evals, and future fine-tuning decisions.
- `prompts/` contains the system prompt and Claude Project instructions.
- `tools/` defines the API/tool contracts the voice or chat agent should call.
- `livekit/` documents how to wrap the same agent behaviour in a LiveKit voice worker.
- `evals/` contains scenario checks for safety, booking, and career-guidance quality.

## Agent Role

The agent is a career counselling assistant for SetMyCareer. It helps students, parents, graduates, working professionals, senior professionals, and career-break clients:

- clarify their question or career confusion;
- understand assessment and report results in plain language;
- prepare for a human counsellor session;
- book or request a counsellor appointment;
- ask career-path, stream-selection, transition, interview, CV, and mentoring questions.

The agent must not present itself as a licensed therapist, diagnose psychological conditions, guarantee careers/admissions/jobs, or replace qualified SetMyCareer counsellors.

## Claude Migration

For a Claude Project, upload or reference these files first:

1. `prompts/claude-project-instructions.md`
2. `prompts/system.md`
3. `training-data/setmycareer_service_facts.jsonl`
4. `training-data/dialogue_exemplars.jsonl`
5. `training-data/safety_boundaries.jsonl`
6. `tools/tool-contracts.json`

Use `training-data/manifest.json` as the source map.

## Runtime Flow

1. Detect profile segment: student, parent, graduate, professional, senior professional, career break, educator, or other.
2. Clarify the goal and urgency.
3. Answer from SetMyCareer knowledge plus user-provided context.
4. If the question needs personalized interpretation, push toward psychometric assessment or a counsellor booking.
5. If the user is ready to book, collect name, phone/WhatsApp, profile segment, preferred time, service need, and consent to be contacted.
6. Call the booking tool or hand off to the client-side booking form.

## Existing Backend Touchpoints

Current `SMC Claude` API endpoints that are relevant:

- `POST /api/chat` for grounded AI replies.
- `GET /api/inventories` and `POST /api/inventories/score` for public-domain inventories.
- `POST /api/career/analyze` and `POST /api/career/analyze/stream` for career Blueprint generation.
- `POST /api/career/report` for report rendering.
- `POST /api/counselor/sessions` and related counselor session routes.
- `POST /api/meetings/bot` for meeting recording/notetaker dispatch.

Booking persistence still needs a final CRM/calendar table or API.
