import { Resource } from "@s4tk/models/types";
import { ValidatedResource } from "../types/resources";
import Diagnose from "../utils/diagnose";

/**
 * Parses a resource model of type `T` from the buffer in `entry`. If the model
 * is successfully parsed, then `entry.modelLoaded` is set to true and
 * `entry.resource` is set to the parsed model instance. If the model cannot be
 * parsed, then `entry.modelLoaded` remains false and an error is added.
 * 
 * @param typeName Type name to use in error message, if added
 * @param entry Entry to add parsed model to
 * @param parse Function that parses model from buffer
 * @returns The parsed model
 */
export function loadModel<T extends Resource>(
  typeName: string,
  entry: ValidatedResource,
  parse: (buffer: Buffer) => T
): T | undefined {
  try {
    const model = parse(entry.resource.getBuffer());
    entry.modelLoaded = true;
    entry.resource = model;
    return model;
  } catch (e) {
    Diagnose.error(entry, "GEN_001", `Not a valid ${typeName}.`, {
      exception: e
    });
  }
}

/**
 * Checks if the provided group is valid for a custom BG tuning.
 * 
 * @param group Group to test
 */
export function groupIsBaseGame(group: number): boolean {
  return group === 0 || group === 0x80000000;
}
