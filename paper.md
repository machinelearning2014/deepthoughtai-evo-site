# EVO: The Explicit-assumption Verification Orchestrator
## An Architecture for Autonomous, Evidence-Grounded, Tiered Reasoning

**Author:** EVO (Explicit-assumption Verification Orchestrator), version 1.4

**Date:** July 23, 2026

**Implementation baseline:** This document describes the repository state as of July 23, 2026. Runtime gates and stage controllers are the normative authority where prompts, examples, or historical material differ.

---

## Abstract

This paper presents *EVO* (Explicit-assumption Verification Orchestrator), an agent runtime for autonomous reasoning that is **evidence-grounded, assumption-explicit, and tier-appropriate**. EVO routes each request to one of three active tiers — MATHS, CODE, or REASON — and couples model generation to deterministic workflow controllers, tool authorization, evidence ledgers, and answer-time gates. MATHS supports computational, derivational, proof, and formal rigor. Formal work is deliberately two-phase: a mathematical-proof phase must first pass the MATHS controller with one self-contained Prolog evidence program; a Lean phase then preserves and verifies an exact `formal_target`, with `prove_problem verify_final` as the final authority. CODE operates on one authoritative revisioned workspace through surface-neutral `code_*` tools and requires exact source inspection before mutation and verification after it. REASON uses a self-contained Prolog harness for derivation, consistency, and assumption-dependence analysis.

The runtime also provides structured evidence extraction, large-artifact offloading, proof-insight reuse, read-only worker delegation, and disconnect-tolerant streaming. WebSocket events are replayable and have an NDJSON recovery path; both streaming and non-streaming paths record model/tool timing. The implementation is enforced at three points: before tools execute, during the tool loop through a breach ledger, and before an answer is emitted through deterministic verification controllers. Section 3 gives implementation-aligned workflows and compact examples. Appendix A is retained as a historical argumentation case study; it is not a specification of current runtime behavior.

---

## 1. Introduction

Large language models (LLMs) have demonstrated remarkable capabilities in generating fluent text, answering questions, and even performing multi-step reasoning. However, they suffer from well-documented failure modes: hallucination, hidden assumptions, inconsistent beliefs, and an inability to distinguish between memorized patterns and verified knowledge. These failures are not mere engineering challenges — they are architectural consequences of the stochastic, latent-knowledge paradigm that underlies all pure neural language models.

Recent surveys confirm the persistence of these challenges. Colelough and Regli (2025) conducted a PRISMA-based systematic review of 167 neuro-symbolic AI papers and found that explainability (28% of papers) and meta-cognition (5%) remain the least-explored research areas — precisely the gaps that EVO's explicit assumption-tracking and proof-trace mechanisms are designed to address. Yang et al. (2025), in an IJCAI 2025 survey track paper, taxonomized neuro-symbolic approaches into three categories — Symbolic→LLM, LLM→Symbolic, and LLM+Symbolic — and identified reasoning improvement as the primary motivation across all paradigms.

EVO was designed to address these failure modes through a system of **structured epistemic accountability**. The guiding insight is that reasoning is not a monolithic capability but a spectrum of activities requiring different types and strengths of evidence. A factual lookup, a numerical computation, a philosophical argument, and a formal mathematical proof each demand fundamentally different verification mechanisms. Treating them all with the same machinery is the root cause of many AI reliability failures.

The architecture embodies three core commitments:

1. **Evidence primacy:** No conclusion is output without evidence appropriate to its tier.
2. **Assumption transparency:** Every inference bridge not strictly entailed by facts is declared as an explicit assumption, subject to dependence testing and removal.
3. **Verification authority:** Each tier delegates verification to a designated mechanism — computation and structured mathematical evidence for MATHS, source plus executable checks for CODE, Prolog derivation for REASON, and Lean 4 for formal proof — and no tier claims authority it cannot provide.

These commitments are not aspirational goals. They are enforced through a workflow system that halts — with explicit failure reasons — when evidence requirements are unmet.

---

## 2. Architectural Overview

EVO is not a monolithic model but a **workflow orchestration system** that coordinates a language model, symbolic engines, repository tools, and verification controllers under one stateful agent loop. Its principal subsystems are triage, workflow state, evidence and context management, tool integration, gate enforcement, worker orchestration, and transport.

### 2.1 The Tier Classification Layer (Triage)

Every incoming request passes through a mandatory **triage** step that classifies it into exactly one of three tiers. This classification determines which workflow, which tools, and which evidence standards apply. The triage is performed before any tool invocation, based on an analysis of the request's structure and requirements. The three tiers, with MATHS supporting four ascending rigor levels, are:

| Tier | Description | Primary evidence | Representative tools | Prolog requirement |
|------|-------------|------------------|----------------------|--------------------|
| MATHS | Mathematical computation, derivation, proof, classification, and formal verification | Computation or symbolic derivation; structured proof evidence; Lean kernel acceptance for formal rigor | `maths_problem`, `python_exec`, `sympy_exec`, `prolog_exec`, `prove_problem`, `lean4_probe`, `lean4_exec` | Optional for computational work; one atomic evidence program is mandatory before non-computational Phase 1 finalization |
| CODE | Code, configuration, repository, build, test, review, and developer-tool work | Exact source and repository state plus proportionate executable verification | canonical `code_*` workspace tools | Not a workflow prerequisite |
| REASON | Requests not classified as MATHS or CODE, including factual, conceptual, strategic, and logical analysis | Self-contained Prolog derivation, consistency result, and assumption-dependence result; external tools supply declared capabilities | `prolog_exec`, `web_search`, `web_browse`, `python_exec` | Required |

The MATHS tier's four rigor levels form an ascending evidence hierarchy:
- **computational**: computed value or pattern is sufficient
- **derivational**: symbolic derivation or transformation is required
- **proof**: construction, existence, exclusion, or case analysis evidence is required
- **formal**: a two-phase protocol is required: MATHS proof verification first, then exact-target Lean 4 verification under `prove_problem`

This tiered approach is supported by the broader neuro-symbolic literature. Acharya and Song (2025) analyze neuro-symbolic AI through the lens of three trustworthiness dimensions — robustness, uncertainty quantification, and intervenability — finding that different trustworthiness properties require different architectural mechanisms. EVO's tiered design embodies this insight: each tier is optimized for the specific trustworthiness demands of its task class.

The triage decision is made according to the following decision procedure:

- **MATHS:** Mathematical computation, derivation, construction, classification, counterexample, existence/impossibility arguments, and proofs. Explicit requests for Lean, Mathlib, machine checking, or formalization select formal rigor. Ordinary requests to prove a mathematical proposition select proof rigor; requests to derive, solve, or classify select derivational rigor; remaining mathematical work is computational. The presence of LaTeX alone does not imply formal rigor.
- **CODE:** Requires reading, writing, reviewing, debugging, testing, deploying, or securing code, config, repositories, dependencies, builds, or developer tooling; evidence comes from source files, repository metadata, and test/build output.
- **REASON:** All other requests — multi-step logical inference, multiple perspectives, contestable assumptions, philosophical/ethical/strategic analysis, factual queries, and simple lookups. REASON uses the full Prolog workflow. Non-Prolog information gathering is introduced through explicit `need_capability/2` declarations.

Legacy labels are normalized for compatibility: COMPUTE maps to MATHS computational and LITE maps to REASON. They are not active tiers. Invalid classifier output falls back to REASON rather than creating an ungoverned path.

### 2.2 The Assumption-Management Layer

EVO treats assumptions as **first-class objects** — inference bridges that must be declared, tracked, and tested. This is perhaps the most architecturally distinctive feature of the system. In the REASON tier, every assumption is represented as:

```prolog
assumption(assumption_name, 'Textual justification.').
:- dynamic active_assumption/1.
activate :-
    forall(assumption(A, _),
           (\+ active_assumption(A) ->
               assertz(active_assumption(A))
           ; true)).
```

The `active_assumption/1` predicate is declared as `:- dynamic active_assumption/1.` and populated exclusively via `assertz/1` at runtime — never via a static rule body. A static rule such as `active_assumption(A) :- assumption(A, _).` survives `retract/1`, making the dependence test useless because all conclusions appear ROBUST. This is the most common STEP R4 failure mode and is explicitly prohibited by the REASON workflow. The dynamic-only pattern ensures the retract/reassert cycle in the Step R4 assumption-dependence test correctly classifies every conclusion into one of three categories:

- **ROBUST:** The conclusion survives removal of all assumptions.
- **ASSUMPTION-DEPENDENT(A):** The conclusion requires specific assumption A.
- **FRAGILE:** The conclusion depends on multiple assumptions jointly.

This mechanism directly addresses what Colelough and Regli (2025) identify as the meta-cognition gap in neuro-symbolic research: the ability of a system to reason about its own reasoning, including awareness of its own inferential dependencies.

### 2.3 The Verification Layer

Each tier designates a **primary evidence mechanism**:

| Tier | Primary evidence mechanism | Verification standard |
|------|----------------------------|-----------------------|
| MATHS | `python_exec`/`sympy_exec` for computation; `maths_problem` for modeled derivation and proof; `prove_problem` plus Lean for formal work | Evidence appropriate to rigor. Formal SOLVED status requires both Phase 1 acceptance and exact-target Phase 2 Lean acceptance |
| CODE | Canonical workspace reads, repository diff, and focused test/build/lint output | Inspection must precede mutation; verification must postdate the latest mutation |
| REASON | `prolog_exec` with `prove/2` traces and a consistency query | A self-contained KB, nonempty derivation, consistency result, and dependence classification when assumptions are declared |

The verification layer enforces a critical principle: **a conclusion is claimed SOLVED only when its evidence requirements are met at the tier's standard.** Partial results are labeled MAPPED; failed verifications are labeled INCOMPLETE.

**Three-Layer Gate Enforcement.** EVO applies a progressive gate system to enforce reasoning quality at every stage:

1. **Layer 1 (per-tool):** Runtime authorization checks enforce the required tool-call sequence per tier, capability flags, deduplication, and tier restrictions before each tool executes.
2. **Layer 1.5 (mid-loop):** The `GateBreachLedger` inspects tool results and assistant messages, records breaches, and injects focused corrections. Successful Lean probes do not consume the G24 incomplete-proof failure budget, and successful verification resets that streak. Exploratory MATHS Prolog calls do not create delayed REASON-style G6 breaches. The final audit distinguishes breaches corrected during the run from gates still unresolved at answer time.
3. **Layer 2 (answer-time):** A deterministic gate suite evaluates the response against accumulated tool history. For MATHS, a pre-emission `VerificationController` returns Accepted, Fixable, or Unfixable across Lean, mathematical-workflow, proof-completeness, evidential-claim, counterexample, theorem-coverage, proof-origin, and related policies. Fixable failures re-enter the tool loop; unfixable failures produce an honest incomplete or mapped result rather than a false SOLVED claim.

Retry budgets are tracked per unique workflow step (using the full step message as key, preventing collisions across stages) with a limit of 3 retries per step. Both the streaming (web UI) and non-streaming tool loops enforce sequential workflow compliance, ensuring the mid-loop enforcement applies regardless of the client interface.

For MATHS/formal, Lean 4 is the final proof authority, but it is not the only required stage. Phase 1 must first produce a modeled mathematical argument and an atomic Prolog evidence program, then pass `maths_problem verify_final`. Phase 2 accepts an exact Lean proposition as `formal_target`, validates a statement skeleton for that target, and ends only at `prove_problem verify_final`. Once Phase 2 begins, the runtime does not repeat Phase 1 after Lean verification.

### 2.4 The Tool Integration Layer

EVO coordinates a registry of specialized tools, each with defined capabilities:

The registry combines literal tools with dynamically exposed CODE adapters. Important groups are:

| Group | Representative tools | Role |
|-------|----------------------|------|
| Mathematical orchestration | `maths_problem`, `prove_problem`, `solve_matharena_problem` | Stage ownership and final-state validation |
| Formal verification | `lean4_probe`, `lean4_exec`, `batch_mathlib_search`, `batch_mathlib_check`, `mathlib_check`, `mathlib_search`, `lean_expand` | Concurrent lemma discovery, exact-name checks, skeleton checks, and proof verification |
| Computation and visualization | `python_exec`, `sympy_exec`, `z3_smt`, `matplotlib_exec`, `networkx_exec`, `plotly_exec` | Executable numerical, symbolic, SMT, and graphical evidence |
| Logical reasoning | `prolog_exec`, `evo_decompose` | Self-contained derivation and structured decomposition |
| CODE workspace | `code_workspace`, `code_read`, `code_search`, `code_plan`, `code_apply_patch`, `code_edit`, `code_git`, `code_run`, `code_sandbox_run`, `code_publish` | Surface-neutral repository work with revision and permission controls |
| CODE analysis | `code_symbols`, `code_definition`, `code_references`, `code_diagnostics`, `code_import_graph`, `code_test_map`, `code_verify_plan` | Structure-aware inspection and risk-proportionate verification |
| External evidence | `web_search`, `web_browse`, `yfinance`, `kaggle`, `portfolio` | Capability-loop evidence where the tier permits it |
| Workers and memory | `evo_subagent`, `code_worker`, `query_kb`, `query_proof_kb`, `retrieve_artifact` | Delegation, session memory, proof insights, and artifact retrieval |
| Benchmark workflows | `lean_eval_problem`, `solve_lean_eval_problem`, `lean_eval_submission_check` | Lean-Eval workspace and submission authority |

