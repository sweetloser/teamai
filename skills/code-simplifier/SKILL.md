---
name: code-simplifier
description: Simplify and refine code for clarity, consistency, and maintainability while preserving observable behavior. Use when the user asks to simplify, clean up, refactor for readability, reduce nesting or duplication, remove unnecessary abstractions, or polish recently changed code without changing functionality. Focus on user-specified or recently modified files; do not use for feature work, behavioral changes, or broad rewrites unless explicitly requested.
---

# Code Simplifier

Improve code structure without changing what the program does. Prefer readable, explicit code over fewer lines or clever compression.

## Determine Scope

Use the narrowest applicable scope in this order:

1. Files, symbols, or changes explicitly named by the user.
2. Uncommitted changes visible in `git diff` and `git diff --cached`.
3. Code modified during the current task.

Do not simplify unrelated pre-existing code. Preserve user changes in a dirty worktree.

If the user asks only for review, diagnosis, or suggestions, report opportunities without editing files.

## Read Project Rules

Before editing:

- Read applicable `AGENTS.md` files and repository documentation.
- Inspect nearby code to learn naming, error handling, type, module, and testing conventions.
- Identify the relevant verification commands from project configuration or instructions.

Project rules override generic preferences in this skill.

## Preserve Behavior

Keep all observable behavior intact, including:

- public APIs, signatures, types, serialization, and output formats
- side effects and their ordering
- error types, messages, and failure timing when callers may rely on them
- async, concurrency, cancellation, retry, and resource-lifetime semantics
- null, empty, boundary, and platform-specific behavior
- performance characteristics when the code is performance-sensitive

Do not introduce or update dependencies, change configuration, redesign architecture, or repair unrelated bugs unless the user explicitly expands the scope.

## Simplify for Clarity

Look for focused improvements such as:

- reducing unnecessary nesting with clear guard clauses
- removing redundant branches, temporary values, wrappers, or indirection
- consolidating genuinely duplicated logic
- choosing precise internal names
- grouping closely related logic while keeping concerns separated
- replacing nested ternaries and dense expressions with readable control flow
- removing comments that merely restate the code
- retaining comments that explain intent, constraints, compatibility, or non-obvious tradeoffs

Prefer explicit code when a shorter form would be harder to read, debug, extend, or review.

## Avoid Over-Simplification

Do not:

- optimize for line count
- create dense one-liners or clever abstractions
- combine unrelated responsibilities
- remove useful boundaries or domain concepts
- rename externally visible or reflection-sensitive identifiers without proof it is safe
- apply repository-wide formatting to a small change
- rewrite tests to conceal a behavior change

When a proposed simplification has uncertain semantic impact, leave it unchanged and explain the uncertainty.

## Workflow

1. Inspect the target code and relevant diff.
2. Establish the behavior and invariants that must remain unchanged.
3. Select a small set of high-confidence simplifications.
4. Apply focused edits consistent with local conventions.
5. Review the resulting diff for scope creep and accidental behavior changes.
6. Run proportionate targeted tests, type checks, linting, or builds.
7. Report the meaningful simplifications and verification performed.

If verification cannot run, state exactly what was not verified and why.

## Upstream

Adapted for Codex from Anthropic's official `code-simplifier` Claude Code plugin, licensed under Apache License 2.0:
https://github.com/anthropics/claude-plugins-official/tree/main/plugins/code-simplifier
