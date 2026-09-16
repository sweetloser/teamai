---
name: swift-code-organizer
description: >-
  Organize and simplify Swift and SwiftUI code while preserving behavior, APIs, SwiftUI identity, runtime integration, serialization, ownership, and concurrency semantics. Use when asked to tidy, clean up, readability-refactor, reduce nesting or duplication, improve local names or declaration order, group members by responsibility with Simplified-Chinese comments and `// MARK: -` titles, place eligible `lazy` stored properties at the end of their class body, place non-primary top-level file types after the primary type and its extensions, use UGCommonKit's global `with` for eligible `lazy var` initializers when already importable, or safely group protocol implementations without functional changes. Do not govern feature work, bug fixes, architecture/performance rewrites, framework migrations, or dependency upgrades. For mixed requests, apply only to behavior-preserving cleanup.
---

# Swift Code Organizer

Make focused, reviewable improvements to Swift and SwiftUI code without changing what the program does. Prefer explicit, idiomatic code over fewer lines or clever compression.

## Set the Scope

Use the narrowest applicable scope:

1. Files, symbols, or changes named by the user.
2. Uncommitted Swift changes shown by `git diff` and `git diff --cached`.
3. Swift code modified during the current task.

Do not organize unrelated pre-existing code or run a repository-wide formatter for a local request. Preserve unrelated user changes in a dirty worktree.

If the user asks only for review, diagnosis, or suggestions, report opportunities without editing files.

## Learn the Project Before Editing

Before changing code:

- Read applicable `AGENTS.md` files and repository documentation.
- Identify whether the project uses Swift Package Manager, an Xcode project, or an Xcode workspace.
- Inspect `Package.swift`, Swift language mode, platform settings, conditional compilation, strict-concurrency/default-actor-isolation settings, and any Tuist or XcodeGen configuration relevant to the target.
- Inspect nearby code and call sites to learn naming, declaration order, error handling, dependency injection, state management, and testing conventions.
- Locate `.swift-format`, `.swiftformat`, `.swiftlint.yml`, Package plugins, build scripts, and CI commands. Distinguish Apple's `swift-format` from SwiftFormat and use the project's configured tool and version. Project rules take precedence over generic preferences.
- Identify generated code from tools such as SwiftGen, Sourcery, protobuf, OpenAPI generators, Core Data, or SwiftData. Edit its source schema or generator when authorized; do not tidy generated output by default.
- Inspect the relevant diff and tests, then state internally which behavior and interfaces must remain unchanged.

Do not introduce dependencies, update project settings, redesign architecture, or repair defects as part of this workflow. If the user also requests those changes, keep them conceptually and visibly separate from the behavior-preserving cleanup.

## Preserve Observable Behavior

Keep these stable unless explicitly authorized:

- public, open, package, internal, and `@testable` contracts; access levels; signatures; labels and defaults; generic constraints; overload resolution; protocol conformances; ABI-relevant attributes; and availability annotations
- return values, rendered UI, accessibility, serialization, errors, logging, analytics, notifications, side effects, and their ordering
- initialization and destruction order, ownership, `weak`/`unowned` semantics, closure captures, resource lifetime, and deallocation timing
- value versus reference semantics, `let`/`var`, `mutating`, `inout`, ownership modifiers, copy-on-write behavior, mutation boundaries, exclusivity scopes, and performance characteristics when performance-sensitive
- `async` ordering, actor isolation, `@MainActor`, `Sendable`, task priority, cancellation propagation, continuation behavior, and executor hops
- Objective-C/runtime integration such as `@objc`, `dynamic`, selectors, KVC/KVO, Interface Builder actions/outlets, Core Data names, reflection, and string-referenced symbols
- synthesized behavior and wire formats for `Codable`, `Equatable`, `Hashable`, `Identifiable`, `CaseIterable`, enum case order and raw values, coding keys, and persistence

Treat source-level tidiness as insufficient proof of semantic equivalence. If a change could alter these behaviors and cannot be proven safe, leave it unchanged and explain the risk.

### Declaration and Extension Safety

