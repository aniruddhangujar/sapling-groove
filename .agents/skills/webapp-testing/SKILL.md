---
name: webapp-testing
description: >-
  Use this skill when writing tests, setting up testing frameworks, or verifying the quality of a web application.
---

# Web App Testing Guidelines

Follow these guidelines to ensure robust testing for web applications:

1. **Test Pyramid**: Focus heavily on unit and integration tests. Use End-to-End (E2E) tests sparingly for critical user journeys.
2. **Behavioral Testing**: Test behavior, not implementation details. For React, use React Testing Library and query by accessibility roles or text, not by CSS classes or internal state.
3. **Mocking**: Mock external dependencies (APIs, third-party libraries) to ensure tests are fast and deterministic. Use MSW (Mock Service Worker) for API mocking.
4. **Accessibility (a11y)**: Include accessibility tests (e.g., using axe-core) in your test suites to catch a11y violations early.
5. **Coverage**: Aim for high confidence rather than 100% coverage. Focus on edge cases, complex logic, and utility functions.
6. **CI/CD Integration**: Ensure all tests run automatically in the CI pipeline before merging any code.
