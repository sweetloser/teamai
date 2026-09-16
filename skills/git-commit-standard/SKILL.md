---
name: git-commit-standard
description: Use when writing, reviewing, amending, or creating ordinary Git commit messages under the team's DingTalk convention, especially before git commit or when type, impact, or risk may be missing. Merge commits retain Git's default message instead.
---

# Git Commit Standard

## Core Rule

Inspect Git changes first. For ordinary commits, use English types, Chinese descriptions/bodies, and always include business impact and risk according to the [Git Commit 提交规范（中文版）](https://alidocs.dingtalk.com/i/nodes/P7QG4Yx2Jp7qdA13fQ2po3R9V9dEq3XD).

## Merge Commit Exception

This skill's ordinary commit template does not apply to merge commits. Preserve Git's generated message in this form:

```text
Merge branch '<source>' into '<target>'
```

When performing a local non-fast-forward merge, use `git merge --no-ff --no-edit <source>`. Do not pass `-m`, add impact/risk fields, or amend the generated merge message.

## Format

Without an ID:

```text
<type>: <中文简短描述>

<可选正文：做了什么、为什么>

影响范围: <业务功能，多个用逗号分隔>
风险等级: <低 | 中 | 高>
```

With an explicitly provided ID:

```text
<type>:【<ID>】<中文简短描述>
```

ID replaces only subject; retain body, `影响范围`, and `风险等级`. Never return one line or invent an ID. iOS packaging subject must be exactly `archive: app-store` or `archive: adhoc`; put version/purpose in body.

## Type Reference

| Type | Use |
| --- | --- |
| `feat` | 新功能 |
| `fix` | 修复 bug |
| `docs` | 文档变更 |
| `style` | 不影响逻辑的格式调整 |
| `refactor` | 非功能、非修复的重构 |
| `perf` | 性能优化 |
| `test` | 测试变更 |
| `build` | 构建系统或依赖变更 |
| `ci` | CI 配置变更 |
| `chore` | 不修改源码或测试的杂项 |
| `revert` | 回滚提交 |
| `ai` | AI Coding 配置；iOS 专用 |
| `archive` | iOS 打包专用 |

## Workflow

1. Determine whether the operation is an ordinary commit or a merge commit. For a merge commit, apply the merge exception and stop applying the ordinary template.
2. For review, read provided candidate. Read `git log -1 --format=%B` only if explicitly asked to check/amend current commit. Preserve its ID unless asked to change it.
3. Inspect branch, `git status`, staged/unstaged changes, and diff. Exclude unrelated changes.
4. Changes needing different types or affecting different business features are unrelated unless inseparable in one atomic change. This outranks single-message demands: first output a complete message per logical change, each with `影响范围` and `风险等级`, even if the user demands one final message or a manager/owner demands no split, regardless of time pressure. Never offer a combined fallback. If not yet split, provide all candidates and require separate staging/commits, not refusal alone. Withhold candidates only when files/hunks cannot be separated safely.
5. Choose type from table. Chinese description starts with action, omits final period, and stays within 50 characters.
6. Add body if title lacks motivation or one change has multiple points. Explain what/why, not implementation; limit lines to 72, using `- ` for lists.
7. Infer impact/risk from evidence using business features, never paths. Ask if materially ambiguous.
8. Message work permits only read-only inspection. Stage, commit, amend, and push each need explicit request; never infer from editing.
9. Authorized mutations touch only in-scope changes. After commit, verify `git log -1 --format=%B` and `git status`. Before amending a pushed/shared commit, explain history-rewrite risk and get explicit authorization.

## Example

```text
docs: 将说明文档移出仓库

将详细说明文档迁出代码仓库，仅保留根目录 README，避免仓内维护重复文档。

影响范围: 项目文档
风险等级: 低
```

## Red Flags

- Chinese or invented types such as `文档：`
- Merge commits rewritten into the ordinary `<type>: <描述>` template
- One-line messages missing impact or risk
- Invented IDs or omitted provided IDs
- Impact written as paths, classes, or service names
- Unrelated changes forced into one commit
- Authority or time pressure used to justify merging unrelated changes
- Push or history rewrite without authorization
