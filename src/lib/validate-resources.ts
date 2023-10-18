import type { RawResource } from "@s4tk/models";
import type { ResourceKeyPair } from "@s4tk/models/types";
import type { ValidatedResource, ValidatedUnspecified } from "./types";
import organizeResources from "./organize-resources";
import { ValidationSchema } from "./enums";
import validateTuning from "./validation-schemas/tuning";
import validateSimData from "./validation-schemas/simdata";
import validateStringTable from "./validation-schemas/string-table";

/**
 * TODO:
 * 
 * @param resources List of resources to validate
 * @returns List of validated resources, organized by their unique ID
 */
export default function validateResources(
  resources: ResourceKeyPair<RawResource>[]
): readonly ValidatedResource[] {
  const organized = organizeResources(resources);

  organized.ids.forEach(entry => {
    switch (entry.schema) {
      case ValidationSchema.Tuning:
        return validateTuning(entry, organized);
      case ValidationSchema.SimData:
        return validateSimData(entry, organized);
      case ValidationSchema.StringTable:
        return validateStringTable(entry, organized);
      default:
        return _validateUnspecified(entry);
    }
  });

  // TODO: global validation

  return organized.ids;
}

//#region Helpers

function _validateUnspecified(entry: ValidatedUnspecified) {
  // TODO:
}

//#endregion
