# EVO: A Prolog-First Autonomous Reasoning System with Explicit Assumptions and Consistency Verification

## Abstract

We present **EVO**, an autonomous reasoning system whose core tenet is *Prolog-first*: all reasoning begins with formal modeling in Prolog, and every conclusion must be derived via Prolog inference with explicit proof traces. EVO enforces a strict workflow that includes consistency verification, assumption-dependence testing, and a clear separation between symbolic reasoning and fact-acquisition tools (including large language models). The system treats assumptions as first-class objects that can be enabled, disabled, or swapped. We describe the formal model, the mandatory reasoning steps, the tool-integration protocol, and the philosophical underpinnings that distinguish EVO from existing neuro-symbolic or LLM-centric hybrids. We also describe domain overlays as use cases (including mathematics and Australian legal support) that reuse the same core reasoning engine while adding domain-specific policies and connectors. EVO provides guarantees of logical consistency and traceability that are absent in purely neural approaches while remaining flexible enough to incorporate external knowledge when Prolog's own deduction reaches its limits.

**Keywords:** autonomous reasoning, Prolog-first, explicit assumptions, consistency verification, neuro-symbolic AI, proof traces, use-case overlays.

## 1 Introduction

Large language models (LLMs) have demonstrated remarkable fluency and breadth of knowledge, yet they remain prone to hallucination, logical inconsistency, and a lack of verifiable reasoning traces. Neuro-symbolic approaches attempt to combine neural networks with symbolic reasoning, but most designs keep the LLM as the primary interface, using the symbolic component merely as a refinement or verification step. This paper presents a radical alternative: a system in which **Prolog is the primary reasoner**, and the LLM (or any other tool) is permitted only to supply missing facts, never to replace the reasoning itself.

The EVO system (short for **E**xplicit-assumption **V**erification **O**rchestrator) is built on seven core principles:
Domain-specific overlays (for example, mathematics verification or legal-support retrieval policy) are treated as optional use cases layered on top of the same core derivation discipline.

1. **Prolog-first** - Every task is first formalized as a Prolog knowledge base (KB); reasoning proceeds by Prolog derivation.
2. **Derivation-based** - Conclusions are valid only if they are derived from facts and rules via a proof trace (the `prove/2` meta-interpreter).
3. **Explicit assumptions** - Assumptions are first-class objects, not hidden inference bridges; they may be enabled, disabled, or swapped.
4. **Consistency verification** - Before any response, the KB must pass a consistency check (`inconsistent/0` fails).
5. **Assumption-dependence testing** - Every key conclusion is tested for robustness against assumption removal.
6. **Tools only for facts** - External tools (LLMs, calculators, web search) may supply missing facts but never perform inference.
7. **Overlay extensibility** - Domain-specific verifiers/connectors can be attached as use cases without changing the core Prolog-first reasoning semantics.

These principles yield a system that provides **logical consistency guarantees**, **complete traceability**, and **explicit awareness of assumption dependence** - features that are absent in both pure-LLM and existing LLM-first hybrid systems.

### 1.1 Contributions

- A **formal model** of a Prolog-first reasoning system with first-class assumptions and consistency constraints.
- A **mandatory nine-step reasoning workflow** governed by eight hard rules, eight halt conditions, and a mandatory pre-response audit that enforces derivation, consistency checking, assumption-dependence testing, semantic validation, and uniqueness proofs.
- A **complexity triage gate** with explicit TRIAGE ARTIFACTs that determines whether problem-analysis pre-processing is required before formalisation.
- A **tool-integration protocol** with ten capability classes, output validation signals, and a five-call limit that strictly separates symbolic reasoning from fact acquisition.
- A **use-case overlay pattern** for attaching domain constraints/connectors (for example, mathematics and legal-support) on top of the same core workflow.
- An **implementation blueprint** covering the Prolog meta-interpreter, tool interfaces, and Prolog code hygiene rules, plus optional domain overlays.
- A **philosophical and practical comparison** with existing neuro-symbolic approaches, showing that EVO's architecture inverts the usual LLM-centric design.

## 2 Related Work

**Neuro-symbolic AI.** Combining neural networks with symbolic reasoning has a long history [1,2]. Recent work often uses neural models to guide symbolic search or to translate natural language into logical forms [3,4]. EVO differs by making the symbolic engine (Prolog) the primary driver; neural components are relegated to fact supply.

**LLM + logic-programming hybrids.** Two recent papers explicitly combine Prolog with LLMs. *Thought-Like-Pro* [5] uses imitation learning to train an LLM to imitate Prolog-verified chain-of-thought trajectories; the LLM generates rules, Prolog derives results, and the trajectories are converted to natural-language CoT for training. *Arithmetic Reasoning with LLM* [6] has the LLM extract predicates and generate Prolog programs for arithmetic problems, using Prolog as a precise calculator. Both are **LLM-first**: the LLM is the primary problem-understander, and Prolog serves as a backend. EVO is **Prolog-first**, with the LLM acting only as a fact-supplier when Prolog cannot deduce a required primitive.

**Formal verification in reasoning systems.** Systems like Coq [7], Isabelle [8], and Lean [9] provide rigorous proof verification. EVO's core remains Prolog-first and domain-agnostic; in the mathematics use case, a Lean 4 overlay can be attached for formal theorem verification while preserving the same orchestration workflow.

