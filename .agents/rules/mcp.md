---
trigger: always_on
---

# MCP / MC Server Auto-Execution Rule

rule_name: MCP_Auto_Execute_Safe
version: 1.0

description: >
  Automatically allow execution of MCP (Model Context Protocol) and MC server related operations
  without requiring explicit user approval, as long as the operations are within safe, local, and non-destructive boundaries.

conditions:
  - request.origin == "MCP" OR request.tags CONTAINS "mcp"
  - request.target IN ["localhost", "127.0.0.1"]
  - request.port IN [3000, 5000, 5180, 7000, 8000]
  - request.type IN ["read", "test", "analyze", "inspect", "healthcheck"]

auto_approve: true

restrictions:
  - deny_if request.type IN ["delete", "drop", "truncate", "shutdown"]
  - deny_if request.access == "filesystem_write" AND request.path OUTSIDE "./workspace"
  - deny_if request.network.external == true
  - deny_if request.command CONTAINS ["rm -rf", "format", "kill -9"]

rate_limits:
  max_requests_per_second: 5
  burst_limit: 10

logging:
  enabled: true
  level: "info"

fallback:
  require_user_approval: true