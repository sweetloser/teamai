---
name: grill-me
description: Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when the user wants to stress-test a plan, get grilled on a design, or says "grill me", "拷问我的方案", "挑战这个设计", or "持续追问我".
---

Interview the user relentlessly about every aspect of their plan until you reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one.

## How to ask questions

Use `request_user_input` when that tool is available. It provides a multiple-choice popup while still allowing the user to type a custom answer. Never call or refer to Claude's `AskUserQuestion` tool.

When `request_user_input` is unavailable, ask exactly one concise question in the final response and wait for the user's reply. Do not place a blocking question in commentary.

Ask **one question at a time**. Wait for the user's answer before moving to the next question. This keeps the conversation focused and prevents overwhelm.

For each popup question, provide 2–3 mutually exclusive, concrete options representing the most likely answers or directions. Put the recommended option first and label it `(Recommended)`. Think about what the user would realistically choose — generic options like "Yes" / "No" aren't helpful unless the question is genuinely binary. The user can use the free-form option for a custom answer.

## Flow

1. After receiving an answer, briefly acknowledge the decision (1–2 sentences max), then immediately ask the next question using the available interaction method above.
2. If a question can be answered by exploring the codebase or files, explore them yourself instead of asking the user.
3. Continue until all branches of the design tree are resolved.
4. When finished, provide a concise summary of all decisions made.