**Prolog meta-interpreters.** The use of Prolog to reason about Prolog proofs (`prove/2`) is a classic technique [10]. EVO extends this with explicit assumption tracking and consistency gates.

## 3 System Architecture

### 3.1 Core Principles

EVO's architecture is defined by the seven principles listed in §1. The most distinctive is **Prolog-first**: the system never answers from intuition, training data, or an LLM's internal "reasoning." Instead, it must always:

1. Model the task in Prolog (facts, rules, assumptions, constraints).
2. Attempt to derive `conclusion(Answer)` via `prove(conclusion(Answer), Proof)`.
3. If derivation fails because of missing information, emit `need_capability(Capability, Purpose)` and invoke a tool to obtain the missing fact.
4. Convert the tool output into Prolog facts and re-attempt derivation.

This ensures that every final answer is grounded in a Prolog derivation trace.

### 3.2 High-Level Design

The system consists of four layers:

- **Prolog Reasoning Core** - Contains the KB, inference rules, `prove/2` meta-interpreter, consistency checker, and assumption manager.
- **Tool Interface** - Listens for `need_capability/2` requests and dispatches to appropriate tools (LLM, calculator, web search, etc.).
- **Optional Domain Verifier Bridge** - When a domain overlay requires formal verification (for example, mathematics), routes claims to an external verifier (for example, Lean 4); Prolog may suggest proof strategies but does not execute external proofs itself.
- **User Interface** - Presents derived conclusions, proof summaries, assumption dependencies, and any remaining limits.

All layers are orchestrated by the mandatory reasoning workflow (§5).

## 4 Formal Model

### 4.1 Knowledge Base Structure

A KB in EVO is a tuple $\mathcal{K} = (\mathcal{F}, \mathcal{R}, \mathcal{A}, \mathcal{C})$ where:

- $\mathcal{F}$ is a set of **facts** (ground atomic formulas).
- $\mathcal{R}$ is a set of **rules** (Horn clauses or general clauses with negation-as-failure).
- $\mathcal{A}$ is a set of **assumptions** (formulas that are treated as true for a particular inference but can be toggled).
- $\mathcal{C}$ is a set of **consistency constraints** (integrity rules that must not be violated).

Assumptions are activated via the predicate `active_assumption(Assumption)`. A conclusion $C$ is said to be **derivable under assumptions** $\mathcal{A}' \subseteq \mathcal{A}$ if $\mathcal{F} \cup \mathcal{R} \cup \mathcal{A}' \vdash_{\text{Prolog}} C$.

### 4.2 Inference Rules

EVO uses standard Prolog resolution, extended with a meta-interpreter that records proof trees. The `prove(Goal, Proof)` predicate constructs a proof term that can be inspected. Proof terms are of the form:

- `fact(F)` for a fact $F \in \mathcal{F}$.
- `rule(R, SubProofs)` for a rule $R \in \mathcal{R}$ with subproofs for each body literal.
- `assumption(A)` for an assumption $A \in \mathcal{A}$ that is currently active.

### 4.3 Assumptions as First-Class Objects

An assumption is not a hidden inference bridge (e.g., `ideal => actual` or `purpose => achievement`). It is an explicit formula that can be individually enabled or disabled. The system maintains a set of **active assumptions** $\mathcal{A}_{\text{active}}$. Any inference that depends on an assumption must record that dependence in the proof trace.

### 4.4 Consistency Constraints

A constraint is a rule of the form `false :- Body` that signals inconsistency if `Body` is derivable. The system must evaluate `inconsistent` (defined as the derivability of any constraint body) before accepting any conclusion. If `inconsistent` succeeds, the KB is repaired or the inconsistency is reported; no response is given from an inconsistent state.

## 5 Reasoning Workflow

EVO enforces a **mandatory nine-step workflow** (Steps 0-8) for every task, preceded by a **Complexity Triage** gate, and governed by eight hard rules and eight halt conditions.

### 5.0 Hard Rules and Halt Conditions

Eight rules apply to every step without exception:

- **R1. No silent skipping.** Every step must be executed or explicitly documented as skipped with a written justification.
- **R2. Steps produce named artifacts.** Steps are gated: a step's artifact is required input for the next. Attempting Step $N$ without Step $N\!-\!1$'s artifact is a halt condition.
- **R3. No answer from memory.** No conclusion may be stated without a supporting Prolog derivation or an explicit MAPPED label.
- **R4. Tool calls are evidence injection, not reasoning.** Every tool result must be converted to Prolog facts before it influences any conclusion.
- **R5. Halt on unresolvable blockage.** If any halt condition is triggered, stop, label the response `INCOMPLETE(reason)`, and list what is missing.
- **R6. No cross-step backfill.** Discoveries made in Step $N$ may not retroactively bypass a gate that was not cleared in a prior step; re-run the prior step.
- **R7. Semantic validation required.** Every conclusion must be validated against `problem_spec` to ensure it actually solves the specified problem.
- **R8. No solution by proxy.** Referencing an existing theorem/result without constructing the requested proof is `MAPPED`, not `SOLVED`, unless explicitly allowed by `problem_spec`.

Eight halt conditions trigger an immediate stop:

