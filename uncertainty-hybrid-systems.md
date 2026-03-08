## Abstract

Large Language Models (LLMs) exhibit strong generative and reasoning-like capabilities but remain probabilistic and prone to hallucination, particularly in multi-step inference chains. This paper introduces a hybrid LLM-symbolic architecture that relocates uncertainty to explicit, inspectable boundaries. Natural language is translated into a Prolog knowledge base via an LLM, inference is performed deterministically using Prolog resolution, and results are returned with structured success or failure artifacts identifying blocking predicates and provenance. We formalize this as *error-mode transformation*: plausibility-driven uncertainty in pure LLMs becomes bounded modeling uncertainty concentrated at the formalization layer. We define a four-layer epistemic model, sketch multi-step chain containment in medical and legal reasoning scenarios, and propose an empirical evaluation framework including adversarial formalization tests, hallucination comparisons, and human-rated failure audits. The core claim is governance-oriented: in high-stakes domains, accountability may outweigh marginal gains in unconstrained fluency.

## Introduction

Large Language Models (LLMs) demonstrate impressive fluency across domains. However, they remain probabilistic systems that can produce hallucinated intermediate inferences. In high-stakes domains, this kind of undetectable logical drift presents unacceptable risk.

This paper advances a different architectural objective: not eliminating uncertainty, but relocating it to explicit, inspectable boundaries.

We introduce a hybrid LLM-Prolog system in which:

1. Natural language is translated into a formal knowledge base (KB).
2. Inference is performed via deterministic Prolog resolution.
3. Structured failure artifacts are returned when derivations fail.
4. Reasoning artifacts are inspectable and auditable.

The central thesis is:

> Hybrid constraint-enforced architectures transform diffuse generative uncertainty into bounded modeling uncertainty.

## Related Work

### Neurosymbolic AI

Neurosymbolic systems integrate neural and symbolic reasoning. Prior work focuses primarily on performance gains or interpretability improvements. The contribution here instead centers on epistemic topology and uncertainty structure.

### Hallucination in LLMs

Hallucination has been studied as unsupported inference or fabrication. Mitigation strategies such as retrieval augmentation and calibration can reduce the probability of hallucination, but they do not provide structural guarantees.

### Formal Methods

Formal verification provides correctness relative to specifications. However, applying full formal methods to open-domain LLM reasoning remains challenging.

## Formal Layer Model

Let:

- $L$ be a language model,
- $F: NL \rightarrow KB$ be a formalization function,
- $P$ be a Prolog inference engine,
- $E: Result \rightarrow NL'$ be a presentation function.

Pipeline:

$$
NL \xrightarrow{L} KB \xrightarrow{P} Result \xrightarrow{E} NL'
$$

### Formal Properties

**Theorem 1 (Soundness within KB).** If Prolog derives $q$ from $KB$, then $KB \models q$.

*Proof sketch.* SLD resolution is sound for Horn clause logic.

**Theorem 2 (Chain containment).** If step $k$ fails in a reasoning chain, downstream steps are blocked.

*Proof sketch.* Downstream rule antecedents depend on $s_k$; failure blocks derivation.

**Theorem 3 (Formalization completeness).** For all task clauses $c \in Task$, either there exists a predicate $p \in KB$ such that $\text{formalizes}(p, c)$, or there exists an assumption $a \in A$ such that $\text{assumes}(a, c)$ where $A$ is the explicit assumption set.

*Proof sketch.* This property is enforced by explicit tracking of formalization mappings and assumption declarations. Silent clause omission is forbidden.

### Assumptions as First-Class Objects

Traditional neurosymbolic systems treat assumptions as implicit background knowledge. This architecture instead elevates assumptions to explicit, manipulable inference bridges.

An assumption $\alpha$ is an explicit inference rule that can be:

- **Enabled:** $\alpha \in KB$
- **Disabled:** $\alpha \notin KB$
- **Swapped:** $\alpha$ replaced by alternative $\alpha'$

Every inference not strictly entailed by observations must be represented as an explicit assumption predicate:

```prolog
active_assumption(bridge_ideal_to_actual).
active_assumption(closed_world_assumption).

conclusion(C) :-
    observation(O),
    active_assumption(A),
    infer(O, A, C).
```

This enables assumption-dependence testing.

## Assumption-Dependence Testing

A critical feature distinguishing this architecture is mandatory assumption-dependence testing. For each derived conclusion $C$:

1. Derive $C$ with current assumptions, yielding `Proof_1`.
2. Disable assumptions one by one, or substitute alternatives.
3. Attempt to re-derive $C`, yielding `Result_2`.

Classification:

- **ROBUST:** the conclusion holds without the assumption.
- **ASSUMPTION-DEPENDENT:** the conclusion fails when the assumption is removed.

### Example: Legal Reasoning Paradox

Consider the statement: "A law that permits lying to prevent injustice creates a paradox."

```prolog
observation(law_permits_lying_to_prevent_injustice).

