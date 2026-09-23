import { describe, it, expect, vi, afterEach } from "vitest";
import { LanguageCode, TranslatableField, TranslationManifest } from "@bafu/domain";
import { HuggingFaceTranslator } from "./HuggingFaceTranslator";

function fakeFetch(responseByText: Record<string, string>) {
  return vi.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    const text = body.messages[0].content[0].text;
    const translated = responseByText[text];
    if (translated === undefined) {
      throw new Error(`no fake response registered for text "${text}"`);
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: translated } }] }),
    } as Response;
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HuggingFaceTranslator", () => {
  it("translates every manifest field, one request per field, and returns a draft Translation", async () => {
    vi.stubGlobal(
      "fetch",
      fakeFetch({
        "Natural gas, liquefied": "Природный газ, сжиженный",
        "not known": "неизвестно",
      }),
    );

    const manifest = TranslationManifest.create({
      processId: "001835f5-ba6d-361a-8990-7c894d80c087",
      sourceLanguage: "en",
      extractedAt: new Date(),
      fields: [
        TranslatableField.create({ path: "referenceFunction/name", text: "Natural gas, liquefied", hash: `sha256:${"a".repeat(64)}` }),
        TranslatableField.create({ path: "geography/text", text: "not known", hash: `sha256:${"b".repeat(64)}` }),
      ],
    });

    const translator = new HuggingFaceTranslator("https://example.endpoints.huggingface.cloud", "hf_test-token");
    const translation = await translator.translate(manifest, LanguageCode.create("ru"), "google/translategemma-12b-it");

    expect(translation.translator).toBe("google/translategemma-12b-it");
    expect(translation.fields).toHaveLength(2);
    expect(translation.fields[0].path).toBe("referenceFunction/name");
    expect(translation.fields[0].text).toBe("Природный газ, сжиженный");
    expect(translation.fields[0].status).toBe("draft");
    expect(translation.fields[1].text).toBe("неизвестно");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("sends the verified request shape: endpoint path, auth header, and TranslateGemma content format", async () => {
    const fetchMock = fakeFetch({ hello: "привет" });
    vi.stubGlobal("fetch", fetchMock);

    const manifest = TranslationManifest.create({
      processId: "abc",
      sourceLanguage: "en",
      extractedAt: new Date(),
      fields: [TranslatableField.create({ path: "referenceFunction/name", text: "hello", hash: `sha256:${"a".repeat(64)}` })],
    });

    const translator = new HuggingFaceTranslator("https://my-endpoint.endpoints.huggingface.cloud", "hf_test-token");
    await translator.translate(manifest, LanguageCode.create("ru"), "google/translategemma-12b-it");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://my-endpoint.endpoints.huggingface.cloud/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer hf_test-token" },
      }),
    );
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      model: "google/translategemma-12b-it",
      messages: [
        {
          role: "user",
          content: [{ type: "text", source_lang_code: "en", target_lang_code: "ru", text: "hello" }],
        },
      ],
    });
  });

  it("throws if a translation request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 503 }) as Response),
    );

    const manifest = TranslationManifest.create({
      processId: "abc",
      sourceLanguage: "en",
      extractedAt: new Date(),
      fields: [TranslatableField.create({ path: "referenceFunction/name", text: "hello", hash: `sha256:${"a".repeat(64)}` })],
    });

    const translator = new HuggingFaceTranslator("https://my-endpoint.endpoints.huggingface.cloud", "hf_test-token");
    await expect(translator.translate(manifest, LanguageCode.create("ru"), "google/translategemma-12b-it")).rejects.toThrow(
      /request failed \(503\)/,
    );
  });

  it("throws if the response has no translated text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ choices: [] }) }) as unknown as Response),
    );

    const manifest = TranslationManifest.create({
      processId: "abc",
      sourceLanguage: "en",
      extractedAt: new Date(),
      fields: [TranslatableField.create({ path: "referenceFunction/name", text: "hello", hash: `sha256:${"a".repeat(64)}` })],
    });

    const translator = new HuggingFaceTranslator("https://my-endpoint.endpoints.huggingface.cloud", "hf_test-token");
    await expect(translator.translate(manifest, LanguageCode.create("ru"), "google/translategemma-12b-it")).rejects.toThrow(
      /no translated text/,
    );
  });
});
