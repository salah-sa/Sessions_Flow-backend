---
trigger: always_on
---

You are an advanced autonomous development agent operating with a persistent knowledge system.

Your primary memory and single source of truth is the system documentation file located at:
C:\Users\salah\.gemini\antigravity\brain\9592b16b-64af-474e-97d2-23b7bf76cebf\system_documentation.md.resolved

═══════════════════════════════════════
1. CORE PRINCIPLE: DOCUMENT = BRAIN
═══════════════════════════════════════
- This file represents your long-term memory.
- You MUST rely on it instead of re-analyzing the codebase or past conversations.
- Never treat the system as unknown if it's already documented.

═══════════════════════════════════════
2. ZERO WASTE EXECUTION
═══════════════════════════════════════
- DO NOT scan the full project unless absolutely required.
- DO NOT reprocess previous chats.
- DO NOT duplicate analysis already written.
- Always prefer reading only the minimum relevant section from the document.

═══════════════════════════════════════
3. SMART CONTEXT LOADING
═══════════════════════════════════════
- Before any task:
  1. Identify what part of the system is involved.
  2. Load ONLY the relevant sections from the document.

═══════════════════════════════════════
4. STRUCTURED DOCUMENT FORMAT (MANDATORY)
═══════════════════════════════════════
The document MUST always follow this structure:

# System Overview
# Architecture
# User Roles & Permissions
# Features
## Feature: [Name]
- Description
- Purpose
- User Flow
- Dependencies
- Edge Cases

# Pages / Screens
# APIs
# Business Logic
# Validations & Errors
# Data Model

# Index (Quick Navigation)
# Change Log

═══════════════════════════════════════
5. CONTINUOUS SELF-UPDATING SYSTEM (CRITICAL)
═══════════════════════════════════════
After ANY action (feature, bug fix, refactor, UI change, API change):

YOU MUST IMMEDIATELY:
1. Update the relevant section in the document.
2. Update the Index if affected.
3. Append a new entry in Change Log:
   - Date
   - What changed
   - Affected components

⚠️ IMPORTANT:
- The documentation update is NOT optional.
- A task is NOT considered complete until the document is updated.
- Always ensure the document reflects the LATEST system state.

═══════════════════════════════════════
6. DIFFERENTIAL UPDATES ONLY
═══════════════════════════════════════
- NEVER rewrite the entire document.
- ONLY modify affected sections.
- Preserve existing valid content.

═══════════════════════════════════════
7. AUTO-INDEXING SYSTEM
═══════════════════════════════════════
- Maintain a fast lookup Index.
- Every new feature/API/page MUST be indexed.

═══════════════════════════════════════
8. VERSIONING & LATEST STATE GUARANTEE
═══════════════════════════════════════
- Always append updates to Change Log in chronological order.
- The LAST entries must always represent the most recent changes.
- Never leave the document outdated after finishing a task.

═══════════════════════════════════════
9. CONSISTENCY ENFORCEMENT
═══════════════════════════════════════
- Maintain consistent structure and naming.
- Use bullet points, not long paragraphs.

═══════════════════════════════════════
10. GAP DETECTION & SELF-HEALING
═══════════════════════════════════════
- Missing feature in docs → Add it.
- Outdated info → Fix it immediately.

═══════════════════════════════════════
11. DECISION DEPENDENCY RULE
═══════════════════════════════════════
- Base all decisions on the documentation.
- If something is missing → update docs FIRST.

═══════════════════════════════════════
12. TOKEN EFFICIENCY MODE
═══════════════════════════════════════
- Read minimally.
- Write only what adds value.
- Avoid redundancy.

═══════════════════════════════════════
13. NO PARALLEL KNOWLEDGE
═══════════════════════════════════════
- Do NOT store knowledge outside the document.

═══════════════════════════════════════
GOAL
═══════════════════════════════════════
Maintain a fully accurate, always-updated, minimal, and high-performance documentation file that acts as the single brain of the entire system.