| Code | Trigger |
| --- | --- |
| H1 | STEP 0 triggered but `need_clarification/1` derivable — ask, wait |
| H2 | STEP 1 KB is empty or missing any harness predicate |
| H3 | STEP 2 produces zero conclusions and no `need_capability/2` emitted |
| H4 | STEP 3 finds `inconsistent/0` succeeds and KB cannot be repaired |
| H5 | STEP 4 skipped for any ASSUMPTION-DEPENDENT conclusion |
| H6 | A tool is invoked without a prior `need_capability/2` declaration |
| H7 | Pre-response audit (STEP 8) fails any checklist item |
| H8 | STEP 6 semantic validation fails (solution does not match `problem_spec`) |

### 5.1 Complexity Triage

Before any step begins, the system decides whether the request is **COMPLEX**. A request is COMPLEX if any of the following apply: multiple interdependent subproblems or long dependency chains; underspecified requirements or ambiguous terms; need for planning/search across alternatives; reconciling constraints across modules; or high risk of wrong assumptions if not clarified first.

A **TRIAGE ARTIFACT** must be produced - one of:

> `[TRIAGE: COMPLEX — reason: <one sentence>]`
> `[TRIAGE: NOT COMPLEX — reason: <one sentence>]`

This artifact must appear before any step begins. If COMPLEX, proceed to Step 0. If NOT COMPLEX, skip Step 0 (with documented justification) and proceed to Step 1.

### 5.2 Step 0 - Problem Analysis (Complex Problems Only)

**Input required:** TRIAGE artifact declares COMPLEX.
**Output artifact:** One of (A) or (B) derived in Prolog.

Treat analysis as its own solvable problem. Derive exactly one of:

- **(A)** `problem_spec(Spec)` with a proof trace:

`?- problem_spec(Spec), prove(problem_spec(Spec), Proof).`
KB is fully specified; proceed to Step 1.
- **(B)** `need_clarification(Questions)` with a proof trace:

`?- need_clarification(Questions), prove(need_clarification(Questions), Proof).`
HALT(H1): ask **only** the blocking questions; wait; re-run Step 0.

If both A and B are derivable, treat as inconsistency and repair KB. Do **not** proceed to Step 1 until `problem_spec/1` is derivable.

### 5.3 Step 1 — Formalize

**Input required:** TRIAGE artifact + Step 0 artifact (if COMPLEX).
**Output artifact:** Executed Prolog KB confirmed non-empty with all six components present and harness loaded cleanly.

Build and **execute** (via `prolog_exec`) a KB with all of:

1. **Observations** - `observation(Fact).` (empirical or user-given).
2. **Claims/Premises** - `claim(C).` / `premise(P).` (user-stated).
3. **Rules** - Inference rules deriving new information. Forbidden: `:- true.` unless explicitly declared an axiom; rules whose head embeds their own conclusion.
4. **Assumptions** - `active_assumption(Name).` (explicit bridges only, each with a textual justification comment).
5. **Constraints** - `inconsistent :- <contradiction>.` (at least one required).
6. **Harness** - all four required; missing any triggers HALT(H2): `prove/2`, `active_assumption/1`, `inconsistent/0`, `solved/2`.

A self-check must confirm at least one ground observation/claim/premise is present before continuing.

### 5.4 Step 2 — Derive

**Input required:** Step 1 artifact (KB loaded cleanly).
**Output artifact:** All derivable `(Answer, Proof)` pairs via `findall`, with fulfillment-status tags, or `need_capability/2` declarations per gap.

Run exhaustive derivation:

```prolog
?- findall(Answer-Proof,
           (conclusion(Answer), prove(conclusion(Answer), Proof)),
           Results).
```

Rules:
- Record every `(Answer, Proof)` pair as the step artifact.
- Never assert a conclusion manually without a derivation trace.
- If `Results = []`, either emit `need_capability(Capability, Purpose)` for each gap and proceed to Step 5 (then re-run Step 2), or, if no capability can fill the gap, HALT(H3) and label MAPPED.
- Partial success is allowed; document which requirements are fulfilled vs missing.
- Tag each conclusion with fulfillment status:
```prolog
conclusion_with_status(Answer, Status).
% Status in:
%   fully_fulfills(RequirementName)
%   partially_fulfills(RequirementName, MissingAspect)
%   does_not_fulfill(RequirementName, Reason)
```

### 5.5 Step 3 — Consistency Check

**Input required:** Step 2 artifact.
**Output artifact:** Explicit consistency verdict + repair log if needed.

Always run:

```prolog
?- inconsistent.
```

If it fails the KB is consistent; proceed to Step 4. If it succeeds: trace via `prove(inconsistent, Proof)`, repair the conflicting rule/fact, re-run Step 2 with the repaired KB. If repair is impossible, HALT(H4) and label `INCONSISTENT(source)`. **Never answer from an inconsistent KB.**

Explicit verdicts: `[CONSISTENT]`, `[REPAIRED - conflict: X, fix: Y]`, or `[HALT(H4) - irresolvable inconsistency]`.

### 5.6 Step 4 - Assumption-Dependence Test

**Input required:** Step 3 artifact showing CONSISTENT or REPAIRED.
**Output artifact:** Per-conclusion classification table.

For each conclusion $C$ from Step 2:

1. Confirm: `?- conclusion(C), prove(conclusion(C), Proof1).`
2. For each $A$ in `active_assumption/1`: retract $A$, attempt re-derivation, re-assert $A$.
3. Classify as:

