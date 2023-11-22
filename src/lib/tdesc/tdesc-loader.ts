import { RawTdescData } from "./types";
import { parseRawTdescAsJson } from "./helpers";
import TdescValidationContext from "./tdesc-context";
import { TdescInstanceSpec } from "./tdesc-spec";

/**
 * TODO:
 * 
 * @param json TDESC JSON
 * @param context Context in which to load this TDESC
 */
export function loadTdescSpec(
  tdesc: RawTdescData,
  context: TdescValidationContext
): TdescInstanceSpec {
  const json = parseRawTdescAsJson(tdesc);
  const instance = json["TuningRoot"][0];
  // TODO: pass context
  return TdescInstanceSpec.parse(instance["Instance"], instance[":@"]);
}
