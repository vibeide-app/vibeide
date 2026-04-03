# Voice Pipeline Architecture

Three-stage pipeline with two routing modes.

```
Capture (STT) → PostProcess (rules) → Format (LLM)
                                    ↓
                            VoiceRouter
                           /           \
                    Dictation        Command
                  (to terminal)   (fuzzy-match)
```

## Stages

1. **Capture** (`voice-capture.ts`): STT via WebKit SpeechRecognition or API-based (Groq/OpenAI Whisper)
2. **PostProcess** (`voice-postprocessor.ts`): Rule-based transforms (symbols, case, abbreviations)
3. **Format** (`voice-formatter.ts`): LLM reformatting with anti-hallucination guards

## Routing Modes

- **Dictation**: PostProcessed text typed directly into focused terminal
- **Command**: Fuzzy-matched against registered VoiceCommand aliases, executes app actions

## Rules

- Each stage is independent — STT backends can be swapped without touching formatting
- PostProcess runs before LLM format (cheap rules first, expensive LLM second)
- Short text (≤2 words) skips LLM formatting entirely
- Errors at any stage fall back to raw text — never block dictation

## Why

- Decoupled stages let us swap STT providers (Groq, OpenAI, local Whisper) without changing formatting logic