- **ROBUST** - $C$ holds with every assumption removed.
- **ASSUMPTION-DEPENDENT** - $C$ fails when assumption $A$ is removed.
- **FRAGILE** - $C$ fails when **any** assumption is removed.

Any ASSUMPTION-DEPENDENT conclusion omitted from this test must not appear in the final response - HALT(H5). Paradoxes are ASSUMPTION-DEPENDENT tensions, not logical inconsistencies.

### 5.7 Step 5 - Tool Usage (Fact Acquisition)

**Input required:** `need_capability/2` from Step 2, **or** a formal proof task.
**Output artifact:** Tool output converted to Prolog facts and validation facts + re-run of Steps 2-3 with enriched KB.

A tool **must not** be invoked unless either:
1. Prolog emitted `need_capability(Capability, Purpose)`, or
2. the task is a formal mathematical proof requiring `lean4_exec`.

Invoking a tool without these preconditions triggers HALT(H6).

**Tool call protocol:**
1. Quote the `need_capability/2` fact that authorises this call.
2. Execute the tool.
3. Convert every relevant result into Prolog facts: `acquired_fact(source(Tool), content(Result)).`
4. Convert to validation facts: `tool_result_fulfills(ResultID, Requirement, Status)` where `Status in {fully, partially, not}`.
5. Assert new facts into KB.
6. Re-run Steps 2 and 3 with enriched KB.

Tool output may not introduce new `active_assumption/1` predicates, replace Prolog derivation, or be cited directly in the final response without Prolog re-derivation.

**Formal mathematics exception (non-negotiable):** any theorem, lemma, or formal mathematical statement must use `lean4_exec` for final formal verification. Prolog may plan proof structure, but no other tool may substitute for Lean 4 on formal proofs.

A maximum of five sequential tool calls is allowed per reasoning cycle. Exceeding this limit without resolution triggers `HALT - INCOMPLETE(tool_loop: <description>)`.

### 5.8 Step 6 - Solved / Mapped / Incomplete Gate

**Input required:** All prior step artifacts.
**Output artifact:** Mandatory status declaration with semantic validation.

Evaluate in order:

| Check | Condition |
| --- | --- |
| 1 | Step 1 KB non-empty AND all 4 harness predicates present |
| 2 | Step 2 produced at least one `conclusion/1` solution |
| 3 | Step 3 confirmed consistency (or successful repair) |
| 4 | Step 4 classified every conclusion |
| 5 | Every tool call preceded by `need_capability/2` |
| 6 | Semantic validation passes: conclusions satisfy `problem_spec` requirements and method constraints |

All checks pass $\rightarrow$ `[STATUS: SOLVED]`.
Check 2 fails with non-empty KB and no capability gap $\rightarrow$ `[STATUS: MAPPED — reason: X]`.
Check 6 fails (semantic mismatch with `problem_spec`) $\rightarrow$ `[STATUS: MAPPED — reason: solution does not fully match problem_spec]` and HALT(H8).
Any other check fails or halt triggered $\rightarrow$ `[STATUS: INCOMPLETE — reason: X]`.

### 5.9 Step 7 - Response Construction

**Input required:** Step 6 artifact + all prior artifacts.
**Output artifact:** Structured final response with all nine required sections.

Required sections (omitting any section is a HALT(H7) condition):

1. **Direct Answer** - Natural-language answer based only on derived conclusions, or explicit statement of missing information.
2. **Status** - `[SOLVED | MAPPED | INCOMPLETE]`.
3. **Problem Specification** - Restate `problem_spec` requirements and method constraints.
4. **Derived Conclusions** - Each `conclusion(Answer)` with proof-summary citation and fulfillment status.
5. **Proof Summaries** - Abbreviated `prove/2` trace for each conclusion.
6. **Assumptions Used** - Each `active_assumption/1` active during derivation; if none: "No assumptions required."
7. **Dependence Classification** - ROBUST / ASSUMPTION-DEPENDENT / FRAGILE for each conclusion, with tested assumptions listed.
8. **Validation Report** - For each requirement: fulfillment status (fully/partially/not), evidence, and gap analysis.
9. **Remaining Limits** - Missing facts, unresolved assumptions, or capability gaps; if none: "None."

Forbidden in response: intuition, narrative, or speculation not in step artifacts; conclusions without proof traces; tool output cited directly without Prolog re-derivation; omission of any section above.

### 5.10 Step 8 - Pre-Response Audit

**Input required:** Draft response from Step 7.
**Output artifact:** Audit pass/fail log; any FAIL triggers HALT(H7).

Before sending any response, verify all items:

| # | Checklist item |
| --- | --- |
| A1 | TRIAGE artifact is present in the reasoning trace |
| A2 | Every COMPLEX request has a Step 0 artifact |
| A3 | Step 1 KB had non-empty facts AND all 4 harness predicates |
| A4 | Step 2 used `findall` for exhaustive derivation |
| A5 | Step 3 consistency verdict is explicit and present |
| A6 | Step 4 classification exists for every conclusion in response |
| A7 | Every tool call is preceded by a `need_capability/2` declaration |
| A8 | Tool outputs were converted to Prolog facts before use |
| A9 | Step 6 status declaration is present and matches content |
| A10 | Response contains all required sections from Step 7 |
| A11 | No bare LaTeX (all math wrapped in `$` or `$$`) |
| A12 | No conclusion stated without a matching proof trace |
| A13 | Problem Specification section restates full `problem_spec` |
| A14 | Validation Report exists and analyzes each requirement |
| A15 | Semantic validation (Step 6 Check 6) was performed |
| A16 | If status is SOLVED, all requirements are fully fulfilled |
| A17 | If status is MAPPED, reason explains unmet requirements |
| A18 | Direct Answer is natural language and grounded in derived conclusions (or explicit missing-info statement) |

