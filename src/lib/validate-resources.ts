import { SimDataResource, type RawResource, StringTableResource, XmlResource } from "@s4tk/models";
import type { ResourceKeyPair } from "@s4tk/models/types";
import type { ValidatedResource, ValidatedUnspecified } from "./types";
import organizeResources from "./organize-resources";
import { ValidationSchema } from "./enums";
import validateTuning from "./validation-schemas/tuning";
import validateSimData from "./validation-schemas/simdata";
import validateStringTable from "./validation-schemas/string-table";
import { BinaryResourceType } from "@s4tk/models/enums";
import { Diagnose } from "./helpers";

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
        return _tryValidateUnspecified(entry);
    }
  });

  // TODO: global validation

  return organized.ids;
}

//#region Helpers

function _tryValidateUnspecified(entry: ValidatedUnspecified) {
  try {
    const buffer = entry.resource.getBuffer();
    const magic = buffer.toString("utf8", 0, 4);

    if (magic === "DATA" && entry.key.type !== BinaryResourceType.CombinedTuning) {
      entry.resource = SimDataResource.from(buffer);
      entry.modelLoaded = true;
      Diagnose.error(entry, "File appears to be a SimData, but is not using the SimData type (545AC67A). No further validation will be done.");
    } else if (magic === "STBL") {
      entry.resource = StringTableResource.from(buffer);
      entry.modelLoaded = true;
      Diagnose.error(entry, "File appears to be a string table, but is not using the string table type (220557DA). No further validation will be done.");
    } else if (magic.trimStart().startsWith("<")) {
      const xml = XmlResource.from(buffer);
      xml.root;
      entry.resource = xml;
      entry.modelLoaded = true;
      if (xml.root.tag === "I" || xml.root.tag === "M") {
        Diagnose.warning(entry, "File appears to be XML tuning, but is not using a recognized tuning type. If you are sure this file's type is correct, S4TK may need to be updated. No further validation will be done.");
      }
    }
  } catch (_) { }
}

//#endregion
