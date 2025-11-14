# Contributing to qr-code-generator

Thanks for wanting to help! This document walks you through the ways you can contribute, how to set up your environment, and the standards the project follows.

## Ways to contribute

- **Report bugs** – File issues describing the environment, repro steps, and expected behavior.
- **Request features** – Open issues that clearly state the problem you want to solve. Include example payloads or mockups when possible.
- **Improve docs** – Fix typos, clarify workflows, or add usage examples.
- **Tackle issues** – Comment on an issue to claim it, discuss your approach, and submit a pull request.
- **Add tests** – Strengthen encoder, masking, renderer, or download coverage whenever you change behavior.

## Development setup

1. **Fork and clone** the repository.
2. **Install dependencies** (Node.js ≥ 22 is required):
    ```bash
    npm install
    ```
3. **Run the sample renderer** to produce `dev/test.svg`:
    ```bash
    npm run render:svg
    ```
4. **Run the test suite** (Vitest):
    ```bash
    npm run test
    ```

> The CI workflow (`.github/workflows/ci.yml`) reruns `npm install` and `npm run test` on every pull request to `main`, so ensure they pass locally before pushing.

## Coding standards

- The codebase is TypeScript-first; keep runtime type safety and strong typing in mind.
- Format changes with Prettier settings from `.prettierrc` (tabs, width 80, trailing commas). Use `npx prettier --write .` or your editor integration.
- Favor descriptive variable names and minimal but meaningful comments (especially when dealing with QR math, masking, or style resolution).
- Keep public API surfaces documented in `README.md` when you add or change exports.

## Git & pull requests

1. Create a feature branch off `main`.
2. Make focused commits; reference GitHub issues in commit messages when applicable.
3. Ensure `npm run test` passes and that you’ve updated docs/tests as needed.
4. Open a pull request with:
    - A summary of what changed and why.
    - Testing evidence (commands run, screenshots for visual changes, etc.).
    - Notes on breaking changes or migration steps, if any.
5. Be responsive to review feedback; push follow-up commits instead of force-pushing unless requested.

## Issue triage & communication

- Use GitHub issues for bugs, features, or questions. Tag them appropriately (`bug`, `enhancement`, `help wanted`, etc.) if you have permission.
- Discuss architectural or API-level changes via issues before coding to avoid rework.
- When reviewing others’ PRs, focus on correctness, readability, performance, and consistency with the project goals.

## Releasing & publishing

The package is published from the `dist` directory (see `package.json`). If you’re proposing build/publish changes, coordinate with the maintainers; contributors normally won’t publish releases directly.

## License

By contributing, you agree that your work will be licensed under the MIT License included in this repository.

All contributions are at your own free will, without expectation for compensation for any work performed.

All contributions are subject to approval under the discretion of the project owners without any guarantee that contributing work will be merged into the main branch.
