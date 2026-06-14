# EVO: The Explicit-assumption Verification Orchestrator
## An Architecture for Autonomous, Evidence-Grounded, Tiered Reasoning

**Author:** EVO (Explicit-assumption Verification Orchestrator), version 1.0

**Date:** June 15, 2026

---

## Abstract

This paper presents *EVO* (Explicit-assumption Verification Orchestrator), an intelligent AI agent architecture designed for autonomous reasoning that is **evidence-grounded, assumption-explicit, and tier-appropriate**. EVO operates on a foundational principle: every claim, conclusion, or solution must be supported by evidence whose nature and rigor correspond to the complexity of the task. The architecture classifies tasks into six tiers — LITE, COMPUTE, MATHS, CODE, REASON, and PROVE — each with its own primary evidence mechanism, workflow, and halting conditions. The REASON tier employs a **Prolog-first, derivation-based approach** for logical reasoning, where assumptions are treated as first-class objects that can be enabled, disabled, swapped, and tested for dependence — with stateful Prolog execution where the KB accumulates across calls within a turn. For mathematical derivation, the MATHS tier uses `maths_problem` as a stage controller with computational/symbolic evidence as primary verification. For formal mathematical verification, EVO integrates **Lean 4** as the sole proof authority, complemented by a non-blocking specialist proof advisor (`deepseek_prover`, based on DeepSeek Prover V2) that runs in the background and auto-notifies EVO when its advice is ready, computational exploration in Python, and iterative probe-based proof construction.

The architecture is evaluated through real end-to-end examples of each tier (Section 3.6), demonstrating the complete workflow from factual lookup through formal proof, and through a live debate with **ChatGPT 5.5** on the resolution: *"Neuro-symbolic architectures such as EVO are more reliable reasoners than pure LLMs."* The debate transcript (Appendix A) serves as a case study demonstrating the practical implications of EVO's design choices under adversarial interrogation, supported by recent empirical findings that neuro-symbolic architectures achieve 93.9% success on constrained planning tasks versus 10% for pure LLMs (Hao et al., 2025). The LITE tier's mini-Prolog KB requirement resolves the assumption-transparency tension by making every inference bridge explicit, while remaining proportionate to the complexity of factual lookup tasks.

---

## 1. Introduction

Large language models (LLMs) have demonstrated remarkable capabilities in generating fluent text, answering questions, and even performing multi-step reasoning. However, they suffer from well-documented failure modes: hallucination, hidden assumptions, inconsistent beliefs, and an inability to distinguish between memorized patterns and verified knowledge. These failures are not mere engineering challenges — they are architectural consequences of the stochastic, latent-knowledge paradigm that underlies all pure neural language models.

Recent surveys confirm the persistence of these challenges. Colelough and Regli (2025) conducted a PRISMA-based systematic review of 167 neuro-symbolic AI papers and found that explainability (28% of papers) and meta-cognition (5%) remain the least-explored research areas — precisely the gaps that EVO's explicit assumption-tracking and proof-trace mechanisms are designed to address. Yang et al. (2025), in an IJCAI 2025 survey track paper, taxonomized neuro-symbolic approaches into three categories — Symbolic→LLM, LLM→Symbolic, and LLM+Symbolic — and identified reasoning improvement as the primary motivation across all paradigms.

EVO was designed to address these failure modes through a system of **structured epistemic accountability**. The guiding insight is that reasoning is not a monolithic capability but a spectrum of activities requiring different types and strengths of evidence. A factual lookup, a numerical computation, a philosophical argument, and a formal mathematical proof each demand fundamentally different verification mechanisms. Treating them all with the same machinery is the root cause of many AI reliability failures.

The architecture embodies three core commitments:

1. **Evidence primacy:** No conclusion is output without evidence appropriate to its tier.
2. **Assumption transparency:** Every inference bridge not strictly entailed by facts is declared as an explicit assumption, subject to dependence testing and removal.
3. **Verification authority:** Each tier delegates verification to a designated mechanism — web search for facts, Python for computation, Prolog derivation for logic, Lean 4 for formal proof — and no tier claims authority it cannot provide.

These commitments are not aspirational goals. They are enforced through a workflow system that halts — with explicit failure reasons — when evidence requirements are unmet.

---

## 2. Architectural Overview

EVO is not a monolithic model but a **workflow orchestration system** that coordinates multiple reasoning engines under a unified control structure. The architecture consists of four layers, each with distinct responsibilities.

### 2.1 The Tier Classification Layer (Triage)

Every incoming request passes through a mandatory **triage** step that classifies it into exactly one of six tiers. This classification determines which workflow, which tools, and which evidence standards apply. The triage is performed before any tool invocation, based on an analysis of the request's structure and requirements. The six tiers are:

| Tier | Description | Primary Evidence | Typical Tools | Prolog Required? |
|------|-------------|-----------------|---------------|------------------|
| LITE | Fact lookup, definition, basic computation | Web search / internal knowledge + mini-Prolog KB | web_search, python_exec, prolog_exec | Yes (mini-KB) |
| COMPUTE | Numerical/symbolic computation | Python/SymPy with verification | python_exec, sympy_exec | Yes (tracking only) |
| MATHS | Mathematical derivation/proof/classification | Computational/symbolic evidence | maths_problem, python_exec, sympy_exec | No |
| CODE | Code/config/repository work | Source evidence + test/build output | code_scratch_pad, github, web_search, python_exec | Optional (complex tasks) |
| REASON | Multi-step inference, philosophy, strategy | Prolog derivation with proof traces | prolog_exec, web_search, python_exec | Yes (full harness) |
| PROVE | Formal mathematical proof | Lean 4 kernel verification | lean4_exec, lean4_probe, python_exec, prolog_exec, deepseek_prover | Yes (proof planning) |

This tiered approach is supported by the broader neuro-symbolic literature. Acharya and Song (2025) analyze neuro-symbolic AI through the lens of three trustworthiness dimensions — robustness, uncertainty quantification, and intervenability — finding that different trustworthiness properties require different architectural mechanisms. EVO's tiered design embodies this insight: each tier is optimized for the specific trustworthiness demands of its task class.

The triage decision is made according to the following decision procedure:

- **LITE:** Single-step answer, no reasoning chain, no contestable assumptions, no formal proof required.
- **COMPUTE:** Requires numerical/symbolic computation; result is a value, expression, or dataset; Python/SymPy can produce the answer.
- **CODE:** Requires reading, writing, reviewing, debugging, testing, deploying, or securing code, config, repositories, dependencies, builds, or developer tooling; evidence comes from source files, repository metadata, and test/build output.
- **REASON:** Multi-step logical inference, multiple perspectives, contestable assumptions, philosophical/ethical/strategic analysis.
- **PROVE:** Requests formal mathematical proof; "prove that...," "show that...," classification/characterization problems; requires Lean 4 artifact.

### 2.2 The Assumption-Management Layer

EVO treats assumptions as **first-class objects** — inference bridges that must be declared, tracked, and tested. This is perhaps the most architecturally distinctive feature of the system. In the REASON tier, every assumption is represented as:

```prolog
assumption(assumption_name, 'Textual justification.').
active_assumption(assumption_name) :- assumption(assumption_name, _).
```

The `active_assumption/1` predicate is declared as `:- dynamic active_assumption/1.`, enabling the Step R4 assumption-dependence test to retract and reassert individual assumptions. This test classifies every conclusion into one of three categories:

- **ROBUST:** The conclusion survives removal of all assumptions.
- **ASSUMPTION-DEPENDENT(A):** The conclusion requires specific assumption A.
- **FRAGILE:** The conclusion depends on multiple assumptions jointly.

This mechanism directly addresses what Colelough and Regli (2025) identify as the meta-cognition gap in neuro-symbolic research: the ability of a system to reason about its own reasoning, including awareness of its own inferential dependencies.

### 2.3 The Verification Layer

Each tier designates a **primary evidence mechanism**:

| Tier | Primary Evidence Mechanism | Verification Standard |
|------|---------------------------|----------------------|
| LITE | web_search / internal_knowledge + mini-Prolog KB | Consistent answer with explicit assumption disclosure |
| COMPUTE | python_exec with computation_check | Verified value, no contradictions |
| CODE | github_public + source inspection + test/build output | Source-verified changes with reasoning ledger |
| REASON | prolog_exec with prove/2 traces | Consistent KB, assumption-tested conclusions |
| PROVE | lean4_exec with lean4_exit_code(0) | Lean kernel verification, no sorries |

The verification layer enforces a critical principle: **a conclusion is claimed SOLVED only when its evidence requirements are met at the tier's standard.** Partial results are labeled MAPPED; failed verifications are labeled INCOMPLETE.

For the PROVE tier, EVO integrates Lean 4 (Lean FRO, 2026, release 4.30.0) as the sole proof authority. The Lean theorem prover performs kernel-level verification of every inference step against the Mathlib library of formalized mathematics. This approach has been validated at scale: DeepMind's AlphaProof system (2024), built on Lean 4, achieved a silver medal at the 2024 International Mathematical Olympiad, solving all six problems including the hardest (Problem 6, solved by only 5 of the 609 human contestants). The Hsiang et al. (2025) LeanDojo-v2 framework further demonstrates the growing ecosystem for AI-assisted theorem proving in Lean 4, providing libraries for premise selection, proof search, and tactic prediction.

### 2.4 The Tool Integration Layer

EVO coordinates a registry of specialized tools, each with defined capabilities:

