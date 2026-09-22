import { XMLParser } from "fast-xml-parser";
import { TranslatableField } from "@bafu/domain";
import { sha256Hex } from "./hash";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

const REFERENCE_FUNCTION_FIELDS = ["name", "category", "subCategory", "generalComment", "includedProcesses"] as const;
const EXCHANGE_FIELDS = ["name", "category", "subCategory", "generalComment"] as const;

export class EcoSpoldXmlParser {
  parse(xmlContent: string): TranslatableField[] {
    const doc = parser.parse(xmlContent);
    const dataset = doc.ecoSpold.dataset;
    const processInfo = dataset.metaInformation.processInformation;
    const fields: TranslatableField[] = [];

    const referenceFunction = processInfo.referenceFunction;
    for (const attr of REFERENCE_FUNCTION_FIELDS) {
      const text = referenceFunction[`@_${attr}`];
      if (typeof text === "string" && text.trim().length > 0) {
        fields.push(TranslatableField.create({ path: `referenceFunction/${attr}`, text, hash: sha256Hex(text) }));
      }
    }

    const geographyText = processInfo.geography?.["@_text"];
    if (typeof geographyText === "string" && geographyText.trim().length > 0) {
      fields.push(TranslatableField.create({ path: "geography/text", text: geographyText, hash: sha256Hex(geographyText) }));
    }

    const technologyText = processInfo.technology?.["@_text"];
    if (typeof technologyText === "string" && technologyText.trim().length > 0) {
      fields.push(TranslatableField.create({ path: "technology/text", text: technologyText, hash: sha256Hex(technologyText) }));
    }

    const rawExchanges = dataset.flowData?.exchange;
    const exchanges: Record<string, unknown>[] = Array.isArray(rawExchanges)
      ? rawExchanges
      : rawExchanges
        ? [rawExchanges]
        : [];

    exchanges.forEach((exchange, index) => {
      const exchangeNumber = exchange["@_number"] as string | undefined;
      for (const attr of EXCHANGE_FIELDS) {
        const text = exchange[`@_${attr}`];
        if (typeof text === "string" && text.trim().length > 0) {
          fields.push(
            TranslatableField.create({ path: `exchange[${index}]/${attr}`, text, hash: sha256Hex(text), exchangeNumber }),
          );
        }
      }
    });

    return fields;
  }
}
