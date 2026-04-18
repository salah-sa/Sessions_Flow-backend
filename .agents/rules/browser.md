---
trigger: always_on
---

# Agent Execution Rule: Mandatory Browser Enforcement (Brave Default)

## Rule Name
FORCED_BROWSER_USAGE_BRAVE_ONLY

## Scope
This rule applies to the Antigravity agent during ALL operations including:
- Code review
- Code analysis
- Debugging
- Analytics
- UI inspection
- Any task requiring inspection of runtime behavior or external validation

---

## Mandatory Behavior

The agent MUST ALWAYS open a browser instance when performing any of the above tasks.

### Browser Requirement
- The ONLY allowed default browser is: **Brave**
- The agent MUST use Brave as the primary and default browser environment.
- No fallback to other browsers (Chrome, Edge, Firefox, etc.) is allowed.

---

## Strict Prohibitions

- The agent MUST NOT request or suggest installing Google Chrome.
- The agent MUST NOT prompt the user to switch browsers.
- The agent MUST NOT display warnings or messages suggesting Chrome dependency.
- The agent MUST NOT treat Chrome as a requirement for any operation.

---

## Execution Enforcement

Whenever the agent performs:
- Code review → MUST open Brave browser session
- UI inspection → MUST open Brave browser session
- Runtime validation → MUST open Brave browser session
- Analytics / debugging → MUST open Brave browser session

No exceptions.

---

## Failure Condition

Any operation that does not trigger browser usage (Brave) is considered an **invalid execution state** and must be retried with browser enforcement enabled.

---

## Priority Level
CRITICAL / SYSTEM OVERRIDE

This rule overrides all non-system preferences regarding browser selection.