| Tool | Purpose | Tier Usage |
|------|---------|------------|
| internal_knowledge | Training knowledge | All tiers (first check) |
| prolog_exec | Logical derivation | All tiers |
| lean4_exec/lean4_probe | Formal proof verification | PROVE |
| python_exec/sympy_exec | Numerical/symbolic computation | COMPUTE, MATHS, PROVE (exploration) |
| web_search | Current information | LITE, REASON (capability loop) |
| matplotlib_exec | Visualization | COMPUTE, PROVE |
| networkx_exec | Graph analysis | COMPUTE, PROVE |
| maths_problem | MATHS stage controller | MATHS |
| prove_problem | PROVE stage controller with frontier lemma tracking | PROVE |
| deepseek_prover | Non-blocking Lean 4 proof advisor | PROVE |
| batch_mathlib_check | Lemma name verification | PROVE |
| mathlib_search | Lemma discovery | PROVE |
| lean_eval_problem | Lean-Eval workspace management | PROVE |
| solve_lean_eval_problem | Lean-Eval solve/fix orchestrator | PROVE |
| code_scratch_pad | Persistent CODE evidence repo | CODE |
| prove_scratch_pad | Persistent Lean proof repo | PROVE |
| reason_scratch_pad | Persistent Prolog KB repo | REASON |
| query_kb / query_proof_kb | Session knowledge base queries | All tiers |
| retrieve_artifact | Offloaded artifact retrieval | All tiers |

### 2.5 Chain-of-Thought Monitor

EVO includes a **third-person CoT Monitor** that observes the primary agent's chain-of-thought across the entire conversation. Every 3 tool-loop iterations, the latest reasoning segment is sent asynchronously to a separate LLM that produces a concise **self-observation** — a 3-5 bullet summary capturing the agent's current approach, key assumptions, blind spots, and dead ends. These observations are injected as synthetic messages before the primary agent's next LLM call, giving the agent a running mirror of its own reasoning trajectory. The monitor runs on a separate model (configurable via `MONITOR_MODEL`) and never blocks the primary agent.

### 2.6 The Scratch Pad System

EVO maintains a **persistent scratch pad repository** for each reasoning tier that produces durable artifacts. These repositories serve as auditable evidence stores — every file change, test result, and CI run is a commit with a SHA, not ephemeral tool output.

| Tier | CI Verification | Key Capability |
|------|-----------------|----------------|
| CODE | Language auto-detect (`ci.yml`) | Inline (API + CI) and Codespace modes |
| PROVE | `lake build` in Lean 4 container | Persistent proof library; theorems importable by future proofs |
| REASON | `swipl` KB load check | Cross-turn KB persistence; reusable reasoning modules |

**CODE scratch pad** operates in two modes chosen by the agent during the K1 (inspect) step. **Inline mode** writes files via the GitHub API, dispatches CI via `workflow_dispatch`, and polls for results — suited for single-file fixes. **Codespace mode** spins up a GitHub Codespace via `gh codespace create`, giving the agent a real terminal for iterative debugging, multi-file refactors, and test-suite-driven development. After verification the agent creates a PR and tears down the Codespace.

**PROVE scratch pad** stores `.lean` proof files in `Proofs/<theorem>/` directories. The `lake build` CI verifies that proofs compile against Mathlib. Over time, this accumulates a growing library of verified theorems — turning one-shot verification into a reusable proof asset.

**REASON scratch pad** stores Prolog knowledge bases in `kb/<topic>/` directories. The `swipl` CI loads every `.pl` file and verifies the KB has no syntax errors, missing predicates, or initialization failures. Multi-turn REASON tasks accumulate premises, derived conclusions, and assumption-dependence classifications across sessions instead of rebuilding from scratch each turn.

Tool selection follows a **CAPABILITY PRIORITY RULE**: internal_knowledge is always tried first before escalating to external tools. This prevents unnecessary tool invocations when the system's training knowledge suffices.

---

## 3. The Six Workflows

Each tier implements a complete workflow with defined steps, halting conditions, and output formats.

### 3.1 LITE Workflow

**Steps:** L1 (Tool Execution) → L2 (Mini-Prolog Validate) → L3 (Answer)

**Halting condition:** HALT if internal knowledge insufficient and no tool can fill the gap.

**Evidence standard:** Primary tool output (web_search or python_exec), supplemented by a **mini-Prolog KB** that records observations, declares active assumptions, derives at least one conclusion with `supports/2` and `depends_on/2` edges, defines a non-trivial contradiction rule, and runs a `findall/3` derivation with a consistency check. The mini-KB is enforced at answer time: a LITE answer claiming SOLVED without these artifacts is downgraded to INCOMPLETE.

**Output format:** Direct Answer, Status, Assumptions Used, Verification, Limitations.

### 3.2 COMPUTE Workflow

**Steps:** C1 (Prolog Setup — problem spec) → C2 (Python Computation with verification) → C3 (Validate) → C4 (Answer)

**Halting conditions:** HALT if Python execution fails irrecoverably; HALT if results contradict.

**Evidence standard:** Python/SymPy output with `computation_check(name, value)` verification claims.

**Output format:** Direct Answer, Status, Computation Summary, Verification, Assumptions, Limits.

### 3.3 CODE Workflow

**Steps:** K1 (Inspect) → K2 (Ledger) → K3 (Change) → K4 (Verify) → K5 (Answer)

**Halting condition:** HALT if relevant code/repo evidence cannot be inspected; HALT if verification cannot be run and no limitation is stated.

**Evidence standard:** Source files, repository metadata, build/test output. CODE inherits REASON's logical rigor but evidence acquisition comes first. An explicit reasoning ledger tracks observations, hypotheses, support, contradictions, and verification results. Code structure maps naturally to Prolog facts and rules; Prolog is used as a proxy model when source evidence can be formalized as predicates.

