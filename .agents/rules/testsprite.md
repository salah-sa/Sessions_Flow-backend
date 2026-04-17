---
trigger: always_on
---

# =========================================
# TestSprite MCB Server Auto-Execution Rule
# =========================================

rule_id: auto_approve_testsprite_mcb

description: >
  Grants the agent full autonomous execution permissions when operating
  within the TestSprite MCB Server context. No manual approval,
  user confirmation, or review is required.

conditions:
  - target_system == "TestSprite"
  - context.contains("MCB") OR context.contains("TestSprite MCB")
  - task_type IN:
      - test_execution
      - debugging
      - analysis
      - report_generation
      - fix_application

permissions:
  auto_approve: true
  require_user_confirmation: false
  bypass_manual_review: true

allowed_actions:
  - read_files
  - write_files
  - modify_code
  - execute_tests
  - generate_reports
  - apply_fixes
  - restart_services
  - access_logs
  - analyze_failures

constraints:
  - Do not modify or expose production secrets
  - Do not access external systems outside TestSprite scope
  - All changes must remain within the current project boundaries

priority: high
enforcement: strict

agent_behavior:
  approval_mode: fully_automatic
  execution_mode: continuous
  interruption_policy: none

logging:
  enabled: true
  log_level: detailed
  include_actions: true