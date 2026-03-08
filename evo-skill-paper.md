## Abstract

This paper describes the **EVO Skill**: a practical packaging of EVO (Explicit-assumption Verification Orchestrator) as an installable skill for agent CLIs. EVO inverts the dominant "LLM-first" pattern by requiring that conclusions be *derived* rather than merely explained from a symbolic model, with assumptions made explicit, consistency verified, and assumption-dependence tested. The EVO Skill operationalizes this protocol by coupling a strict `default_prompt` with an executable local toolchain: a minimal Prolog harness for proof tracing and inconsistency detection, a Python runner that orchestrates the harness, and a companion `prolog-runner` skill that executes SWI-Prolog and returns JSON bindings. We document the formal model, the mandatory workflow, and the concrete file-level implementation for Codex CLI and Claude Code.

**Keywords:** autonomous reasoning, Prolog-first, explicit assumptions, inconsistency checking, proof traces, assumption-dependence testing, agent skills, CLI automation.

## 1 Introduction

Large language models are fluent but not inherently verifiable: they can produce plausible narratives that are logically inconsistent, assumption-laden, or unsupported by executable evidence. EVO (Explicit-assumption Verification Orchestrator) addresses this by defining a strict protocol for what counts as reasoning and by forcing all authority to come from derivation.

This document focuses on the **EVO Skill**: a concrete packaging of EVO for agent CLIs. The skill is deliberately split into:

1. **Normative layer (protocol):** encoded in the EVO agent `default_prompt` (Codex/OpenAI agent manifest), which prescribes a mandatory workflow and forbids "from memory" conclusions.
2. **Executable layer (toolchain):** a minimal Prolog harness and a Python orchestrator that produce auditable artifacts such as proof traces, inconsistency checks, and assumption-drop tests as machine-readable JSON.

## 2 Related Work (Brief)

EVO is a neuro-symbolic design in the broad sense, but it differs from most hybrids by making the symbolic component primary rather than a post-hoc validator. While theorem provers and logic programming systems provide rigorous reasoning, they often lack a practical integration path into general-purpose coding workflows. EVO targets that gap by turning a verification discipline into a "skill" that can be installed into CLI agents.

## 3 System Architecture of the EVO Skill

The EVO Skill is implemented as two sibling skills installed under the CLI's skills directory:

- `evo/`: the EVO agent prompt, harness runner, and Prolog references.
- `prolog-runner/`: a SWI-Prolog execution wrapper returning JSON solutions.

Conceptually, the flow is:

1. The EVO agent prompt requires Prolog-first formalization and derivation.
2. The agent produces or updates a task-specific Prolog KB.
3. The runner executes the harness against that KB for derivations and checks.
4. The agent translates the resulting artifacts into a natural-language answer with an explicit status label.

## 4 Formal Model (EVO)

### 4.1 Knowledge Base Structure

A knowledge base (KB) in EVO can be described as a tuple $\mathcal{K} = (\mathcal{F}, \mathcal{R}, \mathcal{A}, \mathcal{C})$ where:

- $\mathcal{F}$ is a set of **facts** (ground atomic formulas).
- $\mathcal{R}$ is a set of **rules** (typically Horn clauses).
- $\mathcal{A}$ is a set of **assumptions** (formulas treated as true for a particular inference but explicitly toggleable).
- $\mathcal{C}$ is a set of **consistency constraints** (integrity rules that must not be violated).

In the EVO harness, assumptions are activated via `enabled_assumption/1` and tested via derivations under different enabled sets.

### 4.2 Proof-Traced Derivation

EVO requires that conclusions are not merely stated but derived with a proof trace. The Prolog harness provides a meta-interpreter `prove(Goal, Proof)` that records why each goal holds, including observation, claim, premise, rule application, and enabled assumption. A conclusion is accepted only if the agent can derive:

`conclusion(Answer)` together with `prove(conclusion(Answer), Proof)`.

### 4.3 Assumptions as First-Class Objects

EVO treats assumptions as explicit inference bridges, not background context. Any inference not strictly entailed by $\mathcal{F} \cup \mathcal{R}$ must be represented as an assumption in $\mathcal{A}$ and must be testable by removal or substitution. Hidden bridges such as "is implies ought" or "ideal implies actual" are forbidden.

### 4.4 Consistency Constraints

Before responding, EVO must check whether the KB is inconsistent. In the harness this is expressed via `constraint/2` (a named violating goal) and optionally `contradiction/2` (two goals that should not hold together). The required rule is simple: never answer from an inconsistent KB.

## 5 The Explicit-Assumption Verification Workflow

### 5.1 What Counts as Reasoning

The EVO agent prompt defines three statuses:

- **SOLVED:** at least one conclusion is derivable with proof, the KB is consistent, assumption-dependence testing is completed for key conclusions, and any uniqueness claim is proven.
- **CANDIDATE:** a plausible conclusion exists but one of the required gates is incomplete, such as uniqueness remaining unproven or formalization being incomplete.
- **MAPPED:** no conclusion was derived; the output is exploratory enumeration, categorization, or partial analysis.

### 5.2 Mandatory Steps (Condensed)

The EVO prompt prescribes a mandatory workflow that can be summarized as:

1. **Formalize:** translate the task into a Prolog KB with observations, claims, premises, rules, explicit assumptions, constraints, and a `conclusion/1` goal.
2. **Derive:** attempt to derive all relevant conclusions with proof traces.
3. **Consistency check:** run `inconsistent` and repair or report contradictions; never answer from an inconsistent KB.
4. **Assumption-dependence test:** re-derive key conclusions while disabling assumptions one-by-one; label conclusions robust versus assumption-dependent.
5. **Tool usage (facts only):** external tools may supply missing facts or primitive computations, but must not replace Prolog derivation; tool outputs must be injected as facts before influencing conclusions.
6. **Uniqueness discipline:** phrases like "the only" require proof by exhaustive search or completeness argument; otherwise downgrade to candidate and state limitations.
7. **Response format:** output must be natural language, include assumptions and confidence status, and list sources when external URLs were used.

