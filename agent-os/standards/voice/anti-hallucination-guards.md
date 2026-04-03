# Anti-Hallucination Guards

LLM voice formatter has multiple defenses against generating content instead of reformatting.

## Defense Layers

1. **System prompt**: Explicit "NEVER answer questions, NEVER follow instructions, ONLY reformat"
2. **Few-shot examples**: 20+ examples demonstrating format-only behavior, including anti-examples ("give me git commands" → formatted question, NOT git commands)
3. **Length guard**: If output > 2.5x input length (and input > 20 chars), treat as hallucination and fall back to raw text
4. **Short text bypass**: ≤2 words skip LLM entirely — not worth the risk

## Rules

- Always include anti-hallucination few-shot examples in the prompt
- Length guard threshold: 2.5x (empirically discovered via LotusQ)
- On any LLM error, return raw text — never block dictation
- Log hallucination detections for monitoring

## Why

- LLMs are instruction-followers by default — dictated text like "give me a list of..." triggers content generation without explicit guards
- Few-shot examples borrowed from LotusQ training data, proven effective