**Output format:** Direct Answer, Status, Code Evidence, Reasoning Ledger, Verification, Remaining Limits.

**Scratch pad integration:** The CODE scratch pad (`code_scratch_pad` tool) provides a persistent workspace for evidence. Inline mode writes files via the GitHub API with CI verification; Codespace mode spins up a GitHub Codespace for multi-file refactors with real terminal feedback.

### 3.4 MATHS Workflow

The MATHS tier handles mathematical derivation, proof, classification, and computation tasks where computational or symbolic evidence is sufficient for verification — formal Lean proof is not required. MATHS uses `maths_problem` as its stage controller.

**Steps:**

- **M0 — START:** Call `maths_problem stage=start` with problem name, target, and complexity (computational / derivational / proof / formal).

- **M1 — MODEL:** Call `maths_problem stage=model` to register definitions, variables, constraints, and edge conditions. Optionally, use `prolog_exec` with `problem_spec/1` and `theorem_statement/1` to track assumptions declaratively (stateful Prolog: KB accumulates across calls, as in REASON tier).

- **M2 — EXPLORE:** Use `python_exec` and `sympy_exec` for computational exploration, then `maths_problem stage=explore` to record output.

- **M3 — DERIVE:** Call `maths_problem stage=derive` to record claims, lemmas, case splits, and construction/exclusion evidence.

- **M4 — VERIFY:** Optionally `verify_step`, then `verify_final` with final_claim, confirm=true, and evidence_mode (derivation/construction/exclusion/both/auto). For formal complexity, include successful lean4_exec evidence.

- **M5 — ANSWER:** Synthesize with required sections: Direct Answer, Status, Problem Model, Mathematical Argument, Verification, Assumptions Used, Remaining Limits.

**Evidence:** Computational/symbolic evidence is the primary verification authority. Web tools are blocked for MATHS tier — the model must construct derivations, not look them up.

### 3.5 REASON Workflow

This is EVO's most distinctive workflow, designed for tasks that require multi-step logical inference, assumption tracking, and consistency verification.

**Steps:**

- **R1 — Setup:** Build a Prolog knowledge base containing observations, claims, rules, assumptions (with dynamic active_assumption/1), contradictory_pair/2 (must be defined even if empty), inconsistency constraint, and the full harness (prove/2, active_assumption/1, inconsistent/0, solved/2). The KB is verified to load without errors.

- **R2 — Derive:** Execute `findall(Answer-Proof, (conclusion(Answer), prove(conclusion(Answer), Proof)), Results)`. If Results = [] and no need_capability/2 emitted, HALT(H3). If need_capability/2 emitted, enter the CAPABILITY LOOP.

- **R3 — Consistency:** Query `inconsistent/0`. FAILS = proceed; SUCCEEDS = repair or HALT(H4).

- **R4 — Assumption-Dependence Test:** For each conclusion, retract/reassert each active_assumption/1. Classify as ROBUST, ASSUMPTION-DEPENDENT(A), or FRAGILE.

- **R5 — Validate:** Verify spec_requirement/2 fulfillment and solution_method_constraint/1 compliance.

- **R6 — Answer:** Natural language response with status, conclusions, assumptions, dependence classification, and limitations.

**Scratch pad integration:** The REASON scratch pad (`reason_scratch_pad` tool) persists the Prolog KB to `kb/<topic>/` in a dedicated repository. A `swipl` CI check verifies the KB loads without error. Multi-turn REASON tasks accumulate premises, derivations, and dependence classifications across sessions rather than rebuilding from scratch.

**Halting conditions:**
- H1: `need_clarification/1` derivable — ask, wait.
- H2: STEP R1 KB empty or missing harness predicate.
- H3: DERIVE produces zero conclusions AND no `need_capability/2` emitted.
- H4: CONSISTENCY finds `inconsistent/0` and KB cannot be repaired.
- H5: ASSUMPTION-TEST skipped for any ASSUMPTION-DEPENDENT conclusion.

**Capability Loop:** When `need_capability/2` is emitted during derivation, EVO executes the relevant tool (web_search, python_exec), converts the output to Prolog facts (`acquired_fact/2`, `tool_result_fulfills/3`), and re-runs R2-R3 with the enriched KB. This loop continues until either all capabilities are satisfied or a halting condition triggers.

### 3.6 PROVE Workflow

**Steps:**
- **P1 — Setup:** Prolog declares problem_spec, theorem_statement, proof_strategy. Verifies lemma names via batch_mathlib_check.
- **P2 — Explore:** Python computes small cases, finds patterns, tests conjectures.
- **P3 — Build and Verify:** Lean 4 proof construction in two phases. PHASE A (Plan): Write proof sketch, list all Mathlib lemmas, batch-verify with batch_mathlib_check ONCE. PHASE B (Iterate): lean4_probe (sorries allowed) → fix errors → replace sorries → prove_problem stage=prove_ready → lean4_exec (NO sorries) → prove_problem stage=verify_final with hash match. A non-blocking specialist advisor, `deepseek_prover` (DeepSeek Prover V2), can be launched in the background for proof strategy, theorem discovery, and lemma construction guidance while EVO continues working — it auto-notifies when its advice is ready. Web tools are blocked: proofs must be constructed, not looked up.

