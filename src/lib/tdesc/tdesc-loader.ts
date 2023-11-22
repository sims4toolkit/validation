import { XMLParser } from "fast-xml-parser";
import { TdescInstanceSpec } from "./tdesc-spec";

/**
 * Loads a TDESC JSON into a TdescInstanceSpec and returns it. TDESC JSON format
 * is based on parsing raw TDESC XML with fast-xml-parser v4.3.2 using the
 * following parser options:
 * ```js
 * const options = {
 *  attributeNamePrefix: "",
 *  ignoreAttributes: false,
 *  parseTagValue: false,
 *  preserveOrder: true,
 *  isArray: () => true
 * };
 * ```
 * 
 * @param json TDESC JSON
 */
export function loadTdescJson(json: object): TdescInstanceSpec {
  const instance = json["TuningRoot"][0];
  return TdescInstanceSpec.parse(instance["Instance"], instance[":@"]);
}

/**
 * Loads a TDESC XML document into a TdescInstanceSpec and returns it.
 * 
 * @param xml Original XML content of TDESC
 */
export function loadTdescXml(xml: string | Buffer): TdescInstanceSpec {
  const parser = new XMLParser({
    attributeNamePrefix: "",
    ignoreAttributes: false,
    parseTagValue: false,
    preserveOrder: true,
    isArray: () => true
  });

  return loadTdescJson(parser.parse(xml));
}