% Explicit assumption bridge
active_assumption(truthfulness_always_required).

conclusion(paradox_exists) :-
    observation(law_permits_lying_to_prevent_injustice),
    active_assumption(truthfulness_always_required),
    contradicts(lying, truthfulness).
```

Testing by disabling `truthfulness_always_required` causes `conclusion(paradox_exists)` to fail.

The paradox is therefore **ASSUMPTION-DEPENDENT**, not inherent to the observation. This separates genuine logical contradictions from tensions arising from normative assumptions.

## Tripartite Classification System

The architecture enforces a three-way classification of task outcomes:

- **SOLVED:** all requirements are met. A conclusion is derivable with proof, consistency is verified, assumption-dependence testing is completed, formalization is complete, and uniqueness is proven where claimed.
- **CANDIDATE:** a solution exists but the proof obligations are incomplete, such as uniqueness remaining unproven, simplifying assumptions remaining, or early termination without a completeness proof.
- **MAPPED:** no solution was derived; the output is only enumeration, categorization, or partial analysis.

This classification prevents overclaiming. A system that finds *a* solution without proving uniqueness must report **CANDIDATE**, not **SOLVED**.

## Uniqueness Verification Requirement

When claiming a solution is "unique," "the only," or "singular," the system must provide one of:

- **Exhaustive search proof:** `exhaustive_search(all_checked, count(N))`
- **Completeness proof:** `completeness_proof(early_stop_preserves_all)`

Without such proof:

- classify the result as `candidate_solution(uniqueness_unproven)`,
- state "Found a solution" rather than "Found the only solution."

### Example: Tool Integration

Consider a tool that searches for solutions but terminates early:

```prolog
tool_result(search_database, found_item(x42),
            metadata(early_stop, first_match)).
```

The system must respond with a candidate rather than a unique solution:

```prolog
conclusion(candidate_solution(x42)) :-
    tool_result(search_database, found_item(x42), _),
    \+ exhaustive_search_completed.

status(candidate, reason(uniqueness_unproven)).
```

This prevents confusing "found first" with "proved only."

## Formalization Completeness Checking

A critical constraint ensures there is no silent clause omission. For each clause in the original natural-language task, one of the following must exist:

- `formalized_as(Clause, Predicate)`, or
- `simplification_assumption(Clause, Reason)`

Trigger patterns requiring formalization include:

- "only if" or "only when" implying a conditional rule,
- "this statement" implying an explicit fact or rule,
- quantifiers such as "all," "some," and "none" implying universal or existential predicates.

Silent clause omission without justification is forbidden.

### Example: Contract Interpretation

Natural language: "Payment is due only when services are completed and verified."

Complete formalization:

```prolog
payment_due(Contract) :-
    services_completed(Contract),
    services_verified(Contract).