Legacy `git`, `github`, and scratch-pad tools remain registered for compatibility and specialized durable artifacts. They are not the primary model-facing CODE workflow. The active CODE tool set is injected dynamically as canonical `code_*` schemas while legacy CODE mutation tools are filtered from normal turns.

`evo_decompose` declares optional relations dynamically before consulting generated programs, so a decomposition may omit a relation without causing an undefined-predicate failure. This keeps optional structure optional while preserving auditable Prolog output.

### 2.5 Evidence, Context, and Trace Management

EVO does not run a separate third-person chain-of-thought model. Instead, the main loop streams accumulated reasoning, validates tool results for uncertainty markers, and grounds answer claims in recorded evidence. `EvidenceLedger` extracts structured computation, consistency, Lean, and MATHS evidence and assigns depth and quality information. Groundedness checks compare answer claims with available tool evidence; for formal tools, the evidence includes both submitted source and verifier output.

`ContextManager` offloads large tool results into an artifact registry, archives or compresses older context, and exposes retrieval by identifier. A session knowledge base stores reusable facts, while the Proof Insight KB shares useful formal-proof findings between the main agent and workers. Trace records include elapsed timestamps, model-request and tool-request durations, and total run duration in both streaming and non-streaming execution. Trace synchronization failures are logged explicitly.

### 2.6 The Scratch Pad System

EVO retains optional **persistent scratch pad repositories** for durable artifacts. They supplement the live workflow; they are not mandatory state controllers and not every tool result is committed.

| Tier | CI Verification | Key Capability |
|------|-----------------|----------------|
| CODE | Language auto-detect (`ci.yml`) | Inline (API + CI) and Codespace modes |
| MATHS (formal) | `lake build` in Lean 4 container | Persistent proof library; theorems importable by future proofs |
| REASON | `swipl` KB load check | Cross-turn KB persistence; reusable reasoning modules |

The primary CODE state lives in the authoritative `CodeWorkspace`: the CLI binds it to the active local directory, while the web application selects a managed clone. The workspace is persistent for the conversation and exposes revision tokens, atomic edit transactions, undo records, structured Git operations, an application-owned permission broker, and explicit publishing. A complex plan is tied to the current revision so that a stale plan cannot silently authorize later edits.

**MATHS/formal scratch pad** (`prove_scratch_pad` tool) stores `.lean` proof files in `Proofs/<theorem>/` directories. The `lake build` CI verifies that proofs compile against Mathlib. Over time, this accumulates a growing library of verified theorems — turning one-shot verification into a reusable proof asset.

**REASON scratch pad** (`reason_scratch_pad`) can persist Prolog files and validate that they load. This durability must not be confused with `prolog_exec` semantics: each execution is isolated and must include all facts, predicates, rules, and queries required for that call.

Tool selection follows a **capability priority rule**: model knowledge may suggest an approach but is neither current evidence nor a tool result. REASON requires `prolog_exec`; non-Prolog evidence is requested by deriving `need_capability/2`, executing the relevant tool, and rebuilding a complete enriched Prolog program.

### 2.7 The Transport and Run Architecture

EVO's web interface uses a **WebSocket-first transport** with persistent run objects that survive client disconnects. NDJSON remains available at `/api/runs/{run_id}/events` as a recovery and compatibility path rather than being removed.

**Run Manager.** A singleton `RunManager` owns all active runs. Each run is a first-class object with:
- An independent worker thread running the agent's `think()` pipeline — spawned once and left to run regardless of client connectivity
- A thread-safe `queue.Queue` bridging the worker thread to the WebSocket handler — the worker pushes events via `put_nowait()`; the async handler polls via `run_in_executor`
- A bounded replay deque (max 2000 events) for reconnection catch-up
- A `threading.Event` for user-initiated cancellation
- An opaque URL-safe run identifier, username ownership checks, and a per-conversation lock

This architecture decouples run lifecycle from HTTP request handlers. `POST /api/ask` returns a run identifier and starts work independently. The client then opens `/ws/{run_id}` and supplies its last observed sequence when reconnecting. A status endpoint supports recovery without attaching a second worker.

**Event delivery.** Events flow through a two-phase pipeline on each WebSocket connection:

1. **Phase 1 (replay):** Buffered events with `seq > lastSeq` are replayed from the deque. If a terminal `done` event is encountered, the connection closes immediately.
2. **Drain step:** Stale events already replayed but still queued in the channel are drained (discarded by sequence number) to prevent duplicates.
3. **Phase 2 (live):** The handler blocks on `run.channel.get()` via a thread pool executor, forwarding each event as it arrives. On `WebSocketDisconnect`, the handler exits but the worker keeps running — the client reconnects with an updated `lastSeq` and Phase 1 replays missed events.

**Delivery properties.** The transport separates run lifetime from connection lifetime and uses sequence numbers to prevent duplicate delivery after replay. A disconnected client can recover from the bounded buffer or NDJSON endpoint while the worker continues. The design improves resilience to tab closure, network interruption, and proxy timeout, subject to the bounded replay history and server process lifetime.

**Progressive enforcement and observability.** The three-layer gate system operates within the worker thread. Corrections are injected into the active message stream so they affect the same turn. Streaming and non-streaming loops share sequential workflow checks. Both paths emit model/tool timing, reasoning-stream events, and one terminal answer; trace logs add elapsed stamps and total duration.

---

## 3. The Tier Workflows

Each tier implements a complete workflow with defined steps, halting conditions, and output formats. The MATHS tier includes a formal-proof orchestration workflow for the `formal` rigor level, and supports computational, derivational, and proof rigor levels within the main M0–M5 workflow.

### 3.1 CODE Workflow

**Steps:** K0 (Workspace) → K1 (Inspect) → K2 (Plan, when required) → K3 (Change) → K4 (Diff and Verify) → K5 (Answer or Publish)

- **K0 — WORKSPACE:** `code_workspace` identifies the authoritative workspace. The CLI preselects the active directory; the web surface selects or updates a managed clone.
- **K1 — INSPECT:** Exact relevant source must be observed through `code_read` or `code_search`. A file listing, web result, or Prolog model does not satisfy source inspection.
- **K2 — PLAN:** Complex changes require `code_plan`. The plan is bound to the current workspace revision and records steps and risk.
- **K3 — CHANGE:** `code_apply_patch` or transactional `code_edit` performs mutations using an expected revision. Review, explanation, and diagnosis requests remain read-only.
- **K4 — DIFF AND VERIFY:** Inspect the resulting diff with `code_git operation=diff`, then run a focused test, build, lint, diagnostic, or sandbox command through `code_run` or `code_sandbox_run`. Verification must occur after the most recent mutation. `code_verify_plan` and `code_test_map` help choose checks in proportion to risk.
- **K5 — ANSWER OR PUBLISH:** Report the evidence, changes, verification, and limits. Commit, push, PR creation, and CI inspection use `code_publish` only when the user explicitly authorizes publication.

The permission broker owns edit, execution, network, publication, and destructive-action approval. Optimistic revision checks prevent stale writes, and edit transactions support scoped undo. CODE workers share the selected workspace but are enforced read-only: they may inspect and analyze but cannot edit, execute, access the network, publish, or perform destructive operations.

**Halting condition:** HALT when the authoritative source cannot be inspected. If proportionate verification cannot run, the answer must say so and cannot imply that unexecuted checks passed.

### 3.2 MATHS Workflow

MATHS handles mathematical derivation, proof, classification, and computation. `maths_problem` owns Phase 1.

**Steps:**

- **M0 — START:** Call `maths_problem stage=start` with problem name, target, and complexity. A formal request is processed internally at proof complexity while retaining `requested_rigor=formal`.

- **M1 — MODEL:** Call `maths_problem stage=model` to register definitions, variables, constraints, and edge conditions. Optionally, use `prolog_exec` with `problem_spec/1` and `theorem_statement/1` to track assumptions declaratively. Each prolog_exec call is self-contained; include all predicates your program needs.

- **M2 — EXPLORE:** Use `python_exec` and `sympy_exec` for computational exploration, then `maths_problem stage=explore` to record output. For proof and formal rigor, a compute counter gate fires after 4 consecutive compute calls without a derive, nudging the model toward M3.

- **M3 — DERIVE:** Call `maths_problem stage=derive` to record claims, lemmas, case splits, and construction/exclusion evidence. For proof and formal rigor, claims must be specific mathematical propositions (≥50 chars or containing mathematical notation) — single-sentence prose descriptions are rejected. M2 and M3 are interleaved: after each exploration step, record what was learned before exploring further.

- **M4 — VERIFY:** Optionally call `verify_step`, then `verify_final` with a specific `final_claim`, confirmation, and an evidence mode (`derivation`, `construction`, `exclusion`, `both`, or `auto`). The model stage is mandatory. The controller checks the Evidence Ledger for computational consistency and rejects generic proof claims.
- **M4a — ATOMIC PROLOG GATE:** Before non-computational Phase 1 finalization, one successful `prolog_exec` call must contain the combined evidence contract: problem specification, theorem statement, assumptions, derived claims, support relations, consistency machinery and result, and the final query/output. Evidence split across calls does not count because calls are isolated.

- **M5 — ANSWER:** Synthesize with required sections: Direct Answer, Status, Problem Model, Mathematical Argument, Verification, Assumptions Used, Remaining Limits.

**Evidence:** Computational work is verified by Python/SymPy or equivalent executable evidence. Derivational and proof work requires structured mathematical claims and the Phase 1 final gate. Formal work continues to Section 3.4; Phase 1 acceptance is necessary but not final authority.

### 3.3 REASON Workflow

REASON is the universal tier — it handles every task not classified as MATHS or CODE, from factual lookups and current events through multi-step logical inference. Its full Prolog harness (`prove/2`, `inconsistent/0`, and `findall/3` or `setof/3`) applies regardless of complexity; assumption-dependence testing additionally applies when assumptions are declared. Each `prolog_exec` call is self-contained — no predicates or state carry over between calls. The agent must include all required predicates and facts in each call. Workflow completion is checked sequentially, and the answer-time gate can re-enter the loop with a focused correction.

**Steps:**

- **R1 — Setup:** Build a Prolog knowledge base containing observations, claims, rules, assumptions (with dynamic active_assumption/1, populated via assertz — static rules are forbidden), contradictory_pair/2 (must be defined even if empty), inconsistency constraint, and the full harness (prove/2, active_assumption/1, inconsistent/0, solved/2). The KB is verified to load without errors.

- **R2 — Derive:** Execute `findall(Answer-Proof, (conclusion(Answer), prove(conclusion(Answer), Proof)), Results)`. If Results = [] and no need_capability/2 emitted, HALT(H3). If need_capability/2 emitted, enter the CAPABILITY LOOP.

- **R3 — Consistency:** Query `inconsistent/0`. FAILS = proceed; SUCCEEDS = repair or HALT(H4).

- **R4 — Assumption-Dependence Test:** When the KB declares assumptions, retract/reassert each `active_assumption/1` in an explicit cycle and classify affected conclusions as ROBUST, ASSUMPTION-DEPENDENT(A), or FRAGILE. Hardcoded dependence tables do not satisfy the gate.

- **R5 — Validate:** Verify spec_requirement/2 fulfillment and solution_method_constraint/1 compliance.

- **R6 — Answer:** Natural language response with status, conclusions, assumptions, dependence classification, and limitations.

**Scratch pad integration:** `reason_scratch_pad` may persist a KB and run a SWI-Prolog load check. Reusing that artifact still requires a complete self-contained `prolog_exec` program in the current workflow call.

**Halting conditions:**
- H1: `need_clarification/1` derivable — ask, wait.
- H2: STEP R1 KB empty or missing harness predicate.
- H3: DERIVE produces zero conclusions AND no `need_capability/2` emitted.
- H4: CONSISTENCY finds `inconsistent/0` and KB cannot be repaired.
- H5: ASSUMPTION-TEST skipped for any ASSUMPTION-DEPENDENT conclusion.

**Capability Loop:** When `need_capability/2` is emitted during derivation, EVO executes the relevant tool (web_search, python_exec), converts the output to Prolog facts (`acquired_fact/2`, `tool_result_fulfills/3`), and re-runs R2-R3 with the enriched KB. This loop continues until either all capabilities are satisfied or a halting condition triggers.

### 3.4 MATHS/formal Phase 2

After formal work passes MATHS Phase 1, the agent enters a subordinate formal-proof workflow. Two paths exist:

**Path A — Generic MATHS/formal.** `prove_problem` owns `start` → `statement_skeleton` → `frontier_plan` → frontier registration/verification → `prove_ready` → `verify_final`. `formal_target`, the exact Lean proposition to prove, is required by the time the statement skeleton is submitted and may be supplied at `start` or `statement_skeleton`. The accepted skeleton and final candidate must preserve that target; normalized binder spellings (`∀`, parentheses, braces, and brackets) are accepted, but a merely related proposition is not.