- Do not casually reorder stored properties. Order can affect initialization, observers, destruction, synthesis, and source compatibility.
- Preserve property-wrapper type, order, arguments, backing storage, and projected value; `self.value` and `self._value` are not interchangeable initialization paths.
- Moving an initializer between a primary type declaration and an extension can change synthesized memberwise or default initializers. Treat that as API work.
- Move a protocol conformance into an extension only when synthesis, access control, conditional constraints, witness selection, attached macros, and file boundaries remain valid. Compiler synthesis for conformances such as `Codable`, `Equatable`, and `Hashable` can depend on the conformance remaining in the type's source file.
- Remember that moving declarations across files changes the meaning and reach of `private` and `fileprivate`.
- Rename only internal symbols proven free of selector, reflection, serialization, storyboard, Objective-C, macro, generated-code, or string-based references.
- Preserve initializer kind and ordering, default-value evaluation time, property observers, lazy initialization, `defer` scope, and `super.init` boundaries.

## Protect SwiftUI Semantics

SwiftUI structure carries identity, lifetime, layout, and transaction semantics. Preserve:

- property-wrapper roles and ownership: `@State`, `@StateObject`, `@ObservedObject`, `@Binding`, `@Environment`, `@EnvironmentObject`, `@FocusState`, and Observation-based state
- view identity and storage lifetime, including conditional branches, `ForEach` identifiers, `.id`, navigation state, scene storage, and extracted subviews
- modifier order, because layout, gesture, animation, environment, accessibility, hit testing, and rendering modifiers are generally not commutative
- `.task` and `.task(id:)`, `onAppear`/`onDisappear`, change observation, cancellation, animation transactions, transitions, preferences, coordinate spaces, and matched geometry
- `ViewBuilder` control flow and concrete view types; do not introduce `AnyView` merely to make code look uniform

Extract a subview or helper only when state ownership, identity, environment propagation, bindings, and lifecycle remain equivalent. A shorter `body` is not worth a state reset or layout change.

## Make High-Confidence Improvements

Prefer small changes such as:

- replacing deep nesting with clear `guard` clauses when exit timing and side-effect order stay the same
- removing genuinely redundant branches, temporary values, wrappers, imports, and indirection
- consolidating duplicate logic when the duplicated paths have identical semantics and error behavior
- choosing precise names for internal, non-reflection-sensitive symbols
- grouping imports and non-stored declarations according to project convention; reorder stored properties only when semantic equivalence is proven
- moving eligible instance `lazy var` declarations into a final class-body section while preserving their relative order and attached metadata
- adding or normalizing Simplified-Chinese `// MARK:` groups without moving declarations solely to make the groups look tidy
- placing clearly subordinate top-level file types after the primary type and its extensions when the move passes the file-order safety checks
- placing protocol implementations in focused extensions when the extension safety checks pass
- decomposing long functions into cohesive helpers without changing captures, isolation, ownership, dispatch, or error boundaries
- simplifying optional handling and collection transformations only when evaluation count, laziness, ordering, and complexity remain suitable
- deleting comments that merely repeat code while retaining comments about intent, invariants, thread requirements, compatibility, and tradeoffs

Do not optimize for line count, create dense chains or one-liners, erase useful domain boundaries, add speculative abstractions, or normalize style beyond the requested scope.

## Write Human-Readable Comments in Simplified Chinese

Use Simplified Chinese for human-readable comments in Swift code organized by this skill. This is a default output requirement even when the user does not mention comment language.

- Write all newly added or rewritten explanatory comments and documentation-comment prose in Simplified Chinese. When an English human-readable comment remains inside the type or declaration being organized, translate its prose into Chinese while preserving its exact meaning, constraints, warnings, and intent.
- Keep code identifiers, API names, parameter names, generic types, Markdown/DocC syntax, symbol links, URLs, issue IDs, and code examples exact. Surround them with Chinese prose rather than translating or renaming them.
- Keep machine-readable comment tokens and payloads exact, including `// swift-tools-version:`, SwiftLint/SwiftFormat directives, Sourcery or code-generation annotations, source-map markers, and any comment consumed by a compiler, script, test, or external tool.
- Keep standard tags such as `TODO:`, `FIXME:`, `NOTE:`, and `MARK:` recognizable, but write their human-readable description in Chinese, for example `// TODO: 补充失败重试策略`.
- Do not translate license, copyright, generated-file, vendored-source, or legally prescribed headers. Do not edit comments outside the requested scope merely to make the repository linguistically uniform.
- Do not add redundant comments just to satisfy this rule. Delete comments that only restate the code; retain and translate comments that explain intent, invariants, ordering, compatibility, ownership, thread requirements, or non-obvious tradeoffs.
- Follow another language only when the user explicitly requests it or an exact project/external contract requires it. State that exception in the result when it affects touched comments.

