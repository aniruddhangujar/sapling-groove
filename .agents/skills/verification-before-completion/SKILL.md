---
name: verification-before-completion
description: >-
  Use this skill as a final checklist before concluding any task, writing a walkthrough, or marking a feature as complete.
---

# Verification Before Completion

Before completing any task, you must explicitly perform these checks:

1. **Requirement Check**: Re-read the original user request. Did you address all parts of the prompt?
2. **Syntax and Compilation**: Did you verify that the code compiles or parses without syntax errors? Run linters or type checkers if available.
3. **Execution**: If feasible, did you run the application or tests to confirm the changes actually work as intended?
4. **No Regressions**: Did your changes accidentally break existing functionality? Ensure imports, variable scopes, and dependencies are still intact.
5. **Clean Code**: Did you remove any console.logs, debugging code, or temporary scratch files used during development?
6. **Walkthrough Accuracy**: Ensure the walkthrough artifact accurately reflects what was actually implemented, tested, and verified.