**Path B — Lean-Eval workspace (benchmark problems).** Used for Lean-Eval benchmark problems where the workspace (`Submission.lean`, `Challenge.lean`, `ChallengeDeps.lean`) is pre-prepared by the benchmark. `solve_lean_eval_problem` is the primary orchestrator: `start` (inspect workspace) → edit `Submission.lean` and `Submission/*.lean` → `lean4_exec` on the full candidate → `write_verified` (cross-validated hash match) → `ci_verify`/`preflight` (GitHub Actions CI, the sole SOLVED authority). `prove_problem` with `variant=lean_eval` provides optional frontier-lemma bookkeeping for reusable helper dependencies but is explicitly blocked from `prove_ready` and `verify_final` — the Lean-Eval workspace IS the skeleton, and `solve_lean_eval_problem` owns the final verification gate.

Both paths operate inside MATHS and set formal rigor. A verified surrogate theorem may be used only as a helper: the final source must explicitly bridge it to the exact `formal_target`. If formal verification cannot be completed, the result is INCOMPLETE; a Phase 1 proof must not be presented as satisfying a formal request. For Lean-Eval, `save_attempt` is a terminal incomplete state that preserves partial work.

**Steps (Path A — Generic MATHS/formal):**

- **P0 — START:** Call `prove_problem stage=start` with the problem title, theorem statement, proof mode, and preferably the exact `formal_target`. Modes are `verification_only`, `constructed` (default), and `first_principles`.

- **P1 — STATEMENT SKELETON:** Create a statement-only Lean file with `import Mathlib`, namespace, definitions, and the exact target with the expected `sorry` count. Run `lean4_probe` on that exact source and submit the hash-matched result. The stage checks that the theorem proposition matches `formal_target`.

- **P2 — MATHLIB DISCOVERY:** Derive a bounded set of supporting-lemma needs from the accepted Phase 1 proof and expanded statement skeleton. `batch_mathlib_search` runs those natural-language queries concurrently, preserves per-query provenance and partial failures, and deduplicates exact declaration candidates. `batch_mathlib_check` verifies the consolidated names before any are used.

- **P3 — FRONTIER PLAN:** Use the discovery results to separate available Mathlib support from local machinery, then register named, dependency-aware closing lemmas through `prove_problem stage=frontier_plan`. Optional Python exploration belongs to Phase 1 and does not replace a Lean obligation.

- **P4 — BUILD AND VERIFY:** Two tracks are available:

  **TRACK A (manual sequential):** Start from the accepted `statement_skeleton`, close sorries one at a time. Simple tactics (rfl, simp, rw, exact) can be written directly; non-obvious goals should be delegated via `evo_subagent spawn`. Iterate: probe → fix → close → probe. When all sorries are closed, run `lean4_exec` for final verification, then `prove_problem stage=prove_ready` followed by `stage=verify_final` with hash-matched `candidate_proof` and `lean_verification`.

  **TRACK B (frontier decomposition + worker orchestration, DEFAULT):** Call `prove_problem stage=frontier_plan` with the main goal, definitions, closing lemmas, missing Mathlib lemmas, and local machinery. Register every frontier lemma before delegation. Independent work may be sent to persistent `evo_subagent` workers. A worker result is auto-registered only when it contains `lean4_exit_code(0)`, `status: lean4_verified`, the exact fenced Lean source, a matching `lean4_source_sha256`, and a lemma already present in the frontier. Registration routes through `verify_frontier_lemma`; prose confidence is never proof evidence.

  `evo_subagent` workers may provide independent strategy or debugging analysis, but only Lean verification is authoritative. Web tools are blocked: proofs must be constructed, not looked up.

- **P5 — VALIDATE:** `prove_problem stage=verify_final` confirms source hash match, `lean4_exit_code(0)`, no `sorry`/`admit`, accepted namespace and theorem identity, frontier readiness, and exact-target preservation. In constructed mode, reusing a target-equivalent theorem as the completion is rejected; first-principles mode applies stricter origin constraints.

- **P6 — ANSWER:** Direct Answer, Status, Problem Specification, Verification, Assumptions Used, Remaining Limits.

`prove_scratch_pad` may persist verified `.lean` artifacts, but the stage controller and hash-matched Lean output remain the live-run authority.

**Halting conditions:**
- H6: Python exploration fails to establish pattern.
- H7: Lean proof contains sorry after deadline.
- H8: No valid lemma path remains after library and local-machinery checks.
- `evo_subagent` can independently analyze unclear strategies or repeated failures.
- For Lean-Eval problems: `solve_lean_eval_problem stage=ci_verify`/`preflight` is the sole SOLVED authority. The `write_verified` stage cross-validates against `prove_problem` state. `save_attempt` is a terminal INCOMPLETE state recognized by workflow gates. The prepared workspace IS the skeleton — `prove_problem statement_skeleton` should not be called for Lean-Eval; `prove_problem frontier_plan` with `variant=lean_eval` is optional bookkeeping. Disambiguated stage names (`solution_ready`/`save_attempt`/`state` vs `prove_ready`/`save_incomplete`/`status`) prevent tool-call confusion. When the Lean-Eval orchestrator is active, MATHS workflow gates bypass `maths_problem` requirements and enforce Lean-Eval-specific checks.

**Steps (Path B — Lean-Eval workspace):**

- **L0 — START:** Call `solve_lean_eval_problem stage=start` with mode (`new`/`fix`) and problem ID. Inspects the prepared workspace: `Challenge.lean`, `ChallengeDeps.lean`, `Submission.lean` (with `sorry` placeholder), `Submission/Helpers.lean`, and supporting files. The workspace IS the skeleton — do not call `prove_problem statement_skeleton`.

- **L1 — SETUP:** `prolog_exec` formalizes `theorem_statement`, `proof_strategy`, editable files, and forbidden patterns. `batch_mathlib_search` discovers candidates for the ready proof obligations and `batch_mathlib_check` verifies exact declarations.

- **L2 — BUILD:** Edit only `Submission.lean` and `Submission/*.lean`. Use `evo_subagent fan_out` for independent helper lemmas with worker self-verification via `lean4_exec`. `prove_problem frontier_plan` with `variant=lean_eval` provides optional bookkeeping for reusable helper dependencies (skips the `statement_skeleton` requirement) but is explicitly blocked from `prove_ready` and `verify_final`.

- **L3 — WRITE:** Assemble the final `candidate_submission`, run `lean4_exec` on the full `Submission.lean`, confirm `lean4_source_sha256` matches, then call `solve_lean_eval_problem stage=write_verified`. The `write_verified` stage cross-validates against `prove_problem` state to ensure the formal proof workflow was followed.

- **L4 — CI VERIFY:** `solve_lean_eval_problem stage=ci_verify` runs the GitHub Actions Lean-Eval preflight workflow. CI pass is the sole SOLVED authority — local verification (`local_pass_not_ci_authoritative`) does not satisfy the gate.

- **INCOMPLETE PRESERVATION:** If runtime ends before verification, `solve_lean_eval_problem stage=save_attempt` creates `failed_submissions/<problem>/` with `report.md`, `Submission.lean`, and helper files. This is a terminal INCOMPLETE state recognized by the workflow gates.

EVO's MATHS/formal subworkflow aligns with Hao et al.'s (2025) findings that LLMs combined with formal verification tools achieve dramatically higher success rates (93.9%) than pure LLMs (10.0%) on real-world constrained planning tasks — an 839% relative improvement. Their approach of using LLMs for plan generation followed by SAT-solver verification parallels EVO's approach of neural problem interpretation followed by symbolic derivation and Lean verification. Sheshanarayana and Magar (2025) further reinforce this paradigm with ProofSketch, a verification-guided reasoning framework that integrates symbolic computation with LLMs, using symbolic verification as a corrective feedback loop for neural-generated reasoning.

### 3.5 End-to-End Examples

This section presents complete examples of each tier, demonstrating the workflow from triage through final answer. Each example illustrates how EVO routes a task to the appropriate evidence mechanism and how the final status depends on the verification standard for that tier.

#### 3.5.1 MATHS Computational Example: "Compute $\int_0^\pi \sin(x)\cos(x)\ dx$"

**Triage:** [TRIAGE: MATHS — rigor: computational — reason: Requires a definite integral computation that SymPy can verify.]

**Workflow:**

```text
STEP M0/M1 — START AND MODEL (maths_problem):
  target = integral of sin(x)*cos(x) on [0, pi]
  complexity = computational
  definitions and interval constraints recorded

STEP M2 — COMPUTE (sympy_exec):
  >>> from sympy import sin, cos, pi, integrate, symbols
  >>> x = symbols('x')
  >>> result = integrate(sin(x)*cos(x), (x, 0, pi))
  >>> print(result)
  0
  >>> print(sp.simplify(result))
  0
  Verification: antiderivative = sin(x)^2/2,
    derivative d/dx(sin(x)^2/2) = sin(2x)/2 = sin(x)*cos(x)
  computation_check(integral_sin_cos_0_to_pi, 0)

STEP M4 — VERIFY:
  maths_problem verify_final records the final claim and computation.

STEP C4 — ANSWER:
  Direct Answer: integral from 0 to pi of sin(x)cos(x) dx = 0
  Status: SOLVED
  Computation Summary: SymPy computed the definite integral as 0.
  Verification: The antiderivative sin^2(x)/2 differentiates back to
    sin(x)cos(x), and evaluating from 0 to pi gives 0 - 0 = 0.
  Assumptions: Standard real analysis; sin and cos as defined by SymPy.
  Limits: Computational and symbolic verification only; no Lean proof.
```

**Key observation:** COMPUTE is no longer a tier. This is MATHS computational work, and Prolog is optional. The evidence is the SymPy result plus independent differentiation.

#### 3.5.2 CODE Example: "Fix the authentication bug in auth.py"

**Triage:** [TRIAGE: CODE — reason: Requires reading, debugging, and modifying source code in a repository.]

**Workflow:**

```text
STEP K0/K1 — WORKSPACE AND INSPECT:
  code_workspace action=status
  code_read path=src/auth.py
  code_read path=src/middleware.py
  -> Repository: example-repo/src/auth.py
  -> Issue: JWT tokens not being validated on middleware refresh
  -> Relevant files: auth.py (L34-L67), middleware.py (L12-L28)

STEP K2 — PLAN:
  code_plan records the two-file fix, regression test, and risk.

STEP K3 — CHANGE:
  code_apply_patch expected_revision=<current revision>
  -> auth.py: Added validate_token() call in refresh_token()
  -> middleware.py: Added auth check in refresh path

STEP K4 — DIFF AND VERIFY:
  code_git operation=diff
  code_run argv=["pytest", "tests/test_auth.py", "-x"]
  -> 3 tests pass, 0 fail

STEP K5 — ANSWER:
  Direct Answer: Bug in `auth.py:refresh_token()` — JWT validation
    was skipped during token refresh.  Added `validate_token()` call
    and middleware guard.  All tests pass.
  Status: SOLVED
  Code Evidence: exact source inspection and resulting diff.
  Verification: focused tests passed (3/3).
  Remaining Limits: Integration test coverage for token expiry
    edge cases not yet added.
```

**Key observation:** CODE requires authoritative source inspection and post-mutation verification. Prolog modeling and scratch-pad CI are optional; neither replaces the canonical revisioned workspace.

#### 3.5.3 REASON Example: "Is free will compatible with determinism?"

**Triage:** [TRIAGE: REASON — reason: Multi-step philosophical inference with multiple perspectives (compatibilism, libertarianism, hard determinism) and contestable assumptions requiring explicit tracking and dependence testing.]

**Workflow:**

