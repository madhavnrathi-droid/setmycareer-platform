# LiveKit Voice Agent Blueprint

The screenshot workflow points to LiveKit Cloud deployment. Keep the LiveKit worker thin: voice transport, turn-taking, and tool calls. The counselling intelligence should come from this folder's prompts, JSONL knowledge, and backend tools.

## Runtime Responsibilities

The LiveKit worker should:

1. Join the room.
2. Greet the user as the SetMyCareer AI career counsellor.
3. Detect if the user wants chat guidance, report explanation, booking, or human handoff.
4. Use speech-to-text and text-to-speech models appropriate for the deployment.
5. Call `POST /api/chat` for reasoning, with the `prompts/system.md` policy included in context.
6. Call booking/report/career-analysis tools only when required.
7. End with a concise summary and next step.

## Suggested Environment

```bash
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
SMC_API_BASE=
```

## Voice-Specific Rules

- Ask one question at a time.
- Keep responses under 20 seconds unless the user asks for detail.
- Repeat phone numbers and booking slots for confirmation.
- Never say a counsellor is booked unless the booking tool confirms it.
- For crisis or severe distress, stop career guidance and move to safety support.

## Deployment Notes

Use the official LiveKit starter template for the final worker code, then load:

- `../prompts/system.md` as the agent system instruction;
- `../training-data/*.jsonl` into Claude Project knowledge or a RAG index;
- `../tools/tool-contracts.json` as callable backend contracts.

The current backend already provides chat, career analysis, inventories, reports, and meeting tools. A dedicated booking endpoint is still the missing production integration.