formalized_as('payment due only when services completed
               and verified',
              'payment_due(Contract) :-
               services_completed(Contract),
               services_verified(Contract)').
```

Incomplete formalization, which is forbidden:

```prolog
payment_due(Contract) :- services_completed(Contract).
% Missing verification requirement with no justification.
```

## Tool Integration Constraint

A distinguishing architectural rule is that tools supply facts only; reasoning remains in Prolog.

Tool usage protocol:

1. Prolog attempts derivation with the current KB.
2. If derivation fails because information is missing, the system emits `need_capability(Capability, Purpose)`.
3. A tool is invoked to acquire missing facts.
4. Tool output is converted into Prolog facts.
5. Derivation is re-attempted with the augmented KB.

Tool outputs containing reasoning, inferences, or conclusions are forbidden. They must be re-derived within Prolog.

### Example: Medical Diagnosis

```prolog
% Initial KB - missing lab results
symptom(patient_42, fever).
symptom(patient_42, cough).

% Derivation attempt
?- confirmed_diagnosis(patient_42, bacterial_pneumonia).
% Fails: no lab_result/2 facts

% System emits
need_capability(lab_database_lookup,
                retrieve_lab_results(patient_42)).

% Tool invoked, returns raw data
tool_result(lab_database,
            [[patient_42, bacterial_markers, positive]]).

% Converted to Prolog facts
lab_result(patient_42, bacterial_markers_positive).

% Re-derivation succeeds
?- confirmed_diagnosis(patient_42, bacterial_pneumonia).
```

This keeps all reasoning traceable and auditable within the symbolic layer.

## Methods

### Medical Scenario

```prolog
suggests_condition(P, respiratory_infection) :-
    symptom(P, fever),
    symptom(P, cough).

confirmed_diagnosis(P, bacterial_pneumonia) :-
    suggests_condition(P, respiratory_infection),
    lab_result(P, bacterial_markers_positive).
```

Without lab confirmation, antibiotics are not derived.

### Legal Scenario

```prolog
establishes_probable_cause(Case) :-
    has_evidence(Case, anonymous_tip),
    has_evidence(Case, corroborating_evidence).
```

Without corroboration, probable cause fails.

## Evaluation Framework

The paper proposes eight experimental categories:

1. **Adversarial formalization tests:** robustness to ambiguous natural language.
2. **Hallucination comparison:** error rates versus pure LLM baselines.
3. **Failure presentation audit:** human evaluation of failure artifact clarity.
4. **Provenance logging integrity:** verification of complete proof traces.
5. **Long-chain stress testing:** evaluation of chain containment at scale.
6. **Meta-theory encoding coverage:** representation of complex logical structures.
7. **Assumption-dependence classification accuracy:** correctness of ROBUST versus ASSUMPTION-DEPENDENT labeling.
8. **Uniqueness verification enforcement:** prevention of false uniqueness claims.

### Evaluation Metrics

| Category | Metric | Target |
| --- | --- | --- |
| Chain Containment | Failure isolation rate | $>99\%$ |
| Assumption Testing | Correct ROBUST/DEPENDENT | $>95\%$ |
| Formalization | Completeness verification | $100\%$ |
| Uniqueness Claims | False claim prevention | $100\%$ |
| Proof Integrity | Trace completeness | $100\%$ |

### Comparison Framework

Compare against three baselines:

- **Pure LLM:** GPT-4 with chain-of-thought prompting
- **Retrieval-Augmented LLM:** RAG-enhanced generation
- **Basic Neurosymbolic:** LLM plus symbolic reasoning without assumption-dependence testing

Key differentiators:

- Does the system report ASSUMPTION-DEPENDENT versus ROBUST?
- Does it enforce formalization completeness?
- Does it prevent false uniqueness claims?
- Are proof traces complete and inspectable?

## Discussion

The hybrid architecture enforces local soundness and isolates failure. However, guarantees remain conditional on correct KB construction and protected formalization layers.

### Architectural Guarantees vs. Limitations

Strong guarantees within the KB include:

- soundness of derived conclusions,
- chain containment on failure,
- formalization completeness,
- proof traceability by construction,
- assumption-dependence classification when tested.

Conditional guarantees that still require protection include:

- correctness of the formalization function $F: NL \rightarrow KB$,
- resistance to adversarial manipulation of the formalization layer,
- completeness of the KB relative to the target domain.

### Comparison to Traditional Neurosymbolic Approaches

Traditional neurosymbolic systems often prioritize:

- **Performance:** higher benchmark accuracy
- **Interpretability:** partial explanations of reasoning

This architecture instead prioritizes:

- **Epistemic transparency:** explicit uncertainty boundaries
- **Assumption auditability:** first-class assumption manipulation
- **Proof completeness:** full derivation traces
- **Conservative classification:** clear CANDIDATE versus SOLVED distinction

The tradeoff is a potential reduction in unconstrained fluency in exchange for gains in accountability and governance.

### High-Stakes Domain Applicability

This architecture is designed for domains where:

- false confidence is more harmful than acknowledged uncertainty,
- audit trails are legally or ethically required,
- assumption-dependence must be explicit,
- chain-of-custody for reasoning is critical.

Examples include medical diagnosis with lab confirmation, legal reasoning about evidence standards, and financial compliance under regulatory constraints.

### Limitations and Future Work

Open challenges include:

1. **Formalization quality:** the $F: NL \rightarrow KB$ function remains an LLM and inherits its uncertainties.
2. **Assumption discovery:** hidden assumptions may require domain expertise to identify.
3. **Scalability:** large KBs may create computational complexity.
4. **Adversarial robustness:** sophisticated attacks can target the formalization layer.

Future directions include:

- automated assumption extraction from natural language,
- meta-reasoning about formalization quality,
- hierarchical KB architectures for scalability,
- formal verification of formalization functions.

## Conclusion

This paper presents a hybrid LLM-Prolog architecture that relocates uncertainty to explicit formalization boundaries. By transforming plausibility-driven drift into bounded modeling uncertainty, the system enforces structured containment of invalid intermediate steps.

Beyond basic neurosymbolic integration, the architecture introduces five core constraints:

1. **Assumptions as first-class objects:** explicit, manipulable inference bridges.
2. **Mandatory assumption-dependence testing:** ROBUST versus ASSUMPTION-DEPENDENT classification.
3. **Formalization completeness verification:** no silent clause omission.
4. **Uniqueness proof requirement:** prevention of false claims of singularity.
5. **Tripartite classification:** SOLVED, CANDIDATE, and MAPPED with explicit criteria.

These constraints turn the system from a reasoning assistant into a governance-aware epistemic architecture. In high-stakes domains, accountability and inspectability may outweigh unconstrained fluency.

The architecture accepts reduced generative freedom in exchange for:

- auditable proof traces,
- explicit assumption boundaries,
- conservative correctness claims,
- structured failure artifacts.

The underlying design philosophy is direct: in domains where mistakes have consequences, uncertainty must be relocated to boundaries that can be inspected, audited, and governed.