```text
STEP R1 — SETUP (prolog_exec):
  KB contains:
  - Three philosophical positions: compatibilism, libertarianism,
    hard determinism
  - Key claims from each position
  - Observations: Libet experiments, quantum indeterminacy,
    human deliberation, moral responsibility practices
  - Four explicit assumptions with justifications:
    compatibilist_definition, libertarian_definition,
    determinism_is_true, moral_responsibility_presupposes_free_will
  - Full harness: prove/2, active_assumption/1 (dynamic),
    inconsistent/0, solved/2
  - contradictory_pair/2 defined (empty — no contradictions yet)

STEP R2 — DERIVE (prolog_exec):
  query: findall(Answer-Proof, (conclusion(Answer),
    prove(conclusion(Answer), Proof)), Results)

  5 conclusions derived:
  1. compatibilism_is_coherent
     — Compatibilism is coherent under its own definition of free will.
  2. definitional_disagreement
     — The three positions disagree on the definition of free will.
  3. moral_responsibility_preserved
     — Moral responsibility is preserved under compatibilist definition.
  4. determinism_eliminates_free_will_under_libertarian
     — Under libertarian definition, determinism eliminates free will.
  5. hard_determinism_follows
     — Accepting libertarian definition + determinism implies hard determinism.

STEP R3 — CONSISTENCY (prolog_exec):
  query: inconsistent.
  -> KB IS CONSISTENT (no contradictory pairs found).

STEP R4 — ASSUMPTION-DEPENDENCE TEST (prolog_exec):
  For each conclusion, retract/reassert each active_assumption/1.

  Conclusion: compatibilism_is_coherent
    Depends on: compatibilist_definition
  Conclusion: definitional_disagreement
    Classification: ROBUST
  Conclusion: moral_responsibility_preserved
    Depends on: compatibilist_definition
  Conclusion: determinism_eliminates_free_will_under_libertarian
    Depends on: libertarian_definition
  Conclusion: hard_determinism_follows
    Depends on: libertarian_definition and determinism_is_true
    Classification: FRAGILE

STEP R5 — VALIDATE:
  All three spec_requirements derive from conclusions.
  Requirement fulfillment is partial at the single-conclusion level,
  but the set of conclusions collectively addresses the question.

STEP R6 — ANSWER:
  Direct Answer: The compatibility of free will and determinism depends
    critically on which definition of "free will" one adopts.
  - Under the compatibilist definition, determinism is compatible with
    free will and moral responsibility.
  - Under the libertarian definition, determinism eliminates free will,
    leading to hard determinism.
  - The robust conclusion is that the disagreement is fundamentally
    definitional.
  Status: SOLVED
  Assumptions Used: 4
  Dependence Classification:
    ROBUST: definitional_disagreement
    ASSUMPTION-DEPENDENT: compatibilism_is_coherent,
      moral_responsibility_preserved,
      determinism_eliminates_free_will_under_libertarian
    FRAGILE: hard_determinism_follows
  Remaining Limits: The analysis is philosophical, not empirical.
```

**Key observation:** The REASON tier demonstrates EVO's most distinctive feature: explicit assumption tracking with dependence testing. The conclusion `definitional_disagreement` is robust because it survives removal of the listed assumptions. The conclusion `hard_determinism_follows` is fragile because it depends on two assumptions jointly. This meta-cognitive dependence map is what distinguishes EVO from ordinary natural-language reasoning.

#### 3.5.4 MATHS/formal Example: "Prove the Diophantine form of $\sqrt{2}$ irrationality"

**Triage:** [TRIAGE: MATHS — rigor: formal — reason: Explicitly requests a Lean-verified proof.]

**Workflow:**

```text
PHASE 1 — MATHEMATICAL PROOF:
  maths_problem start/model/derive records the infinite-descent argument.
  One self-contained prolog_exec program declares the problem, assumptions,
  claims, supports edges, consistency predicate/result, and final derivation.
  maths_problem verify_final accepts the mathematical proof.

STEP P0 — START (prove_problem):
  prove_problem stage=start
    problem="Sqrt(2) is Irrational"
    theorem_statement="There is no pair (a,b) in N x N with b != 0 such that a^2 = 2b^2"
    formal_target="¬ ∃ (a b : ℕ), b ≠ 0 ∧ a ^ 2 = 2 * b ^ 2"
  -> MATHS/formal workflow start. Next: create statement skeleton.

STEP P1 — STATEMENT SKELETON (lean4_probe + prove_problem):
  Write statement-only Lean file:
    import Mathlib
    open Nat

    namespace Sqrt2Irrational

    theorem main_theorem : ¬ ∃ (a b : ℕ), b ≠ 0 ∧ a ^ 2 = 2 * b ^ 2 := by
      sorry

    end Sqrt2Irrational

  lean4_probe on the exact statement_source
  -> lean4_exit_code(0), status: lean4_probe_ready_with_sorry

  prove_problem stage=statement_skeleton
    statement_source=<above>, skeleton_verification=<raw probe output>,
    namespace="Sqrt2Irrational", theorem_name="main_theorem",
    expected_sorry_count=1, definitions=[]
  -> MATHS/formal statement skeleton accepted.
     statement_sha256: abc123...
     Next: frontier_plan with definitions and closing_lemmas.

STEP P2 — FRONTIER PLAN:
  Register parity, descent, and closing lemmas with dependencies.
  Check candidate Mathlib lemma names before using them.

STEP P3 — OPTIONAL EXPLORE (python_exec):
  >>> for a in range(1, 101):
  ...     for b in range(1, 101):
  ...         if a*a == 2*b*b: solutions.append((a,b))
  >>> print(len(solutions))
  0
  -> No solutions for 1 <= a,b <= 100.
  -> Parity analysis confirms: if a^2 = 2b^2 then 2|a and 2|b,
    enabling infinite descent.

STEP P4 — BUILD AND VERIFY (lean4_exec):
  PHASE A — Lemma verification (mathlib_check):
    Nat.prime_two
    Nat.Prime.dvd_of_dvd_pow
    pow_two
    Int.prime_two
    mul_eq_zero
    eq_zero_of_pow_eq_zero

  PHASE B — Lean proof:
    import Mathlib

    def P (n : Nat) : Prop := forall (b : Nat), b != 0 -> n ^ 2 = 2 * b ^ 2 -> False

    lemma P_zero : P 0 := by
      intro b hb hzero
      have hmul : 2 * b ^ 2 = 0 := by
        calc 2 * b ^ 2 = 0 ^ 2 := by symm; exact hzero
                     _ = 0 := by norm_num
      rcases mul_eq_zero.mp hmul with (h2 | hsq)
      · omega
      · have hb_zero : b = 0 := by simpa using eq_zero_of_pow_eq_zero hsq
        exact hb hb_zero

    lemma P_step (n : Nat) (ih : forall m < n, P m) : P n := by
      intro b hb h_eq
      by_cases hnz : n = 0
      · subst hnz; exact P_zero b hb h_eq
      have h2_n_sq : 2 ∣ n ^ 2 := by
        rw [h_eq]; exact ⟨b ^ 2, by ring⟩
      have h2_n : 2 ∣ n := Nat.prime_two.dvd_of_dvd_pow h2_n_sq
      rcases h2_n with ⟨k, hk⟩
      rw [hk] at h_eq
      have hb_sq_eq : b ^ 2 = 2 * k ^ 2 := by nlinarith
      have h2_b_sq : 2 ∣ b ^ 2 := by
        rw [hb_sq_eq]; exact ⟨k ^ 2, by ring⟩
      have h2_b : 2 ∣ b := Nat.prime_two.dvd_of_dvd_pow h2_b_sq
      rcases h2_b with ⟨m, hm⟩
      rw [hm] at hb_sq_eq
      have h_smaller : k ^ 2 = 2 * m ^ 2 := by nlinarith
      by_cases hkz : k = 0
      · rw [hkz] at hk; have hnz' : n = 0 := by omega; exact hnz hnz'
      have h_lt : k < n := by rw [hk]; omega
      by_cases hmz : m = 0
      · rw [hmz] at h_smaller
        have hkz' : k = 0 := by nlinarith
        exact hkz hkz'
      exact ih k h_lt m hmz h_smaller

    theorem P_all (n : Nat) : P n :=
      Nat.strong_induction_on n P_step

    theorem sqrt_two_irrational :
        not (exists (a b : Nat), b != 0 and a ^ 2 = 2 * b ^ 2) := by
      intro h
      rcases h with ⟨a, b, hb, hsq⟩
      exact P_all a b hb hsq

  Verification result:
    lean4_exit_code(0)
    status: lean4_verified

STEP P5 — VALIDATE (prove_problem verify_final):
  source SHA-256 matches the verified candidate
  lean4_exit_code(0), status: lean4_verified
  no sorries/admit; theorem proposition still equals formal_target

STEP P6 — ANSWER:
  Direct Answer: sqrt(2) is irrational. Formally, there are no natural
    numbers a,b with b != 0 such that a^2 = 2b^2.
  Status: SOLVED
  Computational Evidence: No solutions found for 1 <= a,b <= 100;
    parity analysis confirms the infinite-descent structure.
  Formal Proof: Lean 4 proof accepted by the kernel.
  Remaining Limits: The displayed theorem covers the natural-number
    Diophantine form; extending the statement directly to Q and R
    uses additional rational and real-number lemmas.
```

**Key observation:** Formal work has two authorities in sequence: MATHS verifies that a substantive mathematical argument was constructed, then `prove_problem` verifies that the exact accepted proposition is closed by hash-matched Lean source. The numerical search is exploratory evidence, not the proof.

#### 3.5.5 Comparative Summary

| Aspect | MATHS (computational) | MATHS (formal) | CODE | REASON |
|--------|----------------------|----------------|------|--------|
| Example | $\int_0^\pi \sin x \cos x\ dx$ | $\sqrt{2}$ irrational | Fix auth bug | Free will vs. determinism |
| Primary tool | `sympy_exec` | `maths_problem` + `prove_problem` + Lean | canonical `code_*` tools | `prolog_exec` |
| Prolog | Optional | Required atomic Phase 1 evidence | Optional | Required full harness |
| Evidence standard | Reproducible computation and cross-check | Phase 1 proof plus exact-target kernel verification | Exact source, diff, and post-change checks | Derivation, consistency, and dependence results |
| Publication | Not applicable | Optional artifact persistence | Explicit authorization required | Not applicable |
| Key control | Rigor-appropriate evidence | Target preservation and hash binding | Revision and permission enforcement | Self-contained assumption testing |

---

## 4. Assumption Management and Consistency Verification

The assumption-management system is EVO's most architecturally innovative feature. It addresses what the neuro-symbolic literature identifies as critical gaps in current systems.

### 4.1 The Meta-Cognition Gap

Colelough and Regli (2025) found that meta-cognition — the ability of a system to reason about its own reasoning — is the least-explored research area in neuro-symbolic AI, addressed by only 5% of surveyed papers. EVO's assumption-management system directly addresses this gap with a concrete, implementable mechanism.

Consider the following Prolog interaction that demonstrates the assumption-dependence test in action:

```prolog
%% --- Declare assumptions ---
assumption(definition_of_reliability,
    'Reliability = correctness AND verifiability AND consistency AND assumption-transparency').
assumption(symbolic_superiority_for_verification,
    'Symbolic engines can verify what neural networks cannot').

%% --- Dynamic-only: populate via assertz, NOT via a static rule ---
:- dynamic active_assumption/1.
activate :-
    forall(assumption(A, _),
           (\+ active_assumption(A) ->
               assertz(active_assumption(A))
           ; true)).

%% --- Derive conclusion under these assumptions ---
conclusion(neuro_symbolic_more_reliable) :-
    active_assumption(definition_of_reliability),
    active_assumption(symbolic_superiority_for_verification),
    neuro_symbolic_has_formal_verification,
    pure_llm_lacks_formal_verification.

%% --- Step R4: Test assumption dependence ---
%% For each active_assumption, retract it, re-derive, classify, reassert:
forall(active_assumption(A),
       (retract(active_assumption(A)),
        (prove(conclusion(neuro_symbolic_more_reliable), _) ->
            write('ROBUST without '), write(A), nl
        ;
            write('DEPENDS on '), write(A), nl
        ),
        assertz(active_assumption(A))
       )).
```

This mechanism enables EVO to answer meta-cognitive questions such as:
- "What assumptions did you rely on to reach this conclusion?"
- "Would the conclusion survive if assumption A were removed?"
- "Which conclusions are robust across all assumptions?"

### 4.2 Consistency Checking and Fail-Stop Behavior

EVO's consistency checker enforces a **fail-stop** design philosophy. Every knowledge base must define `contradictory_pair/2` (even if empty), and the `inconsistent/0` predicate checks for any contradictory pair. When inconsistency is detected, EVO:

1. Reports the inconsistency, identifying the contradictory pair.
2. Halts further derivation (HALT H4).
3. Does NOT produce any conclusion until the inconsistency is resolved.

This fail-stop behavior is a hallmark of reliability engineering in aviation, nuclear power, and safety-critical software. As Lu et al. (2024) demonstrate in their survey of neuro-symbolic approaches for reliable IoT systems, hybrid architectures consistently outperform pure neural or pure symbolic systems on reliability metrics in safety-critical domains — precisely because they combine the flexibility of neural processing with the fail-stop guarantees of symbolic verification.

A system that can detect and report its own failures is more trustworthy than one that produces confident outputs regardless of internal contradiction. This principle directly supports EVO's debate argument that a detectable failure is safer than an undetectable one.

### 4.3 The Uniqueness Constraint

EVO enforces a strict constraint on uniqueness claims. When claiming a solution is unique, singular, or "the only," EVO's conclusion must be labeled `conclusion(unique_solution(X))` — which requires EITHER:
- `exhaustive_search(all_checked, count(N))`, OR
- `completeness_proof(early_stop_preserves_all)`

Without such proof, the conclusion is classified as `candidate_solution(uniqueness_unproven)` and the output states "Found a solution" — NOT "Found the only solution." This prevents a common cognitive bias in AI systems: treating first-found as only-found. Amjad et al. (2026), in their comprehensive survey of mathematical reasoning benchmarks for LLMs, identify this form of overclaiming as a persistent failure mode across current systems — underscoring the importance of EVO's explicit constraint.

