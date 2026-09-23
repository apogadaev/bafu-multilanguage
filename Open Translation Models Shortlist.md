# Open Translation Models Shortlist

2026-09-22 · @Someone

## Summary

There is no single "best" translation model on Hugging Face; its translation listing is ranked mostly by downloads. The strongest open options in September 2026 fall into three groups: dedicated translation LLMs, general open LLMs prompted for translation, and older multilingual models with broad coverage but lower quality.

Recommended shortlist for the annual dataset pipeline: **TranslateGemma-12B or 27B** and **Qwen 3.6**, compared on a sample of the real dataset before choosing.

## Comparison

| Model | Type | Sizes | Languages | License | Strengths | Watch out for |
| --- | --- | --- | --- | --- | --- | --- |
| [Google TranslateGemma](https://huggingface.co/google/translategemma-12b-it) | Dedicated translation | 4B, 12B, 27B | 55 | Gemma license (accept on Hugging Face) | 12B beats Gemma 3 27B on WMT24++; 12B runs on a laptop, 27B on one H100 | Fixed chat template; 55 languages only |
| [Tencent Hunyuan-MT-7B](https://huggingface.co/tencent/Hunyuan-MT-7B) / [Hy-MT2](https://huggingface.co/tencent/Hy-MT2-7B) | Dedicated translation | 1.8B, 7B, 30B-A3B | 33 | Tencent Hunyuan license | Ranked 1st in 30 of 31 pairs at WMT25 (vendor-reported); very small on-device variant | Earlier Hunyuan license excluded use in the EU; check before use in Denmark |
| Qwen 3.6 (27B) | General LLM | 27B and others | 100+ | Apache 2.0 | Cleanest license; follows glossary and style-guide prompts; largest fine-tuning community | Not translation-specialized; quality varies by language |
| [Meta NLLB-200](https://huggingface.co/facebook/nllb-200-distilled-600M) | Multilingual MT | 600M to 54.5B | 200+ | CC-BY-NC 4.0 | Widest language coverage; most downloaded | Non-commercial only; weaker than modern LLMs |

## Quality estimation models

The confidence-scoring step in the community review workflow needs a quality estimation model. Both are on Hugging Face:

- **Unbabel COMETKiwi**: scores each translation 0–1 without a reference translation.
- **Google MetricX-25**: built on Gemma 3 12B; predicts MQM-style error scores.

## How to choose

1. List the target languages and drop models that don't cover them.
2. Check each license against your use (commercial or not, EU location).
3. Translate 200–300 real dataset rows per target language with the two or three remaining models, using the same glossary and prompt.
4. Score all outputs with COMETKiwi and run rule checks (placeholders, numbers, glossary terms).
5. Have two volunteers per language blind-rank a sample of 50 rows.
6. Pick per language if results differ; one model for all languages is not required.

Benchmark wins are on news and literary text. Structured dataset fields (short labels, codes, units) can rank models differently, which is why step 3 uses real rows.

## Caveats

- Hunyuan-MT and Hy-MT2 performance claims come from Tencent's own reports and benchmarks.
- TranslateGemma results are Google's own evaluation, though partly human-evaluated on the WMT25 test set.
- Licenses change between versions; confirm on each model card at the time of use.
- Open question: target languages decide which models are viable.

## Sources

- [google/translategemma-4b-it](https://huggingface.co/google/translategemma-4b-it) (Hugging Face)
- [TranslateGemma: A new family of open translation models](https://blog.google/innovation-and-ai/technology/developers-tools/translategemma/) (Google)
- [TranslateGemma Technical Report](https://www.alphaxiv.org/overview/2601.09012) (alphaXiv)
- [Hunyuan-MT Technical Report](https://arxiv.org/abs/2509.05209) (arXiv)
- [Hy-MT2](https://www.tencentcloud.com/techpedia/144776?lang=en) (Tencent Cloud)
- [Best Open LLM Models for Regulated Translation Work in 2026](https://www.adverbum.com/post/best-open-llm-models-regulated-translation-2026) (Adverbum)
- [Popular Open-Source Translation Models](https://picovoice.ai/blog/open-source-translation/) (Picovoice)
- [MetricX-25 and GemSpanEval](https://arxiv.org/pdf/2510.24707) (arXiv)