## Organize Functional Sections with MARK

Organize methods and properties into cohesive sections based on what they do, and label each section with Swift's standard `// MARK: - 中文功能名称` form. Write MARK titles in Simplified Chinese. This is a default output requirement for code organization tasks even when the user does not explicitly ask for MARK comments or specify a language.

- Derive section names from the type's real responsibilities and the project's vocabulary. Prefer concise titles such as `状态`, `依赖`, `初始化`, `数据加载`, `校验`, `提交`, `导航`, `绑定`, `用户操作`, or `格式化` when those labels accurately describe the code. Do not emit English-only titles such as `State`, `Initialization`, or `Formatting`.
- Keep closely related properties and methods together. A section may contain both when they jointly implement one responsibility; do not force separate “Properties” and “Methods” sections when functional grouping is clearer.
- Use one concise MARK per meaningful group. Avoid a MARK for every declaration, empty sections, vague labels such as `辅助方法` when a more precise responsibility is known, and ornamental subdivision of very small types.
- Preserve a repository's required MARK punctuation and ordering convention, but write the title itself in Chinese. Otherwise use `// MARK: - 中文名称` and place public entry points and primary behavior before implementation details.
- Preserve exact protocol/type identifiers in conformance sections and add a Chinese description, for example `// MARK: - UITableViewDelegate 协议实现`. Do not translate or rename the actual identifier.
- Do not create a MARK-only diff. Combine MARK organization with the requested code cleanup, unless the user specifically asks only for sectioning.
- Translate English MARK titles inside the type being organized into Chinese as part of the focused edit. Do not scan or rewrite unrelated files solely to translate MARK titles.
- Reorder computed properties and methods only when their order has no semantic effect. Preserve stored-property, wrapper, static/global initialization, enum-case, Objective-C/runtime, macro, and lifecycle-sensitive order unless equivalence is proven.
- As a deliberate exception to responsibility-based grouping, collect eligible instance `lazy var` declarations in the class body's final `// MARK: - 懒加载属性` section according to the rule below.
- When declarations cannot be safely moved, keep their original order and place MARK boundaries around the existing safe groups. Never weaken access control, split files, or change initialization merely to make sections visually perfect.

## Place Lazy Stored Properties at the End of the Class

Collect eligible instance `lazy var` declarations in the final declaration section of their owning `class`. Place `// MARK: - 懒加载属性` immediately before the group, keep the group inside the original class body, and leave no methods, nested types, or other declarations after it before the class's closing brace. Apply this as a default organization requirement even when functional grouping would otherwise place a lazy property beside the methods that use it.

- Preserve the lazy properties' original relative order. Move each declaration together with its documentation comments, attributes, availability annotations, and machine-consumed directives.
- Do not move a lazy property into an extension or another type. Do not apply this class-specific rule to a `struct`, `actor`, enum, protocol, global declaration, or local declaration.
- Do not move declarations across `#if`/`#elseif`/`#else` branches, macro or generated-code boundaries, `#sourceLocation`, machine-consumed region markers, or other conditional scopes. Keep an unsafe declaration in place instead of forcing a visually complete group.
- Treat source order as behavior when it can affect destruction order, reflection, serialization, ABI, attached macros, generated interfaces, runtime lookup, ownership, or external tooling. Move a lazy property only when those effects are absent or semantic equivalence is proven; otherwise preserve its position and report the exception.
- This placement rule takes precedence over the general preference to group properties with their functional responsibility, but never over behavior, API, ownership, runtime, or conditional-compilation safety.

