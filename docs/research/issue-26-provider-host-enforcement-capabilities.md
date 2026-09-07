# Issue 26 provider and host enforcement capabilities

**Decision input for:** [#26](https://github.com/hariari-app/hariari/issues/26), [#56](https://github.com/hariari-app/hariari/issues/56), [#57](https://github.com/hariari-app/hariari/issues/57), and [#59](https://github.com/hariari-app/hariari/issues/59)

**Frozen repository point:** [`28a2a7c`](https://github.com/hariari-app/hariari/tree/28a2a7c) (which contains the Issue 25 head [`28967c1`](https://github.com/hariari-app/hariari/commit/28967c185d5f9bbd78a8864da25fccc83a46f695))

**Scope:** research and design constraints only; no Policy Engine implementation

## Decision

The frozen Runtime can guarantee a **small launch-shape envelope**, not general command or filesystem confinement:

1. It routes launches only to the local `shell` and `claude` adapters and rejects other providers.
2. The shell adapter accepts only a fresh launch and starts one fixed tracer command per `launch` invocation.
3. The Claude adapter uses fixed fresh/resume/fork argv templates, requires the corresponding flags to appear in `claude --help`, selects a worktree cwd, and passes a curated environment object.
4. Fresh launches resolve a repository and base commit, choose a Runtime-generated child path and branch name, and invoke one fixed `git worktree add -b` template before provider spawn. Claude resume and fork reuse the recorded worktree rather than allocate another one.

Those guarantees stop at arguments supplied to top-level processes. The frozen code does **not** authenticate either `git` or `claude`, pin a Claude version, configure Claude permissions or sandboxing, suppress Claude settings/hooks/MCP configuration, sandbox the shell or Claude process, mediate commands run by Claude, confine provider filesystem access, suppress Git checkout hooks or filters, or prove that all allocation effects remain inside the declared Task-owned paths. It therefore cannot honestly claim a complete command/filesystem enforcement boundary and has no Policy Engine seam that can refuse unsupported directives before every effect.

Claude Code could supply useful provider-level refusals through deny rules, restricted tools, `dontAsk`, `PreToolUse`, and strict Bash sandbox settings. These are not current Hariari guarantees because the adapter passes none of those controls. Even if added later, Claude's sandbox confines **Bash and its child processes**, not the entire Claude process or every native tool, and hooks are provider callbacks rather than host isolation.[2][3][4]

Consequently, Issue 26 must treat the current adapters' unsupported enforcement as a zero-effect **deny or escalation**, never as approvable risk. This follows the settled distinction in [#55](https://github.com/hariari-app/hariari/issues/55#issuecomment-5416724214): human or provider-native approval cannot replace a missing host/provider guarantee.[12]

## Terms and timing boundaries

The matrix uses these terms:

- **Guarantee** — the frozen implementation deterministically applies the control on the named path, subject to the explicitly stated OS/process assumptions.
- **Refuse** — the frozen implementation detects non-support and returns an error before the first effect the row is meant to protect.
- **Observe only** — the implementation reads or records evidence but does not bind it to an enforcement decision.
- **Unsupported** — no current control or reliable refusal exists.

Timing labels:

- **T0 — pre-effect authorization boundary:** the boundary settled by #54. Durable authorization must finish before a capability probe, Git helper, filesystem mutation, recovery-marker write, or provider spawn.[11]
- **T1 — probe:** `claude --version` and `claude --help`; these are process spawns even though they do not allocate a Task worktree.
- **T2 — allocation preparation:** repository/base reads, Runtime root creation/checks, and target-path checks.
- **T3 — allocation effect:** `git worktree add -b`, including branch creation, shared Git administrative writes, checkout materialization, and any Git-triggered descendants.
- **T4a — outer provider spawn:** the shell or Claude PTY process begins.
- **T4b — provider initialization:** after the outer Claude process has spawned, Claude loads settings and customizations, initializes plugins/MCP servers, and runs `SessionStart` lifecycle hooks before or around its first `system/init` event. These activities can start descendants or make filesystem/network effects and can overlap T5 host work.[4][14]
- **T5 — post-spawn ownership/identity:** recovery-marker creation and native Claude session-id validation. For Claude, the marker write begins after `pty.spawn` returns while provider initialization may still be in progress; native identity arrives in `system/init` only after any preceding startup events.[14]
- **T6 — downstream provider activity:** Claude tool calls and provider-private state after startup. #54 explicitly excludes this activity from Governed Launch authority.[11]

The required design boundary is T0. The frozen order is not T0-safe: `TaskExecutionModule.launchPlannedAttempt` calls `capabilities` and then `launch`; fresh adapter `launch` allocates before spawning; the recovery marker is written only after spawn; durable execution-context attachment follows a successful adapter return. See [`TaskExecutionModule.launchPlannedAttempt`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/task-execution-module.ts#L424-L450), [`LocalGenericCliExecutionAdapter.launch`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/generic-cli-execution-adapter.ts#L221-L229), and [`ClaudeCodeExecutionAdapter.launch`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/claude-code-execution-adapter.ts#L100-L109).

## Capability matrix: frozen Hariari

| Control or claim | Frozen classification | Earliest check / effect | Exact repository evidence | Boundary and consequence |
|---|---|---:|---|---|
| Route only supported providers | **Refuse** | Before T1/T2 | [`ProviderExecutionAdapterRouter.adapterFor`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/provider-execution-adapter-router.ts#L42-L46) accepts only `shell` and `claude`. | Unknown providers fail before adapter probing/allocation. This is a real pre-effect refusal, although its error is the generic `process-start-failed` rather than a capability-specific reason. |
| Shell accepts only fresh shell launch | **Refuse** | Before T2 | [`LocalGenericCliExecutionAdapter.launch`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/generic-cli-execution-adapter.ts#L221-L225). | Resume/fork or a non-shell Task cannot reach shell allocation. |
| Fixed shell top-level command | **Guarantee** | T4a | [`tracerCommand`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/generic-cli-execution-adapter.ts#L570-L575) and [`startPty`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/generic-cli-execution-adapter.ts#L232-L252). | One tracer template is supplied per adapter invocation. POSIX pins `/bin/sh`; Windows trusts `COMSPEC` when set. This is not arbitrary shell-command mediation and is not a sandbox guarantee. |
| Claude launch variant and session identity shape | **Refuse** | Before T2 for unsupported shape | [`assertSupported`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/claude-code-execution-adapter.ts#L126-L135) requires Claude provider, session-id support, variant support, and a UUID for fresh sessions. | Unsupported fresh/resume/fork shape is rejected before allocation. Help-text membership is only a syntactic capability signal, not proof the installed executable enforces any policy. |
| Claude version identity | **Observe only** | T1 | [`probeCapabilities`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/claude-code-execution-adapter.ts#L190-L203) requires non-empty `--version` output but discards it. | No version range, path, digest, signature, inode, ownership, or package identity is bound. A different executable found through `PATH` can satisfy the check. |
| Claude resume/fork support | **Observe then refuse** | T1, before T2 | [`probeCapabilities`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/claude-code-execution-adapter.ts#L190-L203), cached by [`discoverCapabilities`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/claude-code-execution-adapter.ts#L121-L124). | Missing flags refuse the affected launch before allocation. Cached observations can become stale if the executable changes during the Runtime lifetime. No permission/sandbox capability is probed. |
| Fixed Claude top-level argv | **Guarantee** | T4a | [`STRUCTURED_MODE`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/claude-code-execution-adapter.ts#L33), [`claudeArgs`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/claude-code-execution-adapter.ts#L210-L218), and the production contract test [`startsProductionClaudeProvider`](https://github.com/hariari-app/hariari/blob/28a2a7c/tests/integration/runtime-claude-provider-session-contract.test.ts#L44-L60). | The adapter supplies `--print --verbose --output-format stream-json`, identity flags, and the objective as a distinct argv item. It supplies no permission, tool, sandbox, settings-source, or MCP restriction flags. The objective is bounded against shell interpolation but remains provider instruction content. |
| No shell parsing for probe and Git helper argv | **Guarantee** at the Node call site | T1/T2/T3 | [`LocalClaudeExecutable.run`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/claude-code-execution-adapter.ts#L177-L187) and [`git`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/generic-cli-execution-adapter.ts#L522-L537) use `execFile` with argv arrays. Node documents that `execFile` spawns the file directly without first spawning a shell by default.[6] | Prevents shell metacharacters in Task fields from becoming top-level shell syntax. It does not authenticate the executable, block executable descendants, or constrain what Git/Claude does internally. Windows `.bat`/`.cmd` handling remains platform-specific; neither current target name uses such an extension. |
| Curated provider environment | **Guarantee** only for the map passed to PTY | T4a | [`runtimeEnvironment`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/generic-cli-execution-adapter.ts#L577-L587); used by shell [`startPty`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/generic-cli-execution-adapter.ts#L239-L246) and Claude [`spawn`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/claude-code-execution-adapter.ts#L149-L168). | Only selected keys plus `TERM` are passed. `PATH` is intentionally retained, so executable lookup remains ambient. This is not a secret-free guarantee: retained variables may contain sensitive values, and programs can read host files or OS configuration absent isolation. |
| Provider cwd is the selected worktree | **Guarantee** at spawn | T4a | Same `startPty` and Claude `spawn` symbols above pass `cwd: worktreePath`. Node defines `cwd` as the child process working directory.[6] | A cwd is not a filesystem boundary. Absolute paths, `..`, symlinks, subprocesses, and provider-native tools can reach elsewhere unless separately confined. |
| Repository candidate is an ordinary directory and returned root is canonical | **Guarantee with race limits** | T2 | [`resolveRepository`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/generic-cli-execution-adapter.ts#L498-L507) uses `lstat`, rejects a candidate symlink/non-directory, calls `git rev-parse --show-toplevel`, then `realpath`. | Rejects the simple candidate-symlink case and canonicalizes the reported root. It does not establish repository ownership/trust, keep a directory handle open, or prevent replacement between checks and later Git calls. Node's path checks are observations, not an OS confinement primitive.[7] |
| Base resolves to a commit | **Observe then refuse** | T2 | [`allocateLocalExecutionContext`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/generic-cli-execution-adapter.ts#L543-L553) invokes `rev-parse --verify <base>^{commit}` and uses returned text as `baseCommit`. | Invalid resolution refuses before T3. The code does not independently validate the returned object-id format or bind repository/config identity into a policy decision. |
| Runtime-chosen worktree child path and branch template | **Guarantee with race limits** | T2/T3 | [`branchFor`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/generic-cli-execution-adapter.ts#L539-L541), [`allocateLocalExecutionContext`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/generic-cli-execution-adapter.ts#L543-L553), and [`prepareWorktreePath`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/generic-cli-execution-adapter.ts#L509-L520). | The target is lexically `task-worktrees/<Runtime id>`, and an already accessible target is rejected. The root is created mode `0700` and checked as a non-symlink directory. There is a check/use race, recursive creation may traverse pre-existing ancestors, and no ownership/permissions check confirms an existing root is Runtime-private. |
| At most one direct branch/worktree allocation call per fresh adapter invocation | **Guarantee** at the call site; **not atomic** | T3 | [`allocateLocalExecutionContext`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/generic-cli-execution-adapter.ts#L543-L553) contains one direct `git worktree add -b` call and no retry loop. Git documents that `worktree add` creates a linked worktree, checks out the commit, and shares repository data except per-worktree files.[8] | A successful fresh adapter launch requires that one direct `worktree add` call to succeed. The call has multiple durable effects and can start Git-triggered descendants; failure may leave a branch, worktree metadata, or partial checkout. Neither descendant effects nor a later Runtime/crash retry are bounded or exactly-once. |
| Complete allocation filesystem envelope | **Unsupported** | T3 | The same allocation symbol invokes ordinary repository Git without hardening flags. Git documents that `worktree add` performs checkout and runs `post-checkout` unless `--no-checkout` is used; checkout filters can run configured `smudge` commands.[8][9][10] | A trusted or compromised repository/common Git configuration can cause additional process and filesystem effects. Frozen code neither inventories nor disables hooks/filters nor confines their descendants. It therefore cannot guarantee the #54 Task-owned mutation list for arbitrary repositories. |
| Resume/fork creates no new worktree | **Guarantee with identity limits** | T2 | [`ClaudeCodeExecutionAdapter.allocate`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/claude-code-execution-adapter.ts#L137-L147) and [`existingLocalWorktreePath`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/generic-cli-execution-adapter.ts#L556-L567). | It performs no `worktree add`; it checks only that the recorded path is a non-symlink directory. It does not re-resolve ownership, repository identity, branch, base, inode, or containment before spawn. Those values are inherited from durable context. |
| At most one direct provider PTY spawn call per adapter `launch` invocation | **Guarantee** at the call site | T4a | Shell [`startPty`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/generic-cli-execution-adapter.ts#L232-L252); Claude [`spawn`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/claude-code-execution-adapter.ts#L149-L168). | Each path contains one direct `pty.spawn` call and no retry loop, and a successful adapter launch requires that call to return successfully. This is not globally exactly-once across crash/retry; provider descendants and provider-internal retries are unbounded. A spawn can occur before later validation fails. |
| Claude provider initialization/customization effects | **Unsupported** | T4b, after T4a and before/around T5 | [`claudeArgs`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/claude-code-execution-adapter.ts#L210-L218) supplies no settings-source, safe-mode, hook, plugin, or MCP restriction; [`ClaudePtyLifecycle.readIdentity`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/claude-code-execution-adapter.ts#L319-L346) waits for the init event. First-party docs say ordinary `-p` loads project/user context, runs project hooks, connects `.mcp.json` servers, and can emit plugin-install and `SessionStart` hook events before `system/init`.[4][14] | Settings reads, customization/plugin initialization, MCP connection or stdio-server spawn, and `SessionStart` hook effects happen inside the already-spawned provider. Frozen Hariari neither suppresses them nor attests their resolved set, descendants, paths, network effects, completion, or failures; their effect envelope is unsupported and unbounded. |
| Recovery ownership marker before spawn | **Unsupported** | T5, after T4a | [`recordRecoveryOwnership`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/local-recovery-markers.ts#L28-L61) is called after each `pty.spawn`. | Unsafe marker storage cannot be refused pre-spawn. The catch path attempts to kill the process, but that is compensation after an effect, not zero-effect refusal. Marker creation also adds directory/file writes not yet authorized by a current Policy Engine. |
| Native Claude session identity | **Observe then compensate** | T5, after T4a/T4b | [`ClaudePtyLifecycle.readIdentity`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/claude-code-execution-adapter.ts#L319-L346) parses the stream init event; [`validateNativeIdentity`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/claude-code-execution-adapter.ts#L258-L268) checks it. | Mismatch causes process abort after spawn. It cannot be a pre-spawn refusal because the evidence exists only after Claude starts. |
| Claude command mediation | **Unsupported** | T6 | `claudeArgs` contains no `--permission-mode`, `--tools`, `--allowedTools`, or `--disallowedTools`; no settings payload or permission-prompt tool exists in `ExecutionAdapter`. | Hariari cannot allow/deny individual Bash commands, edits, reads, or other tool calls. Output observation is after-the-fact and is not enforcement. |
| Claude filesystem confinement | **Unsupported** | T6 | No sandbox directive exists in [`ExecutionAdapter`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/generic-cli-execution-adapter.ts#L32-L38), and Claude launch passes no sandbox configuration. | Worktree cwd alone does not prevent writes or reads elsewhere. Provider-private settings/session files and native tools are outside any current Hariari boundary. |
| OS-level process/filesystem sandbox, identity, resource, or privilege controls | **Unsupported** | T1 through T6 | `execFile` and `pty.spawn` receive cwd/env and `windowsHide`, but no uid/gid, namespace, container, seccomp, MAC profile, job object, cgroup, mount, or filesystem broker directive. | Current local host is a process launcher, not an isolation host. Policy must not advertise controls merely because the platform could support them. |
| Fail-closed classification of launch errors | **Partial guarantee** | Any current stage | Adapter helpers map most failures to `worktree-unavailable` or `process-start-failed`; [`failStart`](https://github.com/hariari-app/hariari/blob/28a2a7c/src/runtime/task-execution-module.ts#L461-L485) persists a start failure and attempts to stop an active process. | It fails closed with respect to reporting a successful launch. It does **not** guarantee zero effects: allocation, spawn, hook/filter activity, marker writes, or partial resources may already exist. |

## Capability matrix: first-party Claude controls Hariari could consume

This table describes current first-party Claude Code capabilities, not frozen Hariari behavior. Every provider-startup control below takes effect only after Hariari has spawned the outer Claude process at T4a; even a provider startup refusal is therefore post-spawn, is not a zero-effect T0 refusal, and cannot substitute for host authorization or isolation.

| Claude control | Provider can guarantee or refuse | Timing | Limits that matter to #26/#59 | Frozen Hariari |
|---|---|---|---|---|
| `--disallowedTools` / deny rules | Matching tools or scoped calls are denied; deny rules take precedence over ask and allow, and another scope cannot override a deny.[1][2] | Before the matched tool runs (T6) | A scoped Bash rule depends on command-pattern semantics; a bare tool denial is stronger. It is provider enforcement, not OS isolation. Configuration from mutable scopes must not be mistaken for Runtime authority. | Not set or probed. |
| `--tools` | Restricts which built-in tools are available; an empty value disables all built-ins. It does not restrict MCP tools, which require separate denial.[1] | Provider startup / tool availability | `--allowedTools` is **not** a tool allowlist; it auto-approves matching tools while unlisted tools continue through normal permission evaluation.[1] | Not set. |
| `dontAsk` permission mode | Automatically denies permission requests that are not pre-approved rather than waiting for a human.[2] | Before a would-prompt tool runs | Explicit allow rules still work. It does not by itself define the permitted command/filesystem set, and provider-native permission is not Hariari approval. | Not set. Unattended print-mode behavior is left to ambient defaults. |
| `plan` permission mode | Restricts editing while permitting documented read-only exploration behavior.[2] | Before tool calls | Not a general command allowlist or host sandbox; read-only commands and reads still occur. Unsuitable as evidence of a zero-command policy. | Not set. |
| `PreToolUse` hook | A blocking decision can refuse a tool call before execution; it runs before the permission prompt for tools other than the documented exception.[2][4] | Immediately before each matched T6 tool call | Hook matching is not the hard boundary for complex Bash classification, and hook commands themselves run unsandboxed. A hook is executable policy plumbing with its own side effects, availability, timeout, and integrity requirements. | No hook installed, supplied, authenticated, or observed. |
| Permission `ask` / provider prompt | Pauses a tool call for Claude-native approval.[2] | Before that T6 call | Not an authenticated Hariari approval and unsuitable for unattended determinism. #55 forbids treating it as Runtime approval.[12] | Ambient behavior; not integrated. |
| Bash sandbox enabled | OS-level filesystem/network restrictions apply to Bash commands and their child processes.[2][3] | While a T6 Bash command runs | It does not wrap native Read/Edit or the entire Claude process. Default writable scope includes the working directory, Claude's session temporary directory, configured writable additions, and—when cwd is a linked worktree—an automatic allowance for selected writes to the main repository's shared `.git` directory; shared `.git/hooks` and `.git/config` remain denied.[3] Environment variables are inherited by sandboxed Bash by default. | Not enabled or probed by Hariari. |
| `sandbox.failIfUnavailable: true` | With sandboxing enabled, missing dependencies or an unsupported platform block Claude Code startup instead of warning and allowing unsandboxed commands.[3][13] | T4b startup check, after the outer Claude process spawn and before a Bash tool call | This is availability fail-closed, not proof that the resolved filesystem/network profile matches a requested policy. Boolean managed values take precedence, but array/path settings can merge across scopes; it does not isolate the outer process or provide T0 authorization.[3] | Not set, probed, or acknowledged; no startup refusal is a frozen Hariari guarantee. |
| Strict sandbox (`allowUnsandboxedCommands: false`) | Refuses Claude-requested unsandboxed retries instead of allowing the escape hatch.[3] | Before an unsandboxed retry | Must be combined with sandbox enabled and filesystem isolation enabled; excluded commands and trusted settings can alter coverage. The provider process and non-Bash tools still need separate controls. | Not set or acknowledged. |
| Sandbox filesystem path rules and `blockReadsOutsideWorkingDirectories` | Narrows Bash filesystem reads/writes; Read/Edit deny rules are merged into the sandbox boundary.[2][3] | Permission evaluation and Bash execution | Path anchoring is the primary working directory for CLI/session rules. Symlinks, shared Git metadata, platform support, and native provider storage need explicit contract tests. | Not set. |
| `--bare` | In scripted calls, skips auto-discovery of hooks, skills, custom commands, subagents, plugins, MCP servers, auto memory, and CLAUDE.md; it also does not read OAuth credentials or the system keychain.[1][14] | T4b customization and authentication discovery, after outer spawn | Skills under a directory passed with `--add-dir` still load, and Bash, file-read, and file-edit tools remain available. This is startup suppression, not permission restriction, whole-process isolation, or T0 authorization.[1][14] | Not passed, probed, or acknowledged; suppression is not a frozen Hariari guarantee. |
| `--safe-mode` | Disables listed customizations, including non-managed CLAUDE.md, skills, plugins, hooks, MCP servers, commands/agents, workflows, LSP servers, and auto memory; authentication, model selection, built-in tools, permissions, and managed settings policy still operate. Managed policy hooks/status-line/file-suggestion commands still load, while managed plugins, skills, CLAUDE.md, and policy-configured MCP servers do not.[1] | T4b customization discovery, after outer spawn | This is a troubleshooting mode, not an authenticated allowlist. It intentionally retains permissions and some managed executable callbacks, sets an inherited environment variable, and supplies neither outer-process isolation nor a T0 refusal.[1] | Not passed, probed, or acknowledged; suppression is not a frozen Hariari guarantee. |
| `--setting-sources` | Selects the comma-separated `user`, `project`, and `local` settings sources to load; an explicit set can omit ambient file scopes.[1] | T4b settings loading, after outer spawn | The flag does not displace managed settings policy, and source selection alone neither authenticates selected files nor freezes values that can reload. It does not suppress every customization surface or isolate settings parsing/loading from the host.[1][5] | Not passed, probed, or acknowledged; ambient source suppression is not a frozen Hariari guarantee. |
| `--settings` | Loads a regular-file settings JSON or inline JSON whose supplied keys override the same file-based keys for the session; omitted keys retain file-based values. A file must be regular and at most 2 MiB.[1] | T4b settings parsing/merge, after outer spawn; many resulting settings can later reload | It is an additive/overriding input, not a complete replacement unless paired with source controls and a complete trusted payload. Parse/validation or policy conflicts can refuse inside Claude only after spawn; settings can themselves configure hooks, permissions, sandbox paths, or other effects.[1][5] | Not passed, authenticated, version-bound, or acknowledged; no settings-based refusal is a frozen Hariari guarantee. |
| `--strict-mcp-config` | Uses only MCP servers supplied through `--mcp-config` and ignores other MCP configurations; without `--mcp-config`, no MCP servers load, subject to documented managed-MCP behavior.[1] | T4b MCP discovery/initialization, after outer spawn; with `-p`, pending explicitly configured servers are waited on before the first turn for up to `MCP_TIMEOUT` (30 seconds by default on supporting versions).[14] | It controls MCP source selection, not settings/hooks/plugins or outer-process network/filesystem access. Invalid entries can be skipped while the run continues; remote servers with cached tools can remain pending until first use, so #59 needs resolved-init attestation rather than argv presence alone.[14] | Not passed, probed, or acknowledged; MCP suppression/refusal is not a frozen Hariari guarantee. |
| Managed/user/CLI settings authority | Managed settings can enforce organization policy; user, project, and local files are separate scopes, and most settings can reload during a session.[5] | Startup and, for many keys, during T6 | Runtime must choose trusted sources and bind the resolved configuration/version. Project allow rules require workspace trust, but restrictive project rules and other scopes still complicate provenance. A launch-time snapshot may drift because permissions/hooks can reload. | Hariari neither selects settings sources nor records resolved policy provenance. |

### What Claude controls cannot establish alone

Even a correctly configured Claude session cannot by itself establish all of the Governed Launch envelope:

- Claude settings/customization controls and startup refusals begin only inside the already-spawned provider, and permissions/sandboxing begin inside the provider's tool lifecycle; they do not govern Hariari's earlier `claude --version`, `claude --help`, Git allocation helpers, root creation, outer spawn, or recovery-marker write.
- Claude's Bash sandbox does not authenticate the outer `claude` executable or isolate the whole provider process.[3]
- Provider rules do not make Git allocation transactional or suppress checkout-time Git hooks and filters.
- Provider refusal is not proof of a host refusal. Conversely, a host sandbox can constrain effects even if provider command classification fails. The enforcement record must identify which layer supplied each guarantee.
- Output, exit status, native session-id events, and recovery observations are evidence after effects; they cannot satisfy T0 authorization.

## Frozen execution order and gaps

### Fresh shell

1. Runtime reserves a Run/Attempt and creates planned identities.
2. `capabilities` returns `{resume:false,fork:false}` without a process.
3. Adapter rejects non-shell/non-fresh shape.
4. `resolveRepository` runs `lstat`, `git rev-parse --show-toplevel`, and `realpath`.
5. `git rev-parse --verify <base>^{commit}` runs.
6. Runtime root is created/checked; the intended child path is checked absent.
7. `git worktree add -b ...` mutates branch/shared repository/worktree state and may run repository-configured checkout hooks/filters.[8][9][10]
8. The fixed tracer is spawned in the worktree at T4a.
9. Recovery ownership is written; only later does Runtime attach the durable context and mark the attempt started.

There is no authorization or capability-enforcement call before step 4. A failure in steps 7–9 can be fail-closed as a launch result while still leaving effects.

### Fresh Claude

The fresh shell sequence is preceded by a cached-or-new Claude probe. On first use, `--version` and `--help` are separate processes at T1. After allocation, the outer Claude process starts with the fixed structured argv at T4a. Ambient settings/customization loading, plugin and MCP initialization, and `SessionStart` hooks can then run at T4b before or around `system/init`; marker persistence and native identity validation are post-spawn and can overlap or follow that initialization.[4][14] No permission, sandbox, settings-source, safe-mode, or MCP restriction is part of frozen capability discovery or launch validation.

### Claude native resume and fork

The adapter probes or reuses cached capability evidence, checks that the inherited worktree path is a non-symlink directory, and spawns a new Claude process there. It does not allocate a branch/worktree, but it also does not revalidate repository identity, branch/base, containment, or provider enforcement state. A repair/retry reaches the same `launch` seam and therefore needs a new T0 decision as settled by #54.[11]

## Actionable Policy Engine constraints

These are constraints for later design tickets, not an implementation proposal.

### Inputs and decisions

1. **Represent capability states as `guaranteed`, `refusable`, `observe-only`, or `unsupported`.** A Boolean `supported` cannot distinguish an enforceable boundary from a post-effect signal.
2. **Bind every directive to a layer and timing boundary.** At minimum distinguish Runtime orchestration, Git helper, local process host, Claude provider permission, Claude Bash sandbox, and observation-only evidence.
3. **Require a complete T0 launch descriptor before probing.** It must include launch variant, provider/adapter, platform, executable identity requirement, version requirement, argv-template id, cwd/path class, environment-profile id, Git helper templates, allocation-or-reuse mutation plan, marker plan, and requested enforcement directives—including `sandbox.failIfUnavailable`, strict unsandboxed fallback, safe/customization mode, settings sources/payload identity, and strict MCP source policy—matching the settled #54 envelope.[11]
4. **Use two-phase capability handling without authority widening.** Static trusted policy first authorizes the bounded probe itself. Probe results may only validate or narrow the requested route. An unsupported, malformed, stale, or contradictory result must produce typed zero-effect refusal before T2/T3/T4a; it must never silently drop a directive. A Claude refusal during T4b is already post-spawn and must be recorded as such, never relabeled as the T0 refusal required for host authorization/isolation.
5. **Do not map unsupported enforcement to `require-approval`.** Return `deny` when policy conclusively forbids the route or `escalate` when a different trusted host/provider/capability route is required.[12]
6. **Keep T6 authority separate.** A Governed Launch decision may authorize the fixed provider spawn but must not imply authorization for later Claude Bash/Edit/Read/MCP/network effects.[11]

### Required host contract behavior for #59

7. **Make executable identity explicit.** Bare `git` and `claude` names plus non-empty version text are insufficient. #59 needs a declared executable resolution/identity capability and a pre-effect mismatch refusal. Exact fingerprint/evidence representation belongs to #57.
8. **Make each top-level process template explicit and versioned.** The shell tracer, Claude probes, Git resolution helpers, `worktree add`, and Claude launch are separate command classes. The objective must remain a bounded argument role, not persisted raw argv or arbitrary command authority.
9. **Return per-directive acknowledgements before the protected effect.** An adapter must not return general readiness when only resume/fork flags were observed. Required acknowledgements include executable, argv, cwd, environment, allocation/reuse, provider permission mode/rules, sandbox mode/coverage, `sandbox.failIfUnavailable`, unsandboxed-fallback state, `--bare`, `--safe-mode`, `--setting-sources`, `--settings` payload identity/limits, `--strict-mcp-config` plus the explicit MCP set, resolved settings/customization/MCP provenance, initialization outcome, and unsupported gaps. Acknowledgement of argv is not acknowledgement that T4b initialization completed or refused as directed.
10. **Refuse partial application.** If one mandatory directive cannot be guaranteed at the required time, no later helper, allocation, marker write, or provider process may run. Compensation after spawn is an outcome, not a pre-effect refusal.
11. **Separate host isolation from provider mediation.** Claude deny rules/hooks can refuse provider tool calls; only a host boundary can constrain the outer process and non-provider descendants. The contract must not report these as interchangeable.
12. **Treat provider initialization and dynamic settings as effects.** #59 must suppress settings/customization/plugin/MCP/`SessionStart` activity that the policy excludes, attest the complete resolved initialization and its outcomes when it is allowed, or refuse the route before T4a when neither is possible. If Claude settings can reload, #59 must either establish an immutable trusted session configuration or surface loss/change of enforcement. A T4b provider refusal or launch-time observation alone cannot guarantee T0 safety or unchanged T6 behavior.[4][5][14]

### Required filesystem constraints

13. **Do not equate cwd with confinement.** Any policy requiring “only this worktree” needs a host or provider capability that covers absolute paths, traversal, symlinks, descendants, and every relevant tool class. For Claude's Bash sandbox, #59 must model and attest or explicitly remove/refuse **each** implicit writable area: the working directory, Claude session temporary directory, every configured writable addition, and the linked-worktree allowance for selected writes in the main repository's shared `.git` directory. If any remains outside the authorized worktree-only envelope, the route must refuse before T4a.[3]
14. **Model shared Git administration separately from worktree files.** `git worktree add` necessarily writes both. Policy evidence must distinguish the Runtime child path, per-worktree index/HEAD, shared refs/worktrees metadata, and checkout contents.[8]
15. **Treat Git hooks and filters as command effects.** Until a trusted Git execution route can prove they are disabled, constrained, or included in the authorization envelope, complete fresh-allocation confinement is unsupported and must refuse when policy requires it.[9][10]
16. **Close check/use races at the enforcement layer.** `lstat`/`realpath` checks followed by path-string operations do not prove stable containment. A capability claim must name the actual primitive that preserves identity/containment through mutation and spawn.
17. **Declare marker storage as part of the launch mutation plan and validate it before T4a.** The current post-spawn `recordRecoveryOwnership` check is too late for a zero-effect refusal.
18. **For resume/fork, revalidate rather than merely inherit when policy requires it.** The exact worktree/repository/branch/base identity and enforcement configuration must still match the approved effect before spawn.

### Evidence inputs for #57

#57 should be able to fingerprint, without storing excluded raw values:

- fixed command-template id and template version;
- resolved executable identity and observed version evidence;
- platform/host and adapter implementation version;
- curated environment-profile id, not environment values;
- canonical repository identity, resolved base commit, branch template/id, worktree path class, and allocation versus reuse;
- requested directives plus exact per-layer acknowledgements/refusals, including whether refusal happened pre-spawn or only inside provider initialization;
- Claude settings-source/provenance snapshot, `--settings` payload identity and size/type validation, permission mode, tool restriction set id, sandbox profile id, `sandbox.failIfUnavailable`, whether unsandboxed fallback is disabled, `--bare`, `--safe-mode`, and `--strict-mcp-config` with the explicit MCP set;
- resolved T4b initialization evidence: loaded/suppressed settings and customizations, plugins, MCP server statuses/errors, `SessionStart` hook set/outcomes, and any provider-init descendants or effects the host can attest;
- probe identity/time and cache generation;
- timing outcome: refused at T0/T1/T2, allocation began/completed, outer spawn began/completed, provider initialization began/completed/refused, marker completed, or post-effect compensation required.

A probe result, process exit, output event, or marker is evidence only. #57 must not promote it into proof of a guarantee unless #59 names the enforcing primitive and timing boundary.

## Required refusal cases

The future contract should make these outcomes testable and typed:

| Condition | Latest safe refusal point | Required result |
|---|---:|---|
| Provider/variant not in the governed family | T0 | Deny; zero probes and effects. |
| Required executable identity/version cannot be established | T1, before any T2/T3/T4a effect | Deny or escalate; probe outcome recorded, no allocation/spawn. |
| Required Claude permission/tool/sandbox directive, including `sandbox.failIfUnavailable` or strict unsandboxed fallback, is unavailable or unacknowledged | T1, before T2/T3/T4a | Deny or escalate; no allocation or outer provider spawn. A later T4b Claude startup failure is post-spawn evidence, not this refusal. |
| Required `--bare`, `--safe-mode`, `--setting-sources`, `--settings`, or `--strict-mcp-config` directive/payload is unavailable, invalid, or unacknowledged | T1, before T2/T3/T4a | Deny or escalate; never fall back to ambient settings/customizations/MCP sources. Record the exact rejected directive and validation outcome for #57. |
| Required suppression or complete attestation of settings/customization/plugin/MCP/`SessionStart` initialization cannot be guaranteed | Before T4a | Deny or escalate; no outer provider spawn. If mismatch is knowable only at T4b, stop and record a post-spawn enforcement failure; never report zero-effect refusal or successful enforcement. |
| Repository/base/path resolution mismatches approved descriptor | T2, before T3/T4a | Deny; no worktree/branch/provider spawn. |
| Policy requires complete fresh-allocation confinement but Git hooks/filters are not bounded | T0 or T2, before T3 | Deny or escalate; no `worktree add`. |
| Resume/fork worktree identity or containment is unknown | T2, before T4a | Deny or escalate; no provider spawn. |
| Marker destination cannot be safely established | Before T4a | Deny or escalate; current T5 compensation is insufficient. |
| Spawn-time enforcement acknowledgement differs from the approved directive | Before T4a if knowable; otherwise record post-effect enforcement failure and stop | Never report allowed launch as enforced; do not reuse the grant. |
| Capability/settings drift invalidates a mandatory T6 boundary | Before the next governed tool effect | Provider/host refusal or terminate according to contract; never silently continue with weaker controls. |

## Explicit non-capabilities

The following must not appear as supported in #26 based on the frozen code:

- arbitrary shell command allow/deny policy;
- lexical command inspection as a complete security boundary;
- authenticated `git` or `claude` executable identity;
- a pinned/supported Claude Code version;
- zero-process capability discovery;
- transactional worktree/branch creation or automatic rollback;
- suppression or confinement of Git hooks, filters, or helper descendants;
- worktree-only filesystem access for shell or Claude;
- denial of reads outside the worktree;
- denial of provider-private session/config writes;
- denial of network, MCP, browser, connector, or credential effects;
- OS user/privilege, namespace, container, seccomp, MAC, cgroup, job-object, or resource-limit enforcement;
- exactly-once spawn/allocation across crash and retry;
- immutable Claude permission/sandbox settings throughout a session;
- pre-spawn validation of native Claude session identity;
- treating kill-after-failure as zero-effect refusal.

## Uncertainties and validation still required

1. **Claude documentation is rolling.** The repository does not pin Claude Code, and official pages describe version-dependent behavior. The current probe checks only three help flags, so the applicable permission/sandbox semantics of an installed binary are unknown until #59 defines a supported-version and capability-attestation rule.[1][2][3]
2. **No actual supported Claude binary is frozen in this repository.** Test fixture `2.1.241` is synthetic output, not a dependency or production compatibility statement; see [`RecordingClaudeExecutable`](https://github.com/hariari-app/hariari/blob/28a2a7c/tests/integration/runtime-claude-provider-session-contract.test.ts#L194-L203).
3. **PTY spawn guarantees are interface assumptions.** The code types only the subset it consumes. This research did not establish cross-platform `node-pty` security or executable-resolution guarantees, so #59 must not infer them from the local TypeScript interface.
4. **Git configuration provenance is unknown.** The frozen helper does not constrain system/global/local config, hook path, attributes, filter drivers, executable ownership, or repository trust. The exact side-effect set therefore depends on the host and repository.[8][9][10]
5. **Filesystem checks have unresolved race and ownership properties.** Existing `lstat`/`realpath` checks improve validation but do not prove stable object identity between check and use. Whether a future cross-platform host can supply the required primitive is a #59 decision, not established here.
6. **Claude sandbox platform parity and native-tool boundaries require pinned-version tests.** Official docs establish the conceptual Bash-only boundary, but an implementation contract still needs acceptance tests on each supported Hariari host platform.[3]
7. **Post-spawn failures are not pre-effect refusals.** Native identity and marker failures currently trigger kill/abort paths, but process descendants or earlier filesystem changes may already exist. No stronger cleanup guarantee was found in frozen code.

## Sources

Rolling Claude Code documentation [1]–[5], [13], and [14] was retrieved on 2026-09-07.

[1] https://code.claude.com/docs/en/cli-reference
[2] https://code.claude.com/docs/en/permissions
[3] https://code.claude.com/docs/en/sandboxing
[4] https://code.claude.com/docs/en/hooks
[5] https://code.claude.com/docs/en/settings
[6] https://nodejs.org/api/child_process.html
[7] https://nodejs.org/api/fs.html
[8] https://git-scm.com/docs/git-worktree
[9] https://git-scm.com/docs/githooks
[10] https://git-scm.com/docs/gitattributes
[11] https://github.com/hariari-app/hariari/issues/54
[12] https://github.com/hariari-app/hariari/issues/55
[13] https://code.claude.com/docs/en/settings-reference
[14] https://code.claude.com/docs/en/headless
