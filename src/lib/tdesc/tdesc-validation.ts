import { XmlDocumentNode } from "@s4tk/xml-dom";
import { TdescInstanceSpec } from "./tdesc-spec";
import { Diagnosable } from "../types/diagnostics";

const OPEN_TAG_REGEX = /<([A-Z])\s*([^<>]*)>/g;

/**
 * Validates the provided tuning with the provided TDESC spec, adding
 * diagnostics to its entry.
 * 
 * @param entry Entry to add validation to
 * @param xml Plain text XML content of tuning
 * @param spec TDESC spec to validate against
 */
export function validateTdesc(
  entry: Diagnosable,
  xml: string | Buffer,
  spec: TdescInstanceSpec
) {
  const xmlContent = typeof xml === "string" ? xml : xml.toString("utf-8");

  const xmlContentWithLines = xmlContent
    .split("\n")
    .map((line, i) => line.replace(OPEN_TAG_REGEX, `<$1 l="${i + 1}" $2>`))
    .join("\n");

  const doc = XmlDocumentNode.from(xmlContentWithLines, {
    ignoreComments: true,
    ignoreProcessingInstructions: true,
  });

  spec.validate(doc.child, entry);
}
