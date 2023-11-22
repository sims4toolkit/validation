import { XMLParser } from "fast-xml-parser";
import { RawTdescData } from "./types";

/**
 * Parses the given plain text TDESC data into an object. If `tdesc` is a JSON,
 * it is assumed that its structure is compatible with the TDESC validation API,
 * and it is parsed excatly as-is. If `tdesc` is XML, it is converted to JSON
 * using [fast-xml-parser](https://www.npmjs.com/package/fast-xml-parser) v4.3.2
 * with the options:
 * ```js
 * {
 *  attributeNamePrefix: "",
 *  ignoreAttributes: false,
 *  parseTagValue: false,
 *  preserveOrder: true,
 *  isArray: () => true
 * }
 * ```
 * This resulting JSON structure is compatible with the TDESC JSONs returned
 * from [Lot51's TDESC browser](https://tdesc.lot51.cc/).
 * 
 * @param tdesc Raw TDESC data, as either plain text XML or JSON
 */
export function parseRawTdescAsJson(tdesc: RawTdescData): object {
  const content = typeof tdesc.data === "string"
    ? tdesc.data
    : tdesc.data.toString("utf8");

  if (tdesc.format === "xml") {
    const parser = new XMLParser({
      attributeNamePrefix: "",
      ignoreAttributes: false,
      parseTagValue: false,
      preserveOrder: true,
      isArray: () => true
    });

    return parser.parse(content);
  } else {
    return JSON.parse(content);
  }
}