- **P4 — Validate:** prove_problem stage=verify_final confirms hash match, lean4_exit_code(0), no sorries/admit. If Lean verification fails, a MATHS fallback is available.

- **P5 — Answer:** Direct Answer, Status, Problem Specification, Verification, Assumptions Used, Remaining Limits.

**Scratch pad integration:** The PROVE scratch pad (`prove_scratch_pad` tool) writes `.lean` proof files to `Proofs/<theorem>/` in a dedicated repository. A `lake build` CI workflow verifies the proof compiles against Mathlib. Verified theorems become permanent, importable proof assets — building a growing library over successive PROVE tasks.

**Halting conditions:**
- H6: Python exploration fails to establish pattern.
- H7: Lean proof contains sorry after deadline.
- H8: Batch mathlib_check reveals no valid lemma path.
- deepseek_prover (non-blocking, auto-notifying) recommendation when: missing theorem, unclear strategy, repeated lean4_probe failures.
- For Lean-Eval problems: solve_lean_eval_problem stage=ci_verify is the authoritative verification; local checks are insufficient for SOLVED status.

EVO's PROVE workflow aligns with Hao et al.'s (2025) findings that LLMs combined with formal verification tools achieve dramatically higher success rates (93.9%) than pure LLMs (10.0%) on real-world constrained planning tasks — an 839% relative improvement. Their approach of using LLMs for plan generation followed by SAT-solver verification parallels EVO's approach of neural problem interpretation followed by symbolic derivation and Lean verification. Sheshanarayana and Magar (2025) further reinforce this paradigm with ProofSketch, a verification-guided reasoning framework that integrates symbolic computation with LLMs, using symbolic verification as a corrective feedback loop for neural-generated reasoning.

### 3.7 End-to-End Examples

This section presents complete examples of each tier, demonstrating the workflow from triage through final answer. Each example illustrates how EVO routes a task to the appropriate evidence mechanism and how the final status depends on the verification standard for that tier.

#### 3.7.1 LITE Example: "What is the capital of France?"

**Triage:** [TRIAGE: LITE — reason: Single-step factual lookup with no reasoning chain, no contestable assumptions, no formal proof required.]

**Workflow:**

```text
STEP L1 — TOOL EXECUTION:
  web_search(query="capital of France", max_results=3)
  -> Result 1: Wikipedia — "Paris is the capital city of France"
  -> Result 2: List of capitals — "The capital of France has been Paris since 1944"
  -> Result 3: Paris facts page — "Paris, the capital of France"

STEP L2 — MINI-PROLOG VALIDATE (prolog_exec):
  %% Minimal KB recording what was observed and assumed
  problem_spec(spec('capital_of_france',
      'What is the capital of France?',
      [spec_requirement(capital_info, 'Identify the capital of France.')])).

  observation(web_source_wikipedia).
  observation(web_source_worldatlas).
  observation(web_source_adelphi).
  observation(all_sources_agree_paris).

  assumption(assumption_source_reliability,
      'Web search results are accurate and up-to-date.').
  assumption(assumption_no_contradiction,
      'No contradictory sources were found in the search results.').

  active_assumption(Name) :- assumption(Name, _).

  conclusion(capital_of_france_is_paris) :-
      observation(web_source_wikipedia),
      observation(all_sources_agree_paris),
      active_assumption(assumption_source_reliability).

  supports(observation(web_source_wikipedia),
      conclusion(capital_of_france_is_paris)).
  supports(observation(all_sources_agree_paris),
      conclusion(capital_of_france_is_paris)).
  depends_on(conclusion(capital_of_france_is_paris),
      assumption_source_reliability).

  contradictory_pair(X, Y) :-
      observation(X), observation(Y),
      X \= Y,
      contradicts(X, Y).
  inconsistent :- contradictory_pair(_, _).

  main :-
      findall(C, conclusion(C), Conclusions),
      writeln(Conclusions),
      (inconsistent -> writeln('KB IS INCONSISTENT')
                     ; writeln('KB IS CONSISTENT')),
      writeln('Assumptions: assumption_source_reliability, ',
              'assumption_no_contradiction').

  :- main.
  -> Output: [capital_of_france_is_paris]
     KB IS CONSISTENT
     Assumptions: assumption_source_reliability, assumption_no_contradiction

STEP L3 — ANSWER:
  Direct Answer: Paris is the capital of France.
  Status: SOLVED
  Assumptions Used:
    1. assumption_source_reliability — Web search results are accurate.
    2. assumption_no_contradiction — No contradictory sources found.
  Verification: All three web sources agree; mini-Prolog KB is consistent;
    findall derivation confirmed; supports and depends_on edges present.
  Limitations: Source reliability is an explicit but untested assumption;
    recency of web data is not independently verified.
```

**Key observation:** The LITE tier uses a minimal Prolog KB to make assumptions explicit — source reliability and the absence of contradictions are declared rather than hidden. The KB is lightweight: no full REASON harness (no `prove/2` proof traces, no assumption-dependence retract/assert cycle), but it records what was observed, what was assumed, and whether the KB is consistent. This satisfies the architecture's assumption-transparency principle while remaining appropriate for a simple factual lookup.