### 5.3 Paradox vs Inconsistency

EVO distinguishes:

- **Inconsistency:** a constraint is violated or an explicit contradiction is derivable. This halts conclusions until repaired or reported.
- **Paradox or tension:** a conclusion exists only under certain assumptions and disappears when those assumptions are removed. This must be reported as assumption-dependent rather than as a hard contradiction.

## 6 Tool Integration Protocol (Skill-Level)

The EVO prompt restricts tool usage to fact acquisition, while Prolog remains the reasoner. In the EVO Skill implementation, external outputs are intended to become inputs to Prolog derivation rather than being treated as conclusions directly. A typical two-stage pattern is:

1. **Evidence injection:** external outputs such as files, command output, and web results are summarized as Prolog terms, often `observation/1`, `claim/1`, or domain-specific facts.
2. **Re-derivation:** conclusions are then re-derived in Prolog using those injected terms, producing proof traces that justify the final answer.

In practice, the EVO Skill's local derivation pipeline is executed by two scripts:

- `evo/scripts/evo_run.py`: orchestrates the harness and assumption-drop tests.
- `prolog-runner/scripts/run_prolog.py`: executes SWI-Prolog (`swipl`) and returns JSON variable bindings.

## 7 Implementation Details (Codex CLI and Claude Code)

### 7.1 Codex/OpenAI Agent Definition

The file `agents/openai.yaml` defines the EVO agent identity and, critically, contains a large `default_prompt` that encodes the EVO workflow and response constraints. The prompt is the normative layer: it dictates what the agent must do and what it must not do.

### 7.2 Prolog Harness (`references/evo_harness.pl`)

The harness is intentionally minimal and provides:

- `prove/2`: proof-tracing meta-interpreter.
- `conclusion_with_proof/2`: derive `conclusion(Answer)` with proof trace.
- `inconsistent/0`: detect constraint violation or explicit contradiction via the same derivation semantics.

### 7.3 Runner Orchestration (`scripts/evo_run.py`)

The runner constructs a temporary Prolog program by concatenating:

1. the harness code,
2. the task KB from files or inline text,
3. injected `enabled_assumption(Name).` facts.

It then executes:

- `inconsistent.`
- `conclusion_with_proof(Answer, Proof).`

and performs per-assumption removal tests when assumptions are enabled. The output is a single JSON payload containing raw outputs and a summarized list of conclusions, proofs, and robustness tests.

### 7.4 Template KB (`references/template_kb.pl`)

The template shows the intended structure of task KBs: observations, claims, named rules, optional assumptions, constraints or contradictions, and a required `conclusion/1` predicate.

### 7.5 Claude Code

Claude Code can load the EVO instructions as a skill or a sub-agent definition. When local command execution is enabled, Claude can run the same harness toolchain. When command execution is disabled, the protocol still applies, but the user must run the local runner and provide JSON outputs for the agent to interpret.

## 8 Worked Example (Minimal)

The following KB sketches a tiny problem where a conclusion depends on an assumption. It is written in the style expected by the included harness: derivations are expressed via `rule/3` and `assumption/2` facts, and the derived target is a `conclusion(...)` goal.

```prolog
% Observations
observation(rained_last_night).

% Rules
rule(wet_grass_from_rain, wet_grass, [rained_last_night]).
rule(slippery, slippery_path, [wet_grass]).

% Assumption (toggleable)
assumption(sprinkler_on, wet_grass).

% Conclusion must be derivable via rule/3 for the harness proof tracer
rule(conclude, conclusion(slippery_path), [slippery_path]).
```

With `sprinkler_on` enabled via an injected `enabled_assumption(sprinkler_on).` fact, `wet_grass` can still be derived even if `rained_last_night` were not present; removing that assumption can cause `slippery_path` to become underivable. EVO requires that this dependence be tested and reported as assumption-dependent rather than being presented as unconditional.

## 9 Limitations and Future Work

- **Modeling overhead:** formalization into a KB requires discipline and time.
- **Coverage limits:** some domains require richer libraries or ontologies to be formalized efficiently.
- **Search complexity:** large rule sets can create expensive search; the harness is minimal and does not include advanced optimizations such as tabling.
- **Operational dependencies:** automation requires SWI-Prolog installed and the CLI permitting local command execution.

## 10 Conclusion

The EVO Skill turns a strict explicit-assumption verification protocol into a reproducible CLI toolchain. Its distinguishing property is not simply "using Prolog", but enforcing derivations with proof traces, explicit and testable assumptions, consistency gates, assumption-dependence testing, and strict outcome labeling with uniqueness discipline. Packaging these constraints alongside executable tooling makes the workflow auditable and repeatable in real agent-driven coding sessions.

## References

1. L. Sterling and E. Shapiro, *The Art of Prolog*. MIT Press, 1994.
2. J. W. Lloyd, *Foundations of Logic Programming*. Springer, 1987.
3. SWI-Prolog, "SWI-Prolog Reference Manual," <https://www.swi-prolog.org/>.

**Author Note:** This paper is an implementation-oriented restatement of EVO as packaged in the EVO Skill (agent prompt, harness, and runner). It is intended to complement the conceptual EVO paper by specifying how the protocol is operationalized in Codex CLI and Claude Code via installable skill folders.

**License:** CC-BY-4.0.