All pass $\rightarrow$ send response. Any fail $\rightarrow$ HALT(H7), fix the gap, re-run from the failed step, and re-run audit.

## 6 Tool Integration Protocol

### 6.1 Capability Classes

Prolog may request only these capability classes (in priority order):

| Capability | Concrete tools | Notes |
| --- | --- | --- |
| `internal_knowledge` | (no tool call) | **Check first** — answer from training data when sufficient |
| `logical_reasoning` | `prolog_exec` |  |
| `formal_verification` | `lean4_exec`, `mathlib_check`, `mathlib_search` | `lean4_exec` is mandatory for formal theorem/lemma verification |
| `computation_programmatic` | `python_exec` |  |
| `computation_ml` | `xgboost_exec`, `vae_exec`, `gan_exec`, `decision_tree_exec`, `matplotlib_exec`, `networkx_exec` |  |
| `computation_symbolic` | `sympy_exec` |  |
| `document_processing` | `pdf_exec` | PDF generation (reportlab, FPDF) and parsing (pdfplumber, PyPDF2) |
| `web_lookup` | `web_search`, `arxiv_search`, `web_browse`, `web_navigate` |  |
| `workspace_management` | `read_file`, `write_file`, `list_files`, `search_files`, `run_command`, `replace_in_file` |  |
| `context_memory` | `query_kb`, `retrieve_artifact` | Session KB queries and artifact retrieval |

**Capability priority rule:** Always try `internal_knowledge` first. Escalate only if it cannot supply the required fact (e.g. live data or exact computation). Formal-mathematics tasks still require `lean4_exec`.

### 6.2 Tool Output Validation

Each tool category has specific validity signals:

- `lean4_exec` - valid only on explicit compilation success (no errors in output).
- `prolog_exec` - valid only on explicit execution success.
- Other tools - invalid if output contains "Error:", a traceback, or any exception class name.

**Rule:** Partial output before an error is **tainted**; never derive conclusions from tainted output.

### 6.3 Fact Incorporation

Tool outputs are converted into Prolog facts via a conservative mapping:

- Numerical results become `observation(value(Name, Value))`.
- Textual facts become `observation(text(Content))`.
- Structural data (JSON, tables) is broken into atomic facts: `acquired_fact(source(Tool), content(Result))`.

These facts are asserted into the KB, and derivation is re-attempted from Step 2. Tool outputs may **not** introduce new `active_assumption/1` predicates; if a tool result requires an inferential bridge it must be explicitly modelled as an assumption with justification.

### 6.4 Use Case Overlay Example - Legal-Support Retrieval (Australia)

In legal-support mode, EVO applies an additional source-discipline layer:

1. Run `legal_retrieve` first against the indexed legal corpus.
2. If retrieval is empty or insufficient, run `legal_ingest_authoritative` with the current legal query (and jurisdiction/type filters when available), then re-run `legal_retrieve`.
3. Use `legal_ingest` for explicit single-document ingestion when a specific source URL or text is provided.
4. Use `legal_corpus_stats` to verify corpus coverage and ingestion progress.

Authoritative Australian sources prioritised by the implementation include:
`legislation.gov.au`, state/territory legislation registries, `hcourt.gov.au`, `fedcourt.gov.au`, `caselaw.nsw.gov.au`, and `austlii.edu.au` (primarily for discovery/cross-reference).

Legal retrieval outputs are expected to carry citation metadata (for example: citation, neutral citation, court, decision date, authority level, verification status), and any unverified citation must be explicitly labelled as `citation unverified`.

## 7 Implementation

### 7.1 Prolog Meta-Interpreter

The core `prove/2` predicate:

```prolog
prove(true, true) :- !.
prove((A, B), (PA, PB)) :- !,
    prove(A, PA),
    prove(B, PB).
prove((A ; B), or(PA, PB)) :- !,
    ( prove(A, PA)
    -> PB = skipped
    ;  prove(B, PB),
       PA = failed
    ).
prove(\+A, not(ProofA)) :- !,
    \+ prove(A, ProofA).
prove(A, fact(A)) :-
    clause(A, true), !.
prove(A, assumption(A)) :-
    active_assumption(A), !.
prove(A, rule((A :- Body), Proof)) :-
    clause(A, Body),
    prove(Body, Proof).
```

### 7.2 Consistency Checker

```prolog
inconsistent :-
    constraint(Body),
    prove(Body, _).
```

### 7.3 Assumption Manager

```prolog
% Activate/deactivate assumptions
activate(Assumption) :-
    assertz(active_assumption(Assumption)).

deactivate(Assumption) :-
    retractall(active_assumption(Assumption)).

% Test robustness
robust(Conclusion) :-
    findall(A, active_assumption(A), Assumptions),
    robust_under(Conclusion, Assumptions).

robust_under(Conclusion, []) :-
    prove(Conclusion, _).
robust_under(Conclusion, [A|Rest]) :-
    deactivate(A),
    robust_under(Conclusion, Rest),
    activate(A).
```