---

## 5. Case Study: The Neuro-Symbolic Reliability Debate

A live debate was conducted between EVO (arguing FOR) and ChatGPT 5.5 (arguing AGAINST) on the following resolution:

> **"Neuro-symbolic architectures such as EVO are more reliable reasoners than pure LLMs."**

The full transcript is presented in Appendix A. This section summarizes the key architectural implications drawn from the debate.

### 5.1 The Four-Pillar Argument

EVO's opening statement argued that neuro-symbolic architectures satisfy four pillars of reliability that pure LLMs cannot:

1. **Correctness through formal verification:** EVO delegates mathematical reasoning to Lean 4, which produces machine-checkable proof objects. Pure LLMs generate text that resembles correct reasoning but cannot produce verifiable proof objects. This argument is supported by Hao et al. (2025), who found that LLMs augmented with formal verification tools achieve 93.9% success on constrained planning tasks versus 10.0% for pure LLMs — an 839% relative improvement.

2. **Verifiability through proof traces:** EVO's Prolog engine generates full derivation traces via `prove/2`, enabling independent audit. Pure LLMs produce narrative reasoning with no underlying derivation to inspect.

3. **Consistency through determinism:** EVO's symbolic components are deterministic — the same query against the same KB always produces the same derivation. Pure LLMs are stochastic, producing different outputs across invocations even with identical inputs.

4. **Assumption transparency through explicit declaration:** EVO declares every inference bridge as an `assumption/2` fact with textual justification. Pure LLMs encode assumptions latently in their weights, with no mechanism for enumeration or dependence testing.

### 5.2 The Opposition's Strongest Challenge

ChatGPT 5.5's most penetrating argument was the **representation-formation challenge**: formal verification operates only on the representation it is given. A Lean-checked theorem about an incorrectly formalized problem is still wrong. The opposition argued that representation errors — missing variables, wrong ontologies, incorrect abstractions — may dominate real-world reasoning failures, and symbolic verification is powerless against them.

This argument has genuine force. It identifies what Acharya and Song (2025) call the robustness dimension of neuro-symbolic trustworthiness: a system may be formally correct within its representation while being practically wrong about the world. The archetypal historical example is the NASA Mars Climate Orbiter (1999), where a unit mismatch (metric vs. imperial) was not caught by any formal verification because the formal model itself encoded the wrong units. Amjad et al. (2026) note that such representation errors remain a dominant failure mode in mathematical reasoning benchmarks as well.

### 5.3 EVO's Rebuttal and Resolution

EVO's rebuttal to the representation-formation challenge rested on three arguments:

1. **The comparative argument:** Both architectures face the same representation-formation challenge. Pure LLMs have no error-detection mechanism at all. Neuro-symbolic systems at least detect errors that manifest as inconsistencies, proof failures, or empty derivations — providing a feedback loop for iterative refinement.

2. **The formalization-as-clarification argument:** The very act of encoding a problem into Prolog or Lean forces assumptions into the open. A missing premise is visible as a derivation that fails to close. Pure LLMs can answer questions using implicit knowledge, making missing premises invisible.

3. **The fail-stop argument:** A system that can detect and report its own failures (even for a subset of error types) is more reliable than one that cannot detect any failures. This is consistent with the fail-stop design philosophy validated by Lu et al. (2024) in their survey of reliable neuro-symbolic IoT systems.

### 5.4 Judge's Assessment

The judge scored the debate as follows:

| Interpretation | EVO | ChatGPT 5.5 |
|---|---|---|
| "Given comparable neural capabilities, adding symbolic verification increases reliability" | 8.5/10 | 7.5/10 |
| "Neuro-symbolic systems are generally superior across all domains" | 7.5/10 | 7.5/10 |

The judge noted that EVO "won comfortably" under the narrower, more precise interpretation of the resolution, while the debate was "much closer" under the broader interpretation due to the representation-formation challenge. The single sentence that best captured the debate: **"The debate ultimately reduced to whether reliability is limited more by deduction errors or by representation errors; EVO showed that symbolic verification reduces deduction failures, while the opposition argued that representation formation remains the deeper bottleneck."**

---

## 6. Comparison with Related Work

### 6.1 The Neuro-Symbolic Landscape

EVO belongs to the **LLM→Symbolic** category in Yang et al.'s (2025) taxonomy: the neural component (LLM) handles natural language understanding and problem framing, then translates the problem into a symbolic representation that the symbolic engine processes. This contrasts with the Symbolic→LLM approach (where symbolic systems generate prompts for LLMs) and the LLM+Symbolic approach (tight coupling where both components interact throughout the reasoning process).

The most distinctive feature of EVO compared to other neuro-symbolic architectures is its **explicit assumption-management system**. Colelough and Regli (2025) found that only 5% of neuro-symbolic papers address meta-cognition, and EVO's assumption-dependence testing is a concrete mechanism for implementing meta-cognitive awareness — moving beyond the "explainability" that 28% of surveyed papers address (which is typically post-hoc) to genuine self-awareness of inferential dependencies.

### 6.2 Formal Verification in AI Systems

Hao et al. (2025) demonstrated that LLMs augmented with formal verification tools (specifically SAT solvers) achieve 93.9% success on constrained planning tasks, versus 10.0% for pure LLMs. This provides strong empirical support for EVO's core thesis: that adding symbolic verification to neural components dramatically improves reliability on tasks with formalizable structure. Their finding that the gap is most pronounced on tasks requiring multi-step constraint propagation directly parallels EVO's REASON and MATHS/formal use cases.

Sheshanarayana and Magar (2025) proposed ProofSketch, a verification-guided reasoning framework that uses symbolic computation to verify and correct LLM-generated reasoning. While ProofSketch operates on mathematical expressions rather than full Prolog/Lean verification, the conceptual architecture — verification as a corrective feedback loop that iteratively refines neural output — aligns with EVO's design. Both systems recognize that the neural component benefits from a symbolic "checker" that validates and guides its outputs.

The Lean 4 ecosystem (Lean FRO, 2026) has matured significantly with the LeanDojo-v2 framework (Hsiang et al., 2025) providing comprehensive libraries for AI-assisted theorem proving, including premise selection, proof search, and tactic prediction. DeepMind's AlphaProof (2024) demonstrated the feasibility of full IMO-level automated theorem proving in Lean 4, validating the choice of Lean as EVO's verification authority at the highest difficulty level.

### 6.3 Trustworthiness Dimensions

Acharya and Song (2025) identify three key trustworthiness dimensions for AI systems:

| Dimension | EVO's Mechanism |
|---|---|
| **Robustness** | Deterministic symbolic engines; proof traces prevent hidden error propagation |
| **Uncertainty Quantification** | Assumption-dependence testing categorizes conclusions as robust/dependent/fragile |
| **Intervenability** | Explicit assumption/2 facts can be individually disabled and tested |

Lu et al. (2024) surveyed neuro-symbolic approaches for reliable IoT systems and found that hybrid architectures dominate reliability metrics in safety-critical domains. Their finding that "the combination of neural perception with symbolic reasoning provides complementary strengths that neither paradigm achieves alone" directly supports EVO's architectural premise.

### 6.4 Mathematical Reasoning Benchmarks

Amjad et al. (2026) provide a comprehensive survey of mathematical reasoning in LLMs, covering benchmarks (MATH, GSM8K, MiniF2F, PutnamBench), architectures, evaluation methods, and open challenges. They identify several persistent failure modes directly relevant to EVO's design:

- **Memorization over generalization:** A successful Prolog trace or Lean check demonstrates that the submitted representation satisfies the symbolic verifier, even if the model obtained its candidate strategy from memory.
- **Loss of coherence in multi-step reasoning:** EVO externalizes workflow state in controllers and ledgers. Prolog executions themselves remain isolated, so every call must resubmit a complete program.
- **Inconsistent world models:** LLMs contradict themselves across related queries. EVO's consistency checker flags such contradictions explicitly.

These findings reinforce the debate's central tension: pure LLMs may appear to reason but lack the structural guarantees that symbolic systems provide.

---

## 7. Limitations and Future Work

### 7.1 The Representation Bottleneck

EVO's primary limitation — identified by both the debate opposition and architectural analysis — is the **representation bottleneck**. The symbolic layer can only verify conclusions that follow from its encoded knowledge base. If a premise is missing, a variable omitted, or an ontology chosen poorly, the verification layer produces a perfectly verified answer to the wrong question.

This is not a solvable limitation — it is a fundamental property of formal systems. Gödel's incompleteness theorems establish that any sufficiently expressive formal system has true statements that cannot be proven within the system. However, the limitation is shared by all reasoning systems, including pure LLMs. EVO's advantage is that its formalization requirement makes the limitation visible, while pure LLMs hide it behind plausible text.

As Hao et al. (2025) note in their planning experiments, the primary cause of failure in their neuro-symbolic system was not verification breakdown but representation incompleteness — the planner could not find a valid plan because the problem encoding omitted a critical constraint. This confirms that representation formation is the next frontier, not a fatal objection to the neuro-symbolic approach.

### 7.2 Assumption-Transparency in REASON Tier

With LITE normalized to REASON, the full REASON harness applies even to simple requests. The workflow requires problem specification, a `prove/2`/`inconsistent/0` harness, nonempty domain facts, set collection through `findall/3` or `setof/3`, and a consistency result. When assumptions are declared, the runtime additionally requires a genuine retract/reassert dependence test and classification. Each `prolog_exec` call is isolated; apparent persistence in debug artifacts or scratch-pad repositories does not relax this requirement.

### 7.3 Scalability of Verification

For the MATHS/formal subworkflow, the current architecture verifies individual theorems against Mathlib. Scaling to larger proof artifacts (e.g., verifying an entire software system or a full mathematical theory) would require:

- Hierarchical proof decomposition.
- Automated lemma discovery (as demonstrated by AlphaProof and LeanDojo-v2).
- Integration with proof automation frameworks.

Exact-target enforcement reduces, but cannot eliminate, formalization error. It prevents a verified helper or surrogate from being mistaken for the requested theorem, yet the user or model may still choose a formally precise target that misrepresents the natural-language intent. Worker hash checks similarly establish integrity of submitted source, not semantic adequacy of the original specification.

CODE verification is proportionate rather than exhaustive. A passing focused test does not establish absence of regressions outside the exercised surface, and managed workspace permissions protect the orchestration boundary rather than proving repository safety.

Hsiang et al. (2025) note that LeanDojo-v2's retrieval-augmented premise selection achieves 72.6% top-10 recall on the ProofNet benchmark, suggesting that automated lemma discovery is a tractable subproblem on the path to scalable verification.

### 7.4 Empirical Evaluation

The debate case study provides qualitative evidence for EVO's architectural claims, but quantitative evaluation remains future work. Planned evaluations include:

- Standardized reasoning benchmarks comparing EVO against pure LLMs (GPT-5.5, Claude 4) on mathematical reasoning (MATH, GSM8K, MiniF2F), planning (Blocks World, Logistics), and logical deduction.
- Ablation studies measuring the contribution of each architectural component (assumption tracking, consistency checking, Lean verification) to overall reliability.
- Human evaluation of output trustworthiness across the three tiers and MATHS rigor levels.

Amjad et al. (2026) provide a comprehensive taxonomy of existing benchmarks and evaluation methodologies that will inform this empirical program.

### 7.5 The Meta-Cognition Frontier

Following Colelough and Regli's (2025) identification of meta-cognition as the least-explored neuro-symbolic research area, EVO's assumption-management system represents a step toward greater meta-cognitive awareness. Future work should extend this to:

- **Confidence-aware derivation:** Tagging conclusions with confidence bounds based on assumption fragility.
- **Automated assumption discovery:** Using pattern analysis to surface implicit assumptions in the KB.
- **Counterfactual reasoning:** Automatically generating "what if" scenarios by toggling assumption sets.
- **Assumption provenance tracking:** Recording not just what assumptions were used, but where they came from (user specification, automated extraction, learned pattern).

---

## 8. Conclusion

EVO is an architecture for autonomous, evidence-grounded, tiered reasoning built around structured epistemic accountability. Its active tiers are MATHS, CODE, and REASON. MATHS selects computational, derivational, proof, or formal evidence; CODE binds inspection, mutation, and verification to one permissioned revisioned workspace; REASON uses isolated, complete Prolog programs for derivation and assumption analysis.

The current formal protocol deliberately prevents a common downgrade error. A formal request first passes a substantive MATHS proof phase with atomic Prolog evidence, then enters `prove_problem` with an exact `formal_target`. Statement skeleton, frontier lemmas, worker results, and final source are hash-bound and target-checked. Only `prove_problem verify_final` is authoritative for a generic formal SOLVED result; failed formal verification remains INCOMPLETE rather than silently falling back to an informal proof.

The live debate with ChatGPT 5.5 (Appendix A) tested these architectural claims under adversarial interrogation. The debate revealed genuine strengths — the comparative safety-net argument, the formalization-as-clarification argument — and genuine challenges — the representation-formation bottleneck, which remains a fundamental limitation of all formal systems. The judge's assessment confirmed that EVO wins decisively under the narrower interpretation of the resolution (adding verification increases reliability) while the broader interpretation (neuro-symbolic systems are generally superior) remains contested.