## Place Non-Primary File Types at the End

Keep the file's primary type and its extensions first. Move other top-level nominal types that exist only to support that primary type to the end of the file. Apply this as a default organization requirement even when the user does not explicitly request type ordering.

Identify the primary type in this order:

1. Use the type explicitly named by the user as the file's target.
2. Otherwise use the top-level type whose name matches the filename stem, such as `ProfileView` in `ProfileView.swift`.
3. For files named like `ProfileView+Binding.swift`, treat `ProfileView` and its extensions as primary even when the base declaration is in another file.
4. Otherwise prefer the file's `@main` type or the single clearly dominant externally visible type.
5. If multiple peer types are equally primary or no primary type can be identified confidently, preserve their order and report the ambiguity instead of guessing.

Order the type regions of an eligible file as follows:

1. Required file header and imports.
2. A pre-tail region containing the primary type declaration and its extensions, including safe protocol-conformance sections.
3. A Chinese `// MARK: - 辅助类型` section followed by non-primary top-level helper types and their related extensions at the literal file tail.

- Treat top-level `class`, `struct`, `enum`, `actor`, and `protocol` declarations as file types. Do not move unrelated global variables, free functions, operators, precedence groups, imports, or type aliases under this rule. Preserve their relative order and placement in the pre-tail region unless another explicit, safe organization rule applies; only require that no such declaration remains after the helper-type tail begins.
- Move each helper declaration together with its directly attached documentation comments, attributes, availability annotations, and related extensions when extension safety is proven. Preserve the relative order of helper types unless a dependency or project convention requires otherwise.
- Keep auxiliary protocol conformances in the same source file when compiler synthesis, access control, or witness selection depends on it. At the file tail, place an auxiliary type's safe extensions after that type rather than separating them from its implementation.
- Never lift a nested type out of its enclosing type or function. Nested types are not file-level helper types; moving them changes qualification, access, generic context, and runtime names.
- Do not move a declaration across `#if`/`#elseif`/`#else` branches, `#sourceLocation`, generated-code boundaries, macro expansion boundaries, or machine-consumed region markers. Move an entire balanced region only when its conditions and meaning remain identical.
- Do not apply this reorder to script-style files or `main.swift` files containing top-level executable statements. Preserve declaration order when macros, reflection, generated interfaces/docs, source-order snapshots, or external tooling make order observable.
- A non-primary public or package type is not automatically a helper. Move it only when the file has one unambiguous primary type and the type is clearly subordinate; otherwise treat the types as peers and retain their order.
- Keep primary-type extensions before the helper-type tail unless an extension cannot be moved safely. When safety prevents the ideal order, preserve behavior and explain the exception rather than forcing the layout.

## Use UGCommonKit `with` for Configured Lazy Properties

For a `lazy` stored property whose initializer only creates one value, configures it in sequence, and returns that same value, use UGCommonKit's value-returning global `with(_:_:)` helper:

```swift
private lazy var tableView: UITableView = with(UITableView()) {
    $0.delegate = self
    $0.dataSource = self
}
```

Apply this as a default organization requirement when UGCommonKit is already importable by the target without changing a dependency manifest and the semantic eligibility checks below pass.

After converting an eligible initializer, keep or move that property into the owning class's final `// MARK: - 懒加载属性` section according to the class-ordering rule above.