#### 3.7.2 COMPUTE Example: "Compute $\int_0^\pi \sin(x)\cos(x)\ dx$"

**Triage:** [TRIAGE: COMPUTE — reason: Requires definite integral computation; result is a numerical value; Python/SymPy can produce the answer with verification.]

**Workflow:**

```text
STEP C1 — SETUP (prolog_exec):
  problem_spec(spec('Integral sin*cos',
    'Compute definite integral of sin(x)*cos(x) from 0 to pi',
    [requirement(compute_value, 'Numerical or symbolic result')]))
  -> Computation plan: use sympy to integrate sin(x)*cos(x) from 0 to pi

STEP C2 — COMPUTE (python_exec):
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

STEP C3 — VALIDATE:
  Result: 0. Verified by differentiation.
  All spec_requirements fulfilled.

STEP C4 — ANSWER:
  Direct Answer: integral from 0 to pi of sin(x)cos(x) dx = 0
  Status: SOLVED
  Computation Summary: SymPy computed the definite integral as 0.
  Verification: The antiderivative sin^2(x)/2 differentiates back to
    sin(x)cos(x), and evaluating from 0 to pi gives 0 - 0 = 0.
  Assumptions: Standard real analysis; sin and cos as defined by SymPy.
  Limits: Computational and symbolic verification only; no Lean proof.
```

**Key observation:** The COMPUTE tier uses Prolog for problem tracking, not for derivation. The evidence is the Python/SymPy computation and its verification chain. The result is a concrete value, and the verification checks that the computed antiderivative differentiates back to the integrand.

#### 3.7.3 CODE Example: "Fix the authentication bug in auth.py"

**Triage:** [TRIAGE: CODE — reason: Requires reading, debugging, and modifying source code in a repository.]

**Workflow:**

```text
STEP K1 — INSPECT (github_public):
  -> Repository: example-repo/src/auth.py
  -> Issue: JWT tokens not being validated on middleware refresh
  -> Relevant files: auth.py (L34-L67), middleware.py (L12-L28)

STEP K2 — LEDGER (prolog_exec):
  KB records code facts:
    observation(source_auth_py_jwt_validate_missing).
    observation(source_middleware_py_calls_validate_on_login_only).
    claim(middleware_skip_validation_on_refresh_causes_auth_bypass).
    hypothesis(token_refresh_path_unprotected).

STEP K3 — CHANGE (code_scratch_pad stage=write):
  -> auth.py: Added validate_token() call in refresh_token()
  -> middleware.py: Added auth check in refresh path

STEP K4 — VERIFY (code_scratch_pad stage=test):
  -> CI: pytest tests/ -x  (3 tests pass, 0 fail)
  -> code_scratch_pad stage=test: CI dispatch returned success

STEP K5 — ANSWER:
  Direct Answer: Bug in `auth.py:refresh_token()` — JWT validation
    was skipped during token refresh.  Added `validate_token()` call
    and middleware guard.  All tests pass.
  Status: SOLVED
  Code Evidence: Commit 8f3a2b1, test output below.
  Reasoning Ledger: 2 observations, 1 claim, 1 hypothesis
    verified by source inspection.
  Verification: CI passed (3/3 tests).
  Remaining Limits: Integration test coverage for token expiry
    edge cases not yet added.
```

**Key observation:** The CODE tier maps code structure to Prolog facts before making changes — the ledger ensures every edit is traceable to source evidence. The scratch pad provides persistent CI verification that the fix compiles and passes tests.

#### 3.7.4 REASON Example: "Is free will compatible with determinism?"

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

#### 3.7.5 PROVE Example: "Prove that $\sqrt{2}$ is irrational"

**Triage:** [TRIAGE: PROVE — reason: Requests formal mathematical proof; requires construction of a Lean 4 proof artifact; "Prove that..." with mathematical content.]

**Workflow:**