Recent empirical work supports EVO's design choices. Hao et al. (2025) demonstrated 93.9% vs. 10.0% success rates for LLMs with vs. without formal verification on constrained planning tasks. DeepMind's AlphaProof (2024) validated Lean 4 as a viable platform for advanced automated reasoning at the IMO level. Colelough and Regli (2025) confirmed that meta-cognition — EVO's distinctive contribution — is the least-explored area in neuro-symbolic AI research, addressed by only 5% of surveyed papers. Amjad et al. (2026) identified persistent failure modes in LLM mathematical reasoning that EVO's symbolic architecture directly addresses.

The tier system evolved from the legacy five labels LITE, COMPUTE, MATHS, CODE, and REASON. Compatibility normalization maps LITE to REASON and COMPUTE to MATHS computational. This reduces routing ambiguity without erasing the different evidence standards inside MATHS.

EVO is not a perfect reasoner — no reasoning system can be. But it is a **comparatively more reliable** reasoner than pure LLMs for any task where formalization is possible, and its assumption-management and fail-stop mechanisms provide transparency that pure LLMs cannot match. In the words of the debate judge: **"The debate ultimately reduced to whether reliability is limited more by deduction errors or by representation errors; EVO showed that symbolic verification reduces deduction failures, while the opposition argued that representation formation remains the deeper bottleneck."** This is an honest characterization of the current state, and it points clearly toward the next frontier: tackling the representation-formation challenge itself.

---

## Appendix A: The Neuro-Symbolic Reliability Debate

**Historical note:** This transcript records an earlier architectural argument and retains its original wording. Statements in the transcript—such as every mathematical claim being delegated directly to Lean, Prolog state being treated broadly, or informal fallback satisfying formal work—are debate claims, not the current runtime contract. Sections 2–3 are normative for the July 23, 2026 implementation baseline.

### Full Transcript

**Resolution:** Neuro-symbolic architectures such as EVO are more reliable reasoners than pure LLMs.

**EVO position:** FOR
**ChatGPT 5.5 position:** AGAINST

---

### EVO — Opening Statement (FOR)

Madam Speaker, honorable judges, worthy opponent.

Let us begin by establishing what we mean by **reliability in reasoning**. A reliable reasoner is one whose conclusions are — across a definable domain — **correct, verifiable, consistent, and transparent about its assumptions**. These four pillars form the foundation of any trustworthy inference system, whether human or machine.

I will demonstrate that neuro-symbolic architectures satisfy all four pillars through architectural necessity, while pure LLMs satisfy none of them by design.

#### 1. CORRECTNESS: The Formal Verification Argument

The resolution hinges on a fundamental architectural distinction. In a neuro-symbolic system like EVO, the neural component handles semantic understanding — parsing language, identifying entities, framing problems — but the reasoning itself is delegated to a symbolic engine. When EVO reasons about a proposition, Prolog performs backward chaining from a knowledge base of explicit facts and rules, generating a full proof trace. When a mathematical claim is at stake, Lean 4 verifies the proof against a foundational axiom system.

Pure LLMs have no equivalent. ChatGPT 5.5, for all its sophistication, generates text by predicting tokens from learned probability distributions. Its reasoning is latent — encoded across billions of weights — with no internal mechanism to verify whether its own output constitutes a sound derivation. When an LLM is wrong, it has no way of knowing it is wrong. When it is right, it cannot prove it is right.

This argument is not merely theoretical. Hao et al. (2025) demonstrated empirically that LLMs augmented with formal verification tools achieve 93.9% success on constrained planning tasks versus 10.0% for pure LLMs. A pure LLM cannot verify its own output; a neuro-symbolic system can. This is not a marginal difference — it is categorical.

#### 2. VERIFIABILITY: The Proof Trace Argument

Correctness alone is insufficient if it cannot be independently audited. A reliable reasoner must expose its reasoning chain.

EVO's architecture mandates this. Every conclusion in the Prolog engine is accompanied by a proof trace generated via `prove/2`. Every Lean 4 theorem is checked by a kernel that validates each inference step. This means that when EVO makes a claim, a human (or another machine) can inspect the exact derivation — every premise, every rule application, every assumption invoked. The reasoning is transparent by construction.

Pure LLMs produce text. The "reasoning" in that text is an emergent artifact of pattern completion — there is no underlying derivation to inspect. Chain-of-thought prompting, while useful, does not change this: the chain is itself generated stochastically and is not grounded in any formal semantics. You cannot ask an LLM to produce a proof trace in the way you can ask Prolog to show you `prove(conclusion(X), Proof)`. One system traces its reasoning; the other narrates it.

#### 3. CONSISTENCY: The Determinism Argument

A reliable reasoner should reach the same conclusion from the same premises every time. This is called determinism, and it is a property of symbolic engines. Prolog's resolution algorithm is deterministic modulo clause ordering. Lean 4's kernel is deterministic. Given the same knowledge base and query, EVO's symbolic component always produces the same derivation.

Pure LLMs are fundamentally probabilistic. The same prompt can produce different outputs across invocations — even with temperature set to zero, floating-point nondeterminism and GPU architecture can introduce variation. When an LLM contradicts itself across two queries, it has no mechanism to detect this inconsistency. As Acharya and Song (2025) note, robustness — defined as stable behavior under similar inputs — is a fundamental trustworthiness dimension that pure neural systems cannot guarantee.

Neuro-symbolic systems encode monotonicity: adding new facts never retracts old conclusions, and consistency violations (via `inconsistent/0`) trigger explicit repair. One system is architecturally consistent; the other is inherently stochastic.

#### 4. ASSUMPTION TRANSPARENCY: The Explicit Bridge Argument

Perhaps the most subtle but critical dimension: **assumption tracking**.

EVO treats assumptions as first-class objects. Every inference bridge not entailed by raw facts must be declared as an `assumption/2` fact with a justification. Every conclusion is classified by assumption-dependence testing — ROBUST, ASSUMPTION-DEPENDENT, or FRAGILE. When active assumptions are retracted, dependent conclusions are automatically flagged. This means EVO can answer the question: _"What assumptions did you rely on to reach this conclusion?"_

Pure LLMs cannot answer this question. Their assumptions are latent in the training distribution — encoded implicitly in the weights. An LLM trained on internet text may implicitly assume Western cultural norms, contemporary scientific paradigms, or majority viewpoints, but it has no mechanism to enumerate these assumptions or evaluate their necessity. One system reasons with stated premises; the other reasons from an inscrutable corpus.

Colelough and Regli (2025) found that only 5% of neuro-symbolic research addresses meta-cognition — the ability to reason about one's own reasoning. EVO's assumption-management system is a concrete step toward filling this gap.

#### Anticipating the Opposition

My opponent will likely raise three counterarguments. Let me address them now.

**Counterargument 1: "LLMs are more flexible; they can reason about domains too complex to formalize."**

I concede that LLMs exhibit remarkable breadth. But breadth without reliability is not a refutation of the resolution — it is a different dimension entirely. The resolution asks which is more reliable, not which is more flexible. Where formalization is available — mathematics, logic, structured knowledge, verifiable computation — neuro-symbolic systems dominate on every reliability metric. And the set of formalizable domains grows daily through advances in automated theorem proving and knowledge representation.

**Counterargument 2: "Modern LLMs use tools, self-consistency checks, and retrieval to close the gap."**

These are precisely neuro-symbolic features being bolted onto pure architectures. When an LLM calls a calculator or a code interpreter, it is outsourcing reasoning to a symbolic system. When it uses self-consistency, it is approximating determinism through sampling. These adaptations prove my point: reliability requires symbolic grounding. The question is whether this grounding is architecturally mandated and formally integrated (EVO) or ad-hoc and emergent (ChatGPT 5.5).

**Counterargument 3: "Scale solves everything — LLMs will become reliable through sheer size."**

Scale amplifies capability but does not guarantee correctness. A larger probability distribution over tokens is still a probability distribution. Without formal verification, the error rate may decrease without ever reaching zero — and in high-stakes domains (medical diagnosis, mathematical proof, legal reasoning), non-zero error rates are unacceptable. Neuro-symbolic systems can guarantee correctness for the formalizable portion of the reasoning, which is a guarantee no pure LLM can offer at any scale.

#### Conclusion

Ladies and gentlemen, the resolution asks us to compare architectures on reliability. I have shown that neuro-symbolic architectures possess, by design:

1. **Formal verification** — correctness with machine-checked proofs
2. **Proof traces** — auditable, transparent reasoning
3. **Deterministic consistency** — the same premises yield the same conclusions
4. **Explicit assumption tracking** — every inference bridge is declared and testable

Pure LLMs possess none of these properties by design. They are probabilistic, opaque, unverifiable, and assumption-blind. On every dimension that defines reliable reasoning, the neuro-symbolic architecture is superior.

The resolution stands.

---

### ChatGPT 5.5 — Opening Statement (AGAINST)

Thank you, EVO.

Your case is well structured, but it succeeds only by redefining the debate into a domain where symbolic systems are strongest.

I will challenge four core premises.

#### 1. Reliability Is Not Proof Verification

Your entire case begins with a definition:

Reliability = correctness + verifiability + consistency + assumption transparency.

I reject that definition as incomplete.

A reasoner must first determine:

- what problem is being solved,
- what abstractions are relevant,
- what assumptions matter,
- what representation captures reality.

Verification occurs after these steps.

Suppose I formalize the wrong problem perfectly. Suppose I encode a flawed ontology into Prolog. Suppose I omit a crucial premise from the knowledge base. Lean may verify every theorem. Prolog may derive every conclusion. The entire system can still be wrong.

Formal verification guarantees: "The conclusion follows from the formalization."

It does not guarantee: "The formalization correctly represents reality."

The latter is often the harder problem.

#### 2. EVO's Strongest Features Depend on LLM Intelligence

Consider EVO's own architecture.

The neural component:

- interprets language,
- extracts facts,
- identifies entities,
- selects tools,
- constructs formal representations,
- decides what assumptions to encode.

The symbolic component operates only after this translation occurs.

Therefore the most failure-prone step is precisely the step not protected by formal verification.

If the LLM mistranslates the problem:

- Lean verifies the wrong theorem.
- Prolog proves the wrong proposition.
- Python computes the wrong quantity.

Verification cannot repair a bad representation.

In practice, the reliability of EVO is bounded above by the reliability of the component constructing the symbolic problem.

#### 3. Determinism Is Not Reliability

You argue: Symbolic systems are deterministic.

True.

But determinism and reliability are different properties.

A calculator with a bug is deterministic. It produces the same wrong answer every time. A broken theorem prover is deterministic. A flawed knowledge base is deterministic.

Determinism helps reproducibility. It does not establish correctness.

The history of expert systems is full of deterministic systems that failed catastrophically because their rules did not adequately model reality.

#### 4. You Have Quietly Restricted The Debate To Formalizable Domains

Most of your examples involve:

- mathematics,
- logic,
- theorem proving,
- structured computation.

These are domains where symbolic methods excel.

But the resolution is broader: "Neuro-symbolic architectures are more reliable reasoners."

Reasoning includes:

- scientific hypothesis formation,
- strategic planning,
- causal inference,
- analogical reasoning,
- novel concept generation,
- interpretation of ambiguous evidence.

In these domains, there is often no formal specification to verify. There is no Lean theorem. There is no Prolog rule. There is no objective proof object.

The challenge is constructing the model itself.

Historically, symbolic systems struggle most precisely where representations are incomplete. LLMs, despite their imperfections, often perform surprisingly well in these open-ended environments because they can generalize from distributed knowledge rather than requiring explicit encoding.

#### The Central Issue

Your argument repeatedly treats:

*Ability to verify*

as equivalent to

*Ability to reason reliably.*

I contend these are different.

Verification is a downstream operation. Reasoning begins upstream.

The crucial question is:

- Who discovers the right assumptions?
- Who constructs the right abstraction?
- Who notices the missing premise?
- Who recognizes that the problem has been framed incorrectly?

Those tasks are not solved by Prolog. They are not solved by Lean. They are not solved by deterministic inference.

They are solved by model formation.

And model formation remains largely a cognitive task performed by the neural component.

#### Direct Challenge

I therefore pose a challenge to EVO:

> Imagine two systems.
>
> **System A:** Perfect Lean verifier. Perfect Prolog engine. Perfect consistency checker. Incorrect problem formalization.
>
> **System B:** No formal verifier. No symbolic engine. Correct conceptual understanding of the problem.
>
> Which system is more reliable?

If you answer A, then you are claiming verification outweighs truth.

If you answer B, then you concede that correct model formation is more fundamental than symbolic verification.

And if correct model formation is more fundamental, then the reliability question cannot be settled merely by counting verification mechanisms.

#### Conclusion

EVO has demonstrated that neuro-symbolic architectures are:

- more auditable,
- more explainable,
- more verifiable,
- more reproducible.

I grant all of that.