- Use the global `with(Value()) { ... }` function, not an instance method such as `.with` and not the mutating `with(&value)` overload.
- Preserve `lazy`, access control, attributes, the explicit declared type, construction expression, configuration order, side effects, explicit `self` references, nested closure capture lists, and the first-access initialization and lifetime semantics. Never turn the property into a non-lazy stored property merely to simplify it.
- If the target already depends on UGCommonKit but `with` is not in scope, add `import UGCommonKit` in repository-consistent import order. If UGCommonKit is re-exported and the project intentionally relies on that export, follow the local convention.
- Do not add UGCommonKit to `Package.swift`, an Xcode target, or another dependency manifest as part of behavior-preserving organization. When the target has no UGCommonKit dependency, retain the existing initializer and report that this rule could not be applied without a dependency change.
- Do not create an empty `with` closure for a direct initializer that has no configuration. Keep `private lazy var service = Service()` in that simpler form.
- Convert only `Copyable` values. The helper's by-value generic cannot accept a `~Copyable` value; leave such an initializer unchanged.
- Treat newly constructed class instances as the normal eligible case. For value types, convert only when copying and mutation cannot expose copy-on-write, uniqueness, aliasing, resource ownership, or destruction differences.
- The helper takes its first argument by value and then assigns it to a local `var`. Do not convert configuration that observes identity, retain or weak lifetime, `isKnownUniquelyReferenced`, copy-on-write uniqueness, temporary alias counts, or other ownership-sensitive behavior.
- Do not convert an immediately-invoked outer initializer closure that has a capture list such as `{ [dependency = makeDependency()] in ... }()`: the original capture expressions run before construction inside the body, whereas `with(Value()) { ... }` constructs the value before evaluating the trailing closure's captures. Convert only when the ordering and lifetime difference is explicitly proven irrelevant.
- A nested escaping closure may preserve captures such as `[weak self]` when it does not capture the configured local value. If it captures the local value returned by the initializer, leave the initializer unchanged; an escaping closure cannot capture `with`'s `inout` parameter, and snapshot workarounds can change semantics.
- Leave the initializer unchanged when it contains multiple return paths, throwing or error-normalization behavior, optional or failure fallback, cached or factory lookup, conditional instance replacement, or other control flow beyond creating and configuring one value, unless semantic equivalence is proven.
- After conversion, confirm that the old outer initializer's `return localValue` and trailing `}()` are gone, while every original configuration statement and every return inside nested closures remain in the same order.

## Edit and Verify

1. Run the smallest relevant pre-edit test, build, or typecheck when practical. Record existing failures so they are not mistaken for regressions or repaired incidentally.
2. Select a small set of high-confidence improvements.
3. Apply focused edits consistent with local conventions.
4. Review the complete diff for scope creep, formatting noise, API changes, altered captures, reordered effects, and SwiftUI semantic changes.
   Confirm that retained human-readable comments and meaningful functional `// MARK: -` titles use Simplified Chinese, except protected machine/legal content and explicit language-contract exceptions.
   Confirm that methods and properties are grouped by functional responsibility without unsafe declaration movement.
   Confirm that eligible instance `lazy var` declarations form the owning class's final `// MARK: - 懒加载属性` section, preserve their original relative order and attached metadata, and retain identical lazy-initialization and ownership semantics.
   Confirm that eligible non-primary top-level file types appear after the primary type and its extensions, while nested types, conditional regions, and order-sensitive declarations remain safe.
   Confirm that eligible configured `lazy var` initializers use UGCommonKit's value-returning `with(...)` form without changing laziness, captures, configuration order, or dependency manifests.
5. Run project-configured formatting or linting on the touched scope only. Do not introduce SwiftFormat or SwiftLint to a project that does not already use it.
6. Run the most targeted available verification, preferably the same check used for the baseline:
   - Swift package: relevant tests, then `swift test` when proportionate.
   - Xcode project/workspace: discover the correct scheme and destination, then run targeted tests or `xcodebuild` without guessing destructive signing or archive settings.
   - Standalone source: use `swiftc -typecheck` only when the file can be checked meaningfully outside its module.
7. For public library interface changes or authorized file moves, compare the generated module interface or use the repository's API-diff tooling when available.
8. Review the final complete diff after all formatter and verification commands. Run `git diff --check` when working in Git and confirm no extra files or broad formatting noise appeared.
9. If verification is unavailable or impractical, state exactly what was not run and why. Do not claim behavior preservation based only on formatting or compilation.

Do not rewrite tests to hide a behavior change. Add or update tests only when necessary to prove preserved behavior and when that stays within the user's requested scope.

## Report the Result

Lead with the outcome and include:

- files or symbols organized and the meaningful structural improvements
- whether there were any intentional behavior or API changes; normally there should be none, and the claim must be supported by the verification evidence below
- formatting, lint, build, and test commands actually run, with results
- any risky opportunities deliberately left unchanged and why

Keep the report concise. Do not enumerate trivial whitespace edits.