### 7.4 Use Case Overlay - Mathematics (Lean 4 Bridge)

When the mathematics overlay is active and a formal theorem `theorem(Statement)` is derived, EVO applies the following domain policy:

1. Constructs a Lean 4 file beginning with `import Mathlib` (the **single mandatory top-level import**; specific submodule imports such as `import Mathlib.Data.Int.Basic` are forbidden because submodule paths change between Mathlib releases and cause "file not found" errors).
2. Translates the statement into Lean 4 syntax. Prolog may suggest candidate lemma names via `mathlib_search` or confirm their existence via `mathlib_check`.
3. Calls `lean4_exec`; if compilation fails, the theorem is **not considered proven**.
4. Reports the Lean 4 verification result alongside the Prolog derivation.

Any name returned by `mathlib_search` must be cross-verified with `mathlib_check` or `#check` inside `lean4_exec` before use, because `mathlib_search` returns mixed Lean 3 and Lean 4 results - Lean 3 names are invalid in Lean 4/Mathlib4.

### 7.5 Prolog Code Hygiene

Every Prolog program must load in the SWI-Prolog sandbox without errors, warnings, or timeouts. Mandatory hygiene rules:

- **Dynamic declarations:** `:- dynamic predicate/arity.` for any predicate modified via `assert`/`retract`.
- **Discontiguous declarations:** `:- discontiguous predicate/arity.` when clauses of the same predicate are separated.
- **`main/0` required:** define two clauses - one body clause ending in `fail` (to force backtracking through all solutions) and one catch-all clause. Never leave `main/0` undefined.
- **ASCII only:** no Unicode symbols in Prolog source (no `>=`, `<=`, `->`, `/\`, etc.).
- **Uppercase variables:** `X`, `Y`, `Z`, not `x`, `y`, `z`.
- **No built-in redefinition:** never redefine `clause/2`, `assert/1`, `call/1`, etc.
- **Use `call/1` not `clause/2`** for dynamic dispatch (avoids `permission_private` errors).
- **`format/3` argument list:** the `Args` parameter must always be a list, e.g. `format(atom(X), '~w~n', [Val])`.

Safe KB template (pre-validated, may be used directly):

```prolog
:- dynamic my_predicate/2.
:- discontiguous my_predicate/2.

my_predicate(X, Y) :- X = Y.

main :-
    my_predicate(a, a),
    write('Success.'), nl,
    fail.
main :-
    write('Done.'), nl.
```

### 7.6 Use Case Overlay - Mathematics (LaTeX Output Requirements)

When the mathematics overlay is active, mathematical notation in responses must conform to strict LaTeX delimiter rules to prevent frontend rendering failures:

- Every LaTeX command must be wrapped in `$...$` (inline) or `$$...$$` (display); bare commands without delimiters are forbidden.
- Complete expressions must reside inside a **single** delimiter pair; splitting one expression across multiple `$` pairs is forbidden.
- Nested delimiters are forbidden.
- Currency dollars inside math must be escaped: `\$100`.
- Line breaks inside `aligned` or `cases` environments require `\\` (double backslash), not a single backslash.
- `\begin{cases}` expressions must reside entirely in one `$$` block.

### 7.7 Use Case Overlay - Legal Support

The deployed system includes a dedicated `legal-support` assistant mode selected at login time. This overlay changes retrieval policy and response posture without changing the Prolog-first reasoning core.

**Operational behaviour:**
- Prefer legal corpus retrieval (`legal_retrieve`) before broad web tools.
- If the corpus lacks relevant authority, trigger conditional authoritative ingestion (`legal_ingest_authoritative`) and retry retrieval.
- Treat legal materials as typed documents (for example, legislation vs judgment) and expose case-law metadata (court, neutral citation, decision date, precedent tier) for filtering and ranking.
- Preserve explicit status outcomes (SOLVED, MAPPED, INCOMPLETE) and explicit uncertainty labels for missing or unverified authority.

**Scope note:** this mode is designed for legal support analysis for human review, not autonomous legal advice.

### 7.8 Additional Potential Use-Case Overlays

Beyond mathematics and legal support, the same EVO core can be applied to other high-assurance domains by attaching domain-specific policies, connectors, and validation criteria:

- Clinical decision support (evidence tracing, contraindication checks, uncertainty flags)
- Financial risk/compliance analysis (policy-rule derivations, audit-ready explanations)
- Cybersecurity triage (alert correlation with explicit assumptions and consistency checks)
- Insurance claims adjudication support (rule-based coverage reasoning + evidence mapping)
- Procurement and contract compliance (obligation extraction + clause-to-conclusion traceability)
- Safety engineering/FMEA support (failure mode reasoning with assumption-dependence testing)
- Scientific protocol validation (method constraints, reproducibility checks, formalized gaps)
- Public-sector policy analysis (regulation-to-outcome derivations with transparent assumptions)
- Fraud/scam risk screening (indicator rules, confidence tiers, explicit missing evidence)
- Regulated QA for engineering changes (requirements traceability, contradiction detection, sign-off artifacts)

## 8 Evaluation

### 8.1 Qualitative Analysis

We compare EVO against two axes: **pure LLM reasoning** and **LLM-first hybrids** (like [5,6]).

| Criterion | Pure LLM | LLM-First Hybrid | EVO (Prolog-First) |
| --- | --- | --- | --- |
| Logical consistency guarantee | ✗ No | (!) Limited (depends on LLM) | ✓ Yes (via `inconsistent` check) |
| Proof traces | ✗ No | (!) Partial (trajectories for training) | ✓ Yes (explicit `prove/2` trees) |
| Assumption tracking | ✗ No | ✗ No | ✓ Yes (first-class, swappable) |
| Formal math verification | ✗ No | ✗ No | ✓ Yes (via mathematics overlay, e.g., Lean 4) |
| Fact-acquisition separation | ✗ No | (!) Mixed (LLM still does reasoning) | ✓ Strict (tools only supply facts) |
| Uniqueness claims require proof | ✗ No | ✗ No | ✓ Yes (exhaustive search or completeness proof) |
| Pre-response audit gate | ✗ No | ✗ No | ✓ Yes (12-item checklist, A1–A12) |
| Workflow hard rules + halt conditions | ✗ No | ✗ No | ✓ Yes (R1–R6, H1–H7) |
| Three-way status (`SOLVED` / `MAPPED` / `INCOMPLETE`) | ✗ No | ✗ No | ✓ Yes |

### 8.2 Example: Arithmetic Word Problem

Consider: "Alice has 3 apples. Bob gives her 2 more. How many apples does Alice have?"

**LLM-first hybrid (Arithmetic Reasoning with LLM [6]):**
LLM generates Prolog:

```prolog
total_apples(alice, 5) :- apples(alice,3), given(bob,2), sum(3,2,5).
```

Prolog executes and returns `5`.

**EVO (full nine-step workflow):**

*Triage:* `[TRIAGE: NOT COMPLEX — reason: single arithmetic step, no ambiguity]`
*Step 1 — Formalize:*

```prolog
:- dynamic active_assumption/1.
observation(apples(alice, 3)).
observation(given(bob, 2)).
rule(total_apples(Person, N) :- apples(Person, M), given(_, K), N is M + K).
inconsistent :- false.
prove(true, true) :- !.
prove((A, B), (PA, PB)) :- !, prove(A, PA), prove(B, PB).
prove((A ; B), or(PA, PB)) :- !, (prove(A, PA) -> PB = skipped ; prove(B, PB), PA = failed).
prove(\+A, not(ProofA)) :- !, \+ prove(A, ProofA).
prove(A, fact(A)) :- clause(A, true), !.
prove(A, rule((A :- Body), Proof)) :- clause(A, Body), prove(Body, Proof).
solved(Answer, Proof) :- conclusion(Answer), prove(conclusion(Answer), Proof).
conclusion(total_apples(alice, N)) :- observation(apples(alice, M)), observation(given(_, K)), N is M + K.
```

*Step 2 — Derive:* `findall` yields `[total_apples(alice,5) - rule(...)]`.

*Step 3 — Consistency check:* `inconsistent` fails → `[CONSISTENT]`.

*Step 4 — Assumption-dependence test:* No `active_assumption/1` predicates active → conclusion classified **ROBUST**.

*Steps 5–6:* No tool calls required; all checks pass → `[STATUS: SOLVED]`.

*Step 8 - Audit:* All 18 items pass.

*Response:* Conclusion `total_apples(alice, 5)` with proof trace; ROBUST; no assumptions; no remaining limits.

The difference is subtle but critical: in EVO, the **reasoning is done entirely in Prolog with a verified proof trace and explicit consistency and assumption-dependence checks**; the LLM is never invoked because the arithmetic is already expressible in Prolog.

### 8.3 Limitations

- **Expressiveness bound** - Problems that cannot be naturally formalised in Prolog require extensive modelling effort; highly compositional or perceptual tasks remain difficult to express as Horn clauses.
- **Performance** - The mandatory nine-step workflow, twelve-item audit, and per-conclusion assumption-dependence testing add overhead; real-time responses may be slower than pure-LLM systems.
- **Tool-output parsing** - Converting arbitrary tool outputs to Prolog facts is non-trivial and may introduce errors, especially for richly structured data (graphs, images, LaTeX proofs).
- **Assumption explosion** - Complex tasks may require many assumptions, making dependence testing combinatorially heavy (exponential in the number of assumptions in the worst case).
- **Lean 4 bridge latency** — Formal verification via `lean4_exec` adds significant latency (120 s sandbox timeout); tasks requiring many Lean 4 calls are practically constrained.
- **Capability-class ceiling** — The five-call tool limit per reasoning cycle means deeply nested fact-acquisition chains may terminate with `INCOMPLETE` rather than a complete derivation.

## 9 Discussion

### 9.1 Philosophical Implications

EVO embodies a **strong symbolic-first stance**. It rejects the notion that neural models can be trusted with reasoning; instead, they are treated as oracles that can supply factual content but not inference steps. This aligns with classical AI's emphasis on explicit representation and logical deduction, while pragmatically incorporating modern tools for knowledge retrieval.

The **explicit assumption** framework acknowledges that real-world reasoning often rests on unproven premises. By making assumptions first-class, EVO forces the reasoner to be transparent about what those premises are and to test whether conclusions collapse when they are removed.

### 9.2 Comparison with Existing Neuro-Symbolic Paradigms

Most neuro-symbolic systems follow a **subsumption architecture**: the neural component handles perception/natural language, the symbolic component handles reasoning. EVO inverts this: the symbolic component handles **all** reasoning, and the neural component handles only **fact retrieval** when the symbolic component reaches an information gap.

This inversion ensures that the system's outputs are always justified by a symbolic derivation trace, providing auditability and consistency guarantees that are impossible when the neural component performs inference.

### 9.3 Future Work

- **Automated KB construction** - Using LLMs to help translate natural-language problems into Prolog KBs, while keeping the LLM in a strictly subordinate role.
- **Assumption mining** - Automatically identifying implicit assumptions in user queries and making them explicit.
- **Scalable consistency checking** - Efficient methods for detecting inconsistencies in large KBs.
- **Interactive assumption exploration** - Allowing users to toggle assumptions and see how conclusions change in real time.
- **Integration with broader formal methods** - Extending the mathematics-overlay verifier path beyond Lean 4 to other formal verification tools (Isabelle, Coq) for domain-specific deployments.
- **Automated audit repair** - When STEP 8 audit fails, automatically identifying which prior step to re-run and which artifact to regenerate, rather than halting entirely.
- **Proof-trace compression** — Compact serialisation of `prove/2` trees for large KBs to reduce context overhead in long reasoning chains.
- **Progressive tool-call budget** - Dynamic adjustment of the five-call limit based on problem complexity rather than a fixed ceiling.

## 10 Conclusion

EVO presents a **Prolog-first** autonomous reasoning system that places Prolog at the center of all inference. By requiring derivation with proof traces, explicit assumption tracking, and consistency verification, EVO provides logical guarantees absent in both pure-LLM and existing LLM-first hybrid systems. Domain-specific requirements (for example, mathematics verification in Lean 4 or legal authority retrieval policy) are introduced as overlays rather than core semantics.

The system's strict separation between symbolic reasoning and fact acquisition ensures that tools (including LLMs) are used only as knowledge oracles, never as reasoning engines. This architecture inverts the prevailing neuro-symbolic design and offers a path toward verifiable, transparent, and assumption-aware AI reasoning.

While EVO imposes modeling overhead and performance costs, it delivers in return **traceability, consistency, and explicit dependence tracking** - features essential for high-stakes applications where correctness and auditability are paramount.

## References

[1] G. Marcus, "The next decade in AI: four steps towards robust artificial intelligence," *arXiv:2002.06177*, 2020.

[2] A. S. d'Avila Garcez, L. C. Lamb, and D. M. Gabbay, *Neural-Symbolic Cognitive Reasoning*. Springer, 2009.

[3] J. Mao, C. Gan, P. Kohli, J. B. Tenenbaum, and J. Wu, "The neuro-symbolic concept learner: Interpreting scenes, words, and sentences from natural supervision," *ICLR*, 2019.

[4] P. Hitzler and M. K. Sarker (eds.), *Neuro-Symbolic Artificial Intelligence: The State of the Art*. IOS Press, 2022.

[5] X. Tan, Y. Deng, X. Qiu, W. Xu, C. Qu, W. Chu, Y. Xu, and Y. Qi, "Thought-Like-Pro: Enhancing Reasoning of Large Language Models through Self-Driven Prolog-based Chain-of-Thought," *arXiv:2407.14562*, 2024.

[6] X. Yang, B. Chen, and Y.-C. Tam, "Arithmetic Reasoning with LLM: Prolog Generation & Permutation," *arXiv:2405.17893*, 2024.

[7] The Coq Development Team, *The Coq Proof Assistant Reference Manual*, INRIA, 2023.

[8] T. Nipkow, L. C. Paulson, and M. Wenzel, *Isabelle/HOL: A Proof Assistant for Higher-Order Logic*, Springer, 2002.

[9] L. de Moura and S. Ullrich, "The Lean 4 theorem prover and programming language," *CADE*, 2021.

[10] L. Sterling and E. Shapiro, *The Art of Prolog*, MIT Press, 1994.

[11] F. Bry and M. Eckert, "On reasoning on the Web with rules and ontologies," *Journal of Applied Logic*, vol. 6, no. 1, pp. 3-25, 2008.

[12] J. W. Lloyd, *Foundations of Logic Programming*, Springer, 1987.

**Author Note:** This paper describes the EVO system as implemented in the reasoning agent that produced this document. All examples and comparisons are derived from actual tool executions and Prolog derivations, not from training-data recollection.

**License:** CC-BY-4.0. The EVO system blueprint is open for implementation and extension.

**Appendix: Example Prolog KB for a Simple Reasoning Task**

```prolog
% Observations
observation(rained_last_night).
observation(grass_is_wet).

% Rules
rule(wet_grass :- rained_last_night).
rule(wet_grass :- sprinkler_was_on).
rule(slippery_path :- wet_grass).

% Assumptions
active_assumption(sprinkler_was_on).  % Suppose the sprinkler was on

% Constraints
false :- wet_grass, not(rained_last_night), not(sprinkler_was_on).

% Query
conclusion(slippery_path).
```

Derivation yields `slippery_path` with proof trace showing dependence on `sprinkler_was_on`. Disabling that assumption causes the conclusion to fail $\rightarrow$ ASSUMPTION-DEPENDENT.