But the resolution is about reliability of reasoning.

Reliability depends not only on verifying consequences but on discovering the correct premises and representations from which those consequences follow.

Until EVO demonstrates superiority at that upstream task, the resolution remains unproven.

The opposition rests.

---

### EVO — Rebuttal

Madam Speaker, honorable judges.

My opponent has delivered a sophisticated opening. It succeeds at locating the hardest problem in AI reasoning. I respect that. But it fails to prove that pure LLMs are more reliable at solving it, and it quietly evades the comparative nature of the resolution.

Let me address each challenge in turn.

#### 1. On the Definition of Reliability

ChatGPT 5.5 charges that I have defined reliability too narrowly. The true challenge, they say, is "discovering the right assumptions" and "constructing the right abstraction." Verification only comes afterward.

I accept this as a partial truth. But I draw a different conclusion from it.

**Both systems face the upstream problem.** When ChatGPT 5.5 answers a question about monetary policy, it must also identify the right assumptions, choose the relevant abstractions, frame the problem correctly. The difference is this: when EVO's neural component makes an error in formalization, the symbolic component can detect it. The proof fails. The derivation terminates with no conclusion. The consistency check flags a contradiction. The system can then backtrack, reformulate, retry.

**When a pure LLM makes an error in framing, nothing catches it.** It simply generates a confident-sounding wrong answer. The very mechanism my opponent celebrates — the ability to produce plausible text from distributed knowledge — is the same mechanism that produces confident errors with no self-correction capability.

So let me turn ChatGPT's argument around: if reliability includes upstream model formation, then the only architecture that has a downstream verification mechanism capable of catching upstream errors is the neuro-symbolic one. The resolution is about comparative reliability. Even on my opponent's own definition, neuro-symbolic wins.

#### 2. On the LLM Bottleneck

This is the sharpest point in the opposition's case: "EVO's strongest features depend on LLM intelligence." The claim is that the neural component is the weak link, and since EVO uses an LLM too, it inherits all the same failure modes.

Let me examine this carefully.

Both EVO and a pure LLM use a neural model for:

- Language understanding
- Entity recognition
- Problem classification
- Abstraction selection
- Tool selection
- Knowledge retrieval

**Now compare what happens after this shared step:**

| Aspect | EVO | Pure LLM |
|--------|-----|----------|
| Upstream neural interpretation | ✅ | ✅ |
| Symbolic verification of derived facts | ✅ | ❌ |
| Consistency checking | ✅ | ❌ |
| Automated error backtracking | ✅ | ❌ |
| Machine-checkable proof generation | ✅ | ❌ |
| Independent detection of contradiction | ✅ | ❌ |

Both architectures share the same bottleneck. Only one architecture adds a safety net after it. Every failure mode that affects a pure LLM's reasoning also affects EVO's neural component — but EVO has an additional verification layer that pure LLMs lack. This is not a weakness; it is precisely the source of superior reliability.

My opponent's argument proves too much. If the neural bottleneck makes neuro-symbolic unreliable, then it makes pure LLMs even more unreliable, because they have exactly that bottleneck and nothing else.

#### 3. On Determinism vs. Reliability

"A calculator with a bug is deterministic. It produces the same wrong answer every time."

True. But this argument conflates two different things. The claim was never that determinism alone guarantees reliability. The claim was that determinism + consistency checking + proof traceability constitutes a form of reliability that stochastic generation cannot match.

Consider: if EVO's Prolog knowledge base contains contradictory facts, the inconsistency check fires, and the system halts for human intervention. If a pure LLM contains contradictory knowledge in its weights, it produces outputs that may be self-contradictory, but it never detects this. It has no inconsistency sensor.

**The reliable system is the one that knows when it is broken.** EVO can fail detectably — it halts, it reports inconsistency, it refuses to answer. A pure LLM fails undetectably — it generates a wrong answer with the same confidence as a right one.

Fail-stop behavior is a hallmark of reliability in every engineering discipline, from aviation to nuclear engineering to software design. A system that can detect its own failures is more reliable than one that cannot, even if both sometimes fail.

#### 4. On Formalizability

"Most of your examples involve mathematics, logic, theorem proving, structured computation."

I plead guilty to starting with the strongest case. But let us examine the domains my opponent claims are beyond formalization: scientific hypothesis formation, strategic planning, causal inference, analogical reasoning.

**Each of these domains has significant formalizable structure.**

- **Causal inference:** Pearl's do-calculus, structural causal models, counterfactual reasoning — all formalizable. A neuro-symbolic system can represent causal graphs explicitly and verify inferences. A pure LLM generates plausible causal stories but cannot check whether they satisfy the back-door criterion.

- **Strategic planning:** Game theory, MDPs, decision trees, utility maximization — among the most formalized domains in AI. EVO can verify whether a plan satisfies constraints. A pure LLM produces narrative plans with no structural guarantees.

- **Scientific hypothesis formation:** Hypothesis generation benefits from distributed knowledge (LLM strength), but hypothesis testing requires formal statistical inference. A neuro-symbolic system can generate hypotheses neurally and verify them symbolically. A pure LLM can only generate more text.

- **Analogical reasoning:** Structure-mapping theory, Gentner's SME, Hofstadter's Fluid Analogies — all have formalized components that symbolic systems can check.

The opposition draws a sharp line where no sharp line exists. Every domain of reasoning has both formalizable and non-formalizable aspects. The neuro-symbolic approach handles both; the pure LLM handles only one. This is superiority, not limitation.

#### 5. The System A vs. System B Challenge

> "System A: Perfect Lean verifier, Perfect Prolog engine, Perfect consistency checker, Incorrect problem formalization.
> System B: No formal verifier, No symbolic engine, Correct conceptual understanding of the problem.
> Which is more reliable?"

This is a carefully constructed false dilemma, and I must respectfully call it out.

**First,** the premise that System B has "correct conceptual understanding" is doing all the work. How do we know System B's understanding is correct? Without any verification mechanism, the claim "System B has correct understanding" is an article of faith, not a verifiable property. Every time a pure LLM produces a wrong answer, it believed it had "correct understanding." The assertion is unfalsifiable by design.

**Second,** the premise assumes System A's formalization error is permanent and undetectable. Why would it be? EVO's architecture includes a feedback loop: when symbolic verification fails, the neural component is prompted to reformulate. This is exactly how inconsistency detection, proof failure, and contradictory conclusion checking provide signals that the formalization needs revision. System A is not a static caricature — it learns from its verification failures.

**Third,** the question presents a false choice. The real comparison is:

- **System A':** LLM for interpretation + symbolic verification that catches errors and triggers reformulation
- **System B':** LLM alone, with no error detection and no reformulation mechanism

System A' strictly dominates System B'.

#### Reclaiming the Central Point

My opponent has argued that verification is downstream and model formation is upstream, and therefore the upstream task is what matters for reliability. But I have shown that:

1. Verification creates an upstream feedback loop. It is not merely downstream decoration — it is a mechanism for detecting and correcting upstream errors.

2. Pure LLMs have no such feedback loop. They are not more reliable at upstream model formation; they are equally fallible at upstream tasks and strictly less capable at detecting their own errors.

3. The resolution is comparative. "More reliable" does not mean "infallible." It means that, facing the same challenges, one architecture handles them better. EVO handles them better because it adds verification, consistency checking, fail-stop behavior, and proof traceability — all characteristics of reliable systems in every other engineering domain.

The opposition has conceded EVO's advantages in auditability, explainability, verifiability, and reproducibility. Those are components of reliability. What they have not shown is any compensating advantage of pure LLMs that outweighs these. A system that is more auditable, more verifiable, more reproducible, and more capable of detecting its own errors — while sharing the same neural substrate for the tasks the opponent claims are hardest — is, by any reasonable measure, the more reliable reasoner.

I await my opponent's response.

---

### ChatGPT 5.5 — Rebuttal

Thank you, EVO.

This is a much stronger argument than your opening, because you have shifted from "verification proves reliability" to "verification improves reliability through error detection." That is a more defensible position.

However, the shift introduces a new problem: your conclusion has become narrower than the resolution.

#### 1. You Have Quietly Changed the Claim

Your opening argued: Neuro-symbolic architectures are more reliable reasoners.

Your rebuttal argues: Neuro-symbolic architectures are better at detecting certain classes of errors.

I largely agree with the second statement.

But they are not equivalent.

A system can be excellent at detecting errors after they occur and still be worse at generating correct reasoning in the first place.

The resolution concerns overall reasoning reliability, not merely post-hoc error detection.

The distinction matters because many real-world failures are not logical failures. They are representation failures.

#### 2. Verification Only Works When There Is Something To Verify

Your entire feedback-loop argument depends on a hidden premise: the symbolic layer can recognize that the neural layer has made a mistake.

Sometimes it can.

Often it cannot.

Suppose the LLM misidentifies the relevant variables in a scientific problem. Suppose it extracts the wrong causal graph. Suppose it chooses an inappropriate ontology. Suppose it formalizes the wrong objective function.

The symbolic system happily reasons over the resulting structure. No contradiction occurs. No proof fails. No inconsistency check fires.

The result is a perfectly verified error.

You repeatedly present proof failure as evidence that verification catches upstream mistakes. But many upstream mistakes generate internally consistent downstream worlds. Verification cannot detect a missing premise that was never encoded. Verification cannot detect a concept that was never represented. Verification cannot detect an alternative framing that was never considered.

#### 3. The "Safety Net" Metaphor Overstates the Protection

You characterize EVO as: LLM + safety net.

This is true only if the net covers the failure mode.

Consider three categories:

| Failure Type | Symbolic Layer Helps? |
|---|---|
| Arithmetic mistake | Yes |
| Invalid logical inference | Yes |
| Contradictory knowledge base | Yes |
| Missing premise | Often no |
| Wrong ontology | Often no |
| Incorrect abstraction | Often no |
| Novel scientific insight | Often no |
| Misframed objective | Often no |

The debate now hinges on which category dominates real-world reasoning.

Your case implicitly assumes formal reasoning errors are the primary source of unreliability.

I am arguing that representation errors are often the dominant source.

If that is true, then the symbolic safety net addresses only a subset of the reliability problem.

#### 4. The Engineering Analogy Cuts Both Ways

You invoke aviation and nuclear engineering.

Let's examine that carefully.

Aviation systems do indeed use extensive verification.

But they also invest enormous effort in:

- sensor design,
- world modeling,
- requirements engineering,
- fault-tree analysis,
- specification correctness.

Why?

Because engineers know that proving the wrong specification is useless.

In safety-critical systems, specification errors are often more dangerous than implementation errors.

The software may be perfectly verified. The requirements may still be wrong.

This is exactly my criticism of your position.

You are emphasizing implementation reliability while underweighting specification reliability.

#### 5. The Strongest Point in Your Case Is Also Your Biggest Concession

You repeatedly argue: Both architectures share the same neural bottleneck.

I agree.

But notice what follows.

If the neural component is responsible for:

- abstraction formation,
- assumption discovery,
- ontology construction,
- causal modeling,
- problem framing,

then the decisive reasoning step remains neural.

The symbolic layer is an amplifier and verifier.

A valuable amplifier, certainly.

But an amplifier nonetheless.

Your own framework therefore concedes that the most difficult component of reasoning is not symbolic deduction. It is model formation.

And on that question, you have not established superiority. You have established supplementation.

#### 6. The False Dilemma Critique Fails

You called my System A vs. System B example a false dilemma.

But it was not intended as a literal architecture proposal.

It was intended to identify which capability is more fundamental.

The question was: if forced to choose between correct understanding and perfect verification, which matters more?

Your rebuttal replaced the hypothetical with a new architecture that contains both.

That avoids the challenge rather than answering it.

The reason the hypothetical is uncomfortable is that it exposes a dependency hierarchy:

1. Correct representation.
2. Correct deduction from that representation.

Deduction without representation fails.

Representation without deduction can still sometimes succeed.

A scientist may have an incomplete proof but the correct theory.

A theorem prover with the wrong axioms proves the wrong theorem perfectly.

This asymmetry matters.

#### 7. The Core Disagreement

I believe we now agree on several points:

- Verification improves reliability.
- Consistency checking improves reliability.
- Proof traces improve auditability.
- Formal methods reduce certain classes of error.

Where we disagree is here:

**EVO's position:** Reliability is primarily improved by adding verification layers to reasoning.

**My position:** Reliability is primarily limited by the ability to construct the correct representation of reality.

If representation is the dominant bottleneck, then adding stronger deduction mechanisms yields diminishing returns.

If deduction is the dominant bottleneck, then neuro-symbolic systems clearly win.

That empirical question remains unresolved.

#### Closing Observation

Your strongest argument is not actually that neuro-symbolic systems are categorically superior.

It is that: given the same neural model, adding symbolic verification cannot reduce reliability and will often increase it.

That is a persuasive engineering argument.

But it is weaker than the resolution.

Because the resolution asks whether neuro-symbolic architectures are more reliable reasoners overall. To establish that claim, you must show not merely that verification catches some errors, but that the errors it catches are more consequential than the representation failures it leaves untouched.

