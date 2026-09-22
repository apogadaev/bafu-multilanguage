import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { EcoSpoldXmlParser } from "./EcoSpoldXmlParser";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = join(__dirname, "../../../../../sample-10/process_001835f5-ba6d-361a-8990-7c894d80c087.xml");

describe("EcoSpoldXmlParser", () => {
  it("extracts all translatable fields from a real ecoSpold process file", () => {
    const xml = readFileSync(FIXTURE_PATH, "utf8");
    const parser = new EcoSpoldXmlParser();
    const fields = parser.parse(xml);

    expect(fields).toHaveLength(18);

    const byPath = new Map(fields.map((f) => [f.path, f]));
    expect(byPath.get("referenceFunction/name")?.text).toBe("Natural gas, liquefied, production AE, at freight ship");
    expect(byPath.get("referenceFunction/category")?.text).toBe("natural gas");
    expect(byPath.get("referenceFunction/subCategory")?.text).toBe("production");
    expect(byPath.get("referenceFunction/includedProcesses")?.text).toBe(
      "This dataset describes the transport of natural gas on a freight ship between the liquefaction plant in AE and a Kuwaiti evaporation plant.",
    );
    expect(byPath.get("geography/text")?.text).toBe("not known");
    expect(byPath.get("technology/text")?.text).toBe(
      "The distances between liquefaction and evaporation plant is based on port distances.",
    );

    // First exchange (the process's own output) has no generalComment
    expect(byPath.get("exchange[0]/name")?.text).toBe("Natural gas, liquefied, production AE, at freight ship");
    expect(byPath.get("exchange[0]/generalComment")).toBeUndefined();

    // Second exchange has a generalComment and carries its flow number for traceability
    expect(byPath.get("exchange[1]/name")?.text).toBe("Natural gas, liquefied, at liquefaction plant");
    expect(byPath.get("exchange[1]/generalComment")?.text).toBe(
      "(4,3,3,1,1,BU:1.05); Based on data from Faist-Emmenegger (2015)",
    );
    expect(byPath.get("exchange[1]/name")?.exchangeNumber).toBe("275867");

    for (const field of fields) {
      expect(field.hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    }
  });

  it("does not collapse multiple exchanges into one (fast-xml-parser single-vs-array quirk)", () => {
    const xml = readFileSync(FIXTURE_PATH, "utf8");
    const parser = new EcoSpoldXmlParser();
    const fields = parser.parse(xml);
    const exchangeIndices = new Set(
      fields.map((f) => f.path.match(/^exchange\[(\d+)\]/)?.[1]).filter((v): v is string => v !== undefined),
    );
    expect(exchangeIndices).toEqual(new Set(["0", "1", "2"]));
  });
});