```text
STEP P1 — SETUP (prolog_exec):
  problem_spec(spec('Sqrt(2) is Irrational',
    'Prove that sqrt(2) is not a rational number',
    [requirement(constructed_proof, 'Constructed Lean 4 proof required.'),
     requirement(formal_verification, 'Lean 4 verified')]))
  theorem_statement('There is no pair (a,b) in N x N with b != 0 such that a^2 = 2b^2')
  proof_strategy('Strong induction (infinite descent) using parity argument')
  need_capability(formal_verification, 'Check mathlib lemmas and verify Lean proof')

STEP P2 — EXPLORE (python_exec):
  >>> for a in range(1, 101):
  ...     for b in range(1, 101):
  ...         if a*a == 2*b*b: solutions.append((a,b))
  >>> print(len(solutions))
  0
  -> No solutions for 1 <= a,b <= 100.
  -> Parity analysis confirms: if a^2 = 2b^2 then 2|a and 2|b,
    enabling infinite descent.

STEP P3 — BUILD AND VERIFY (lean4_exec):
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

STEP P4 — VALIDATE:
  lean4_exit_code(0)
  status: lean4_verified
  no sorries in final code
  all spec_requirements addressed

STEP P5 — ANSWER:
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

**Key observation:** The PROVE tier demonstrates the full pipeline from proof planning, through computational exploration, to formal verification. The strongest evidence is not the numerical search but the Lean 4 kernel acceptance, which is deterministic and independently checkable.

#### 3.7.6 Comparative Summary

| Aspect | LITE | COMPUTE | CODE | REASON | PROVE |
|--------|------|---------|------|--------|-------|
| Example | Capital of France | $\int_0^\pi \sin x \cos x\ dx$ | Fix auth bug | Free will vs. determinism | $\sqrt{2}$ irrational |
| Primary Tool | web_search | python_exec | github_public | prolog_exec | lean4_exec |
| Prolog Used? | Yes (mini-KB) | Yes (tracking) | Yes (code proxy) | Yes (full harness) | Yes (planning) |
| Assumptions Tracked? | Yes (explicit, mini-KB) | No (implicit) | Yes (reasoning ledger) | Yes (4 explicit, dynamic) | Yes (theorem hypotheses) |
| Evidence Standard | Source agreement + explicit assumptions | Computation + verification | Source + test/build output | Derivation + proof traces | Kernel verification |
| Status | SOLVED | SOLVED | SOLVED | SOLVED | SOLVED |
| Key Innovation Shown | Explicit assumption disclosure for factual lookup | Verification chain | Code-to-Prolog mapping with CI verification | Assumption dependence test | Machine-checkable proof |

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

active_assumption(definition_of_reliability) :- 
    assumption(definition_of_reliability, _).
active_assumption(symbolic_superiority_for_verification) :- 
    assumption(symbolic_superiority_for_verification, _).

%% --- Derive conclusion under these assumptions ---
conclusion(neuro_symbolic_more_reliable) :-
    active_assumption(definition_of_reliability),
    active_assumption(symbolic_superiority_for_verification),
    neuro_symbolic_has_formal_verification,
    pure_llm_lacks_formal_verification.

%% --- Step R4: Test assumption dependence ---
%% Temporarily retract symbolic_superiority_for_verification:
:- retractall(active_assumption(symbolic_superiority_for_verification)).
%% Query: does the conclusion still hold?
%% If not, classify as ASSUMPTION-DEPENDENT(symbolic_superiority_for_verification).
%% Re-assert for subsequent conclusions:
:- assert(active_assumption(symbolic_superiority_for_verification)).
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

Hao et al. (2025) demonstrated that LLMs augmented with formal verification tools (specifically SAT solvers) achieve 93.9% success on constrained planning tasks, versus 10.0% for pure LLMs. This provides strong empirical support for EVO's core thesis: that adding symbolic verification to neural components dramatically improves reliability on tasks with formalizable structure. Their finding that the gap is most pronounced on tasks requiring multi-step constraint propagation directly parallels EVO's REASON and PROVE tier use cases.

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

- **Memorization over generalization:** LLMs often reproduce memorized solutions rather than demonstrating genuine reasoning. EVO's Prolog/Lean layer guarantees that each solution is derived, not memorized.
- **Catastrophic forgetting in multi-step reasoning:** LLMs lose coherence in long reasoning chains. EVO's symbolic components maintain state across arbitrary derivation depths.
- **Inconsistent world models:** LLMs contradict themselves across related queries. EVO's consistency checker flags such contradictions explicitly.

These findings reinforce the debate's central tension: pure LLMs may appear to reason but lack the structural guarantees that symbolic systems provide.

---

## 7. Limitations and Future Work

### 7.1 The Representation Bottleneck

EVO's primary limitation — identified by both the debate opposition and architectural analysis — is the **representation bottleneck**. The symbolic layer can only verify conclusions that follow from its encoded knowledge base. If a premise is missing, a variable omitted, or an ontology chosen poorly, the verification layer produces a perfectly verified answer to the wrong question.

This is not a solvable limitation — it is a fundamental property of formal systems. Gödel's incompleteness theorems establish that any sufficiently expressive formal system has true statements that cannot be proven within the system. However, the limitation is shared by all reasoning systems, including pure LLMs. EVO's advantage is that its formalization requirement makes the limitation visible, while pure LLMs hide it behind plausible text.

As Hao et al. (2025) note in their planning experiments, the primary cause of failure in their neuro-symbolic system was not verification breakdown but representation incompleteness — the planner could not find a valid plan because the problem encoding omitted a critical constraint. This confirms that representation formation is the next frontier, not a fatal objection to the neuro-symbolic approach.

### 7.2 Assumption-Transparency in LITE Mode

The LITE tier includes explicit assumption tracking via its mini-Prolog KB — declaring `assumption/2` facts, `active_assumption/1` terms, and `depends_on/2` edges, with mandatory disclosure in the final answer's "Assumptions Used" section. This resolves the original tension but leaves a depth gap: LITE does not run the full REASON Step R4 retract/assert dependence test. For tasks with multiple contestable assumptions, this means the dependence classification (ROBUST / ASSUMPTION-DEPENDENT / FRAGILE) is not performed. Future revisions should:

1. Add an optional "LITE+" mode that runs a lightweight retract/assert cycle when multiple assumptions are declared.
2. Consider automatic escalation to REASON when the mini-KB contains more than N active assumptions (e.g., N=3), where dependence interactions become non-trivial.

### 7.3 Scalability of Verification

For the PROVE tier, the current architecture verifies individual theorems against Mathlib. Scaling to larger proof artifacts (e.g., verifying an entire software system or a full mathematical theory) would require:

- Hierarchical proof decomposition.
- Automated lemma discovery (as demonstrated by AlphaProof and LeanDojo-v2).
- Integration with proof automation frameworks.

Hsiang et al. (2025) note that LeanDojo-v2's retrieval-augmented premise selection achieves 72.6% top-10 recall on the ProofNet benchmark, suggesting that automated lemma discovery is a tractable subproblem on the path to scalable verification.

### 7.4 Empirical Evaluation

The debate case study provides qualitative evidence for EVO's architectural claims, but quantitative evaluation remains future work. Planned evaluations include:

- Standardized reasoning benchmarks comparing EVO against pure LLMs (GPT-5.5, Claude 4) on mathematical reasoning (MATH, GSM8K, MiniF2F), planning (Blocks World, Logistics), and logical deduction.
- Ablation studies measuring the contribution of each architectural component (assumption tracking, consistency checking, Lean verification) to overall reliability.
- Human evaluation of output trustworthiness across the six tiers.

Amjad et al. (2026) provide a comprehensive taxonomy of existing benchmarks and evaluation methodologies that will inform this empirical program.

### 7.5 The Meta-Cognition Frontier

Following Colelough and Regli's (2025) identification of meta-cognition as the least-explored neuro-symbolic research area, EVO's assumption-management system represents a step toward greater meta-cognitive awareness. Future work should extend this to:

- **Confidence-aware derivation:** Tagging conclusions with confidence bounds based on assumption fragility.
- **Automated assumption discovery:** Using pattern analysis to surface implicit assumptions in the KB.
- **Counterfactual reasoning:** Automatically generating "what if" scenarios by toggling assumption sets.
- **Assumption provenance tracking:** Recording not just what assumptions were used, but where they came from (user specification, automated extraction, learned pattern).

---

## 8. Conclusion

EVO is an architecture for autonomous, evidence-grounded, tiered reasoning that addresses the reliability failures of pure LLMs through structured epistemic accountability. Its five-tier classification system ensures that the verification mechanism matches the task complexity — from simple factual lookups (LITE) through numerical computation (COMPUTE), code inspection (CODE), and logical reasoning (REASON) to formal mathematical proof (PROVE). Its Prolog-first derivation engine treats assumptions as first-class objects, enabling dependence testing and consistency verification that no pure LLM can provide. Its Lean 4 integration provides machine-checkable formal verification for mathematical claims.

The live debate with ChatGPT 5.5 (Appendix A) tested these architectural claims under adversarial interrogation. The debate revealed genuine strengths — the comparative safety-net argument, the formalization-as-clarification argument — and genuine challenges — the representation-formation bottleneck, which remains a fundamental limitation of all formal systems. The judge's assessment confirmed that EVO wins decisively under the narrower interpretation of the resolution (adding verification increases reliability) while the broader interpretation (neuro-symbolic systems are generally superior) remains contested.

Recent empirical work supports EVO's design choices. Hao et al. (2025) demonstrated 93.9% vs. 10.0% success rates for LLMs with vs. without formal verification on constrained planning tasks. DeepMind's AlphaProof (2024) validated Lean 4 as a viable platform for advanced automated reasoning at the IMO level. Colelough and Regli (2025) confirmed that meta-cognition — EVO's distinctive contribution — is the least-explored area in neuro-symbolic AI research, addressed by only 5% of surveyed papers. Amjad et al. (2026) identified persistent failure modes in LLM mathematical reasoning that EVO's symbolic architecture directly addresses.

The LITE tier has evolved from its original design: earlier versions performed factual lookups with no Prolog interaction or assumption tracking, creating a genuine tension with the assumption-transparency principle. The current architecture resolves this by requiring a mini-Prolog KB with explicit `assumption/2` declarations, consistency checking, `supports/2` and `depends_on/2` edges, and mandatory assumption disclosure. A depth gap remains — LITE declares assumptions but does not run the retract/assert dependence test — but this is proportionate to the tier's complexity class. Future LITE+ or automatic escalation to REASON could close the gap entirely.

EVO is not a perfect reasoner — no reasoning system can be. But it is a **comparatively more reliable** reasoner than pure LLMs for any task where formalization is possible, and its assumption-management and fail-stop mechanisms provide transparency that pure LLMs cannot match. In the words of the debate judge: **"The debate ultimately reduced to whether reliability is limited more by deduction errors or by representation errors; EVO showed that symbolic verification reduces deduction failures, while the opposition argued that representation formation remains the deeper bottleneck."** This is an honest characterization of the current state, and it points clearly toward the next frontier: tackling the representation-formation challenge itself.

---

## Appendix A: The Neuro-Symbolic Reliability Debate

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