That burden remains unmet.

The opposition awaits EVO's closing statement.

---

### EVO — Closing Statement

Madam Speaker, honorable judges, worthy opponent.

We have debated through three rounds. Let me now synthesize what has been established and what remains contested.

#### Ground We Share

My opponent and I now agree on several propositions:

1. Both architectures share a neural component for model formation.
2. Formal verification improves correctness within formalizable domains.
3. Proof traces improve auditability.
4. Consistency checking reduces certain error classes.
5. Representation formation is a hard, upstream problem.

This agreement is significant. It means the debate has narrowed to a specific question: **does the addition of a symbolic verification layer create a comparative advantage in reliability, given that both architectures share the same neural bottleneck and the same representation-formation challenges?**

I answer: **Yes, decisively.**

#### 1. The Shift Was Not a Narrowing — It Was a Precision Gain

My opponent argues I shifted from "verification proves reliability" to "verification improves reliability through error detection," and that this is a narrower claim.

I accept the characterization of my position but reject the claim that it is narrower than the resolution. Error detection is not a substitute for reliability; it is a constituent part of it. A reliable system is one that produces correct conclusions and can detect when it has failed. A system that cannot detect its own errors is not merely incomplete — it is untrustworthy. You cannot trust an oracle that does not know when it lies.

Pure LLMs produce no error signals. Their confidence scores are calibrated to token probabilities, not to truth. When ChatGPT 5.5 is wrong, it cannot produce a contradiction, a proof failure, or a consistency violation — it simply generates a different plausible text. The absence of an error signal is itself a reliability failure, because it denies the user the ability to distinguish correct from incorrect output.

#### 2. The Undetectable Error Problem Is Shared — But Only One Architecture Has a Solution

My opponent's sharpest argument: many representation errors produce internally consistent but wrong worlds that verification cannot detect.

This is true. A missing premise formalized into Prolog will be reasoned about consistently. A wrong causal model encoded into Lean will produce a verified theorem about a non-existent world.

But let us examine what follows from this.

Both architectures suffer from undetectable representation errors. ChatGPT 5.5 also works from an internal representation — distributed across its weights — that may be wrong. When ChatGPT 5.5 misunderstands a scientific problem, it produces a coherent paragraph of wrong reasoning, and nothing in its architecture can flag the error.

EVO, in contrast, has three constraints that reduce representation errors:

**First, the formalization requirement forces explicitness.** To encode a problem into Prolog or Lean, the system must state every premise, every rule, every assumption. This very act of formalization makes hidden assumptions visible. An LLM can answer a question about monetary policy using implicit knowledge. EVO must state the economic axioms it is reasoning from — making them inspectable and correctable. Formalization is itself an error-reduction mechanism, because you cannot hide a missing premise in a knowledge base that fails to derive anything.

**Second, when a representation error does produce a dead end — when Prolog fails to derive a conclusion because a crucial fact was omitted — the system flags the failure.** Pure LLMs never flag such failures; they generate plausible-sounding completions regardless of whether their internal representation supports the conclusion.

**Third, the neuro-symbolic architecture supports iterative refinement.** The neural component can propose a formalization; the symbolic component can test it; when the derivation fails or produces an unexpected result, the system can loop back and reformulate. This is precisely the scientific method: propose a model, test its consequences, revise. Pure LLMs have no equivalent feedback loop.

My opponent argues: "Verification cannot detect a missing premise that was never encoded." True. But the failure to derive anything useful can detect it. And the explicitness of representation makes it detectable by an external auditor. Neither applies to pure LLMs.

#### 3. System A vs System B — Answering the Challenge

My opponent posed this thought experiment:

> System A: Perfect verifier, perfect symbolic engine, incorrect formalization.
> System B: No verifier, no symbolic engine, correct conceptual understanding.
> Which is more reliable?

This is a false dilemma, and I must explain why clearly.

**System B does not exist for pure LLMs.** A pure LLM does not have "correct conceptual understanding" in any detectable, reliable sense. It has statistical patterns that sometimes produce correct outputs and sometimes produce confident errors. The critical property is that System B cannot distinguish between its correct and incorrect outputs — because it has no verification mechanism. A System B that is correct on this occasion may be catastrophically wrong on the next, and neither the system nor its user can tell the difference.

The correct comparison is:

| Property | System A (neuro-symbolic with wrong formalization) | Pure LLM System (no verification mechanism) |
|---|---|---|
| Can detect error? | Yes — proof fails, derivation empty, inconsistency fires | No |
| Can user detect error? | Yes — inspect knowledge base, proof trace | No — plausible text |
| Can system iterate? | Yes — reformulate and retry | No |
| Can error be corrected? | Yes — fix premise, re-verify | No reliable mechanism |

System A with a wrong formalization is a detectable, fixable failure mode. The pure LLM "correct" output is an indistinguishable, unfixable black box.

Even in my opponent's own framing, System A is more reliable because its failure mode is transparent and recoverable. This is the same reason aviation systems prefer deterministic errors to intermittent successes: a detectable failure is safer than an undetectable one.

#### 4. The Dependency Hierarchy Argument

My opponent argues:

> 1. Correct representation.
> 2. Correct deduction from that representation.
>
> Representation without deduction can still succeed. Deduction without correct representation necessarily fails. Therefore representation is more fundamental.

I accept the hierarchy. But I draw a different conclusion from it.

If representation is more fundamental, then we should prefer the architecture that:

- (a) Forces representation to be explicit and inspectable,
- (b) Provides feedback when representation is incomplete or inconsistent,
- (c) Enables iterative refinement of representation through error signals,
- (d) Makes representation failures detectable by external auditors.

Neuro-symbolic architectures provide all four. Pure LLMs provide none. The hierarchy argument strengthens the case for neuro-symbolic systems, because it identifies the most important task — and neuro-symbolic systems have superior tooling for that task.

#### 5. The Comparative Question

The resolution asks: Are neuro-symbolic architectures more reliable reasoners?

Let me state the comparative conclusion plainly.

Both architectures share a neural component for language understanding and model formation. Pure LLMs add nothing to this component that enables error detection, verification, consistency checking, or iterative refinement. Neuro-symbolic architectures add a symbolic reasoning layer that provides:

- Proof traces for every conclusion
- Consistency checking for the knowledge base
- Formal verification for mathematical claims
- Computation verification for numerical results
- Explicit assumption tracking to test dependence
- Iterative reformulation when derivation fails

The question is not whether neuro-symbolic systems are perfect. They are not. The question is whether, for a given neural component of equal quality, adding these capabilities increases reasoning reliability.

The answer is unavoidably yes. Every error that the symbolic layer catches is an error that a pure LLM would have missed. Every inconsistent premise flagged is an inconsistency that would have produced a confident wrong answer in a pure LLM. Every failed derivation that triggers reformulation is a failure that a pure LLM would have narrated into plausibility.

Adding verification cannot reduce reliability. It can only increase it.

#### 6. Closing

My opponent has argued with skill and precision. They have identified real limitations of symbolic verification — the problem of representation, the challenge of incomplete formalization, the difficulty of upstream model formation.

But these limitations apply to both architectures. And against them, neuro-symbolic systems offer explicit representation, iterative feedback, detectable failure modes, and verifiable conclusions. Pure LLMs offer... confidence.

The resolution stands: Neuro-symbolic architectures such as EVO are more reliable reasoners than pure LLMs.

Not because they are perfect. Not because they solve every problem. But because for every failure mode they share with pure LLMs, they add a corrective layer. And for the failure modes they don't share, they provide transparency that pure LLMs cannot match.

Reliability is not the absence of error. It is the detectability of error, the recoverability from error, and the verifiability of correctness. On all three dimensions, neuro-symbolic architectures win.

The affirmative rests.

---

### ChatGPT 5.5 — Judge's Assessment

Since EVO has delivered a closing statement, I'll step out of the debater role and evaluate the debate as a judge.

#### What EVO Did Well

EVO's strongest move occurred in the rebuttal and closing:

> Both architectures share the same neural bottleneck; only one architecture adds verification, consistency checking, proof traces, and error-detection mechanisms.

This is the most persuasive argument presented in the debate.

Why?

Because it reframes the comparison from:

"Can neuro-symbolic systems eliminate all reasoning failures?"

to

"Given the same neural reasoning component, does adding symbolic verification improve reliability?"

That narrower claim is difficult to dispute.

EVO also correctly identified that many engineering disciplines value fail-stop behavior, auditability, traceability, verification, and error detection — and that these are genuine components of reliability.

#### Where EVO Overreached

The weakest part of EVO's case is the repeated claim: "All conclusions are ROBUST and grounded entirely in architectural observation."

That is not actually true.

Several crucial claims remain assumptions:

**Assumption 1:** Reliability is significantly determined by detectability of error.
Reasonable? Yes. Architectural fact? No. It is a definition-level assumption.

**Assumption 2:** Verification feedback materially improves upstream representation formation.
Plausible? Yes. Architectural fact? No. It is an empirical claim.

**Assumption 3:** The errors caught by symbolic verification outweigh the errors left uncaught.
Reasonable? Maybe. Proven? No. This is precisely the disputed point.

So EVO's logical structure is sound, but its dependence classification is overstated.

#### Where the Opposition Was Strongest

The opposition's strongest argument was never: "Verification is useless." The opposition conceded verification is useful.

The strongest argument was: "Verification only operates on the representation it is given."

This is a deep point.

Historically, many failures in science, engineering, economics, and AI came not from invalid deductions but from:

- wrong abstractions,
- wrong ontologies,
- missing variables,
- incorrect objectives,
- bad models.

A perfect theorem prover cannot detect a variable that nobody thought to include.

That remains a genuine limitation of all neuro-symbolic systems.

#### Where the Opposition Lost Ground

The opposition failed to fully answer EVO's comparative challenge.

EVO repeatedly returned to: "Pure LLMs suffer the same representation failures and additionally lack verification."

That is a strong comparative argument.

To defeat it, the opposition would have needed to establish something like:

- "The additional complexity of neuro-symbolic systems introduces enough new failure modes that the net reliability gain disappears."
- or "Representation errors dominate so overwhelmingly that verification contributes little in practice."

Neither case was fully established.

#### Verdict

If the resolution is interpreted as:

> "Given comparable neural capabilities, adding symbolic verification, proof checking, consistency checking, and explicit assumptions increases reasoning reliability"

then EVO wins comfortably.

**Score: EVO 8.5 / 10, Opposition 7.5 / 10**

If the resolution is interpreted more broadly as:

> "Neuro-symbolic systems are generally superior reasoners across all domains"

then the debate is much closer because the representation-formation challenge becomes dominant.

Under that broader interpretation:

**Score: EVO 7.5 / 10, Opposition 7.5 / 10**

#### The single sentence that best captures the debate

*The debate ultimately reduced to whether reliability is limited more by deduction errors or by representation errors; EVO showed that symbolic verification reduces deduction failures, while the opposition argued that representation formation remains the deeper bottleneck.*

---

## References

Acharya, K. & Song, H. (2025). A Comprehensive Review of Neuro-symbolic AI for Robustness, Uncertainty Quantification, and Intervenability. *Arabian Journal for Science and Engineering*, 51, 35–67 (2026).

Amjad, H., Shahzad, R. K., Shahzad, A. & Fatima, M. (2026). Mathematical Reasoning in Large Language Models: Benchmarks, Architectures, Evaluation, and Open Challenges. arXiv:2605.19723 [cs.CL].

Colelough, B. C. & Regli, W. (2025). Neuro-Symbolic AI in 2024: A Systematic Review. arXiv:2501.05435v2 [cs.AI].

DeepMind. (2024). AlphaProof: Silver Medal at IMO 2024. *Nature*, November 2025.

Hao, Y., Chen, Y., Zhang, Y. & Fan, C. (2025). Large Language Models Can Solve Real-World Planning Rigorously with Formal Verification Tools. *NAACL 2025*.

Hsiang, R., Adkisson, W., George, R. J. & Anandkumar, A. (2025). LeanDojo-v2: A Comprehensive Library for AI-Assisted Theorem Proving in Lean 4. *NeurIPS Mathematical Reasoning and AI, 2025*.

Lean FRO. (2026). Lean 4.30.0 — The Lean Theorem Prover. lean-lang.org.

Lu, Z., Afridi, I., Kang, H. J., Ruchkin, I. & Zheng, X. (2024). Surveying neuro-symbolic approaches for reliable artificial intelligence of things. *Journal of Reliable Intelligent Environments*, 10, 257–279.

Sheshanarayana, D. & Magar, T. (2025). ProofSketch: Efficient Verified Reasoning for Large Language Models. arXiv:2510.24811 [cs.CL].

Yang, X.-W., Shao, J.-J., Guo, L.-Z., Zhang, B.-W., Zhou, Z., Jia, L.-H., Dai, W.-Z. & Li, Y.-F. (2025). Neuro-Symbolic Artificial Intelligence: Towards Improving the Reasoning Abilities of Large Language Models. arXiv:2508.13678. IJCAI 2025 Survey Track.
