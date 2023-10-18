import { SimDataResource, type RawResource, StringTableResource, XmlResource } from "@s4tk/models";
import { BinaryResourceType } from "@s4tk/models/enums";
import type { ResourceKeyPair } from "@s4tk/models/types";
import type { OrganizedResources, ValidatedResource, ValidatedUnspecified } from "./types";
import organizeResources from "./organize-resources";
import { ValidationSchema } from "./enums";
import { postValidateTuning, validateTuning } from "./validation-schemas/tuning";
import { postValidateSimData, validateSimData } from "./validation-schemas/simdata";
import { postValidateStringTable, validateStringTable } from "./validation-schemas/string-table";
import { Diagnose, ItemCounter } from "./helpers";
import { UNSCANNABLE_TYPES } from "./constants";

/**
 * Validates the given resources in relation to one another, returning a list of
 * wrappers containing their diagnostic information. Any "IDs" referenced in
 * validated resources refer to indices in the returned list.
 * 
 * @param resources List of resources to validate
 * @returns List of validated resources, organized by their unique ID
 */
export default function validateResources(
  resources: ResourceKeyPair<RawResource>[]
): readonly ValidatedResource[] {
  const organized = organizeResources(resources);

  _runInitialValidation(organized);
  _runPostValidation(organized);

  // TODO: repeated resource keys
  // TODO: repeated tuning names
  // TODO: repeated tuning instance
  // TODO: tuning name doesn't match SimData name

  return organized.resources;
}

//#region Helpers

function _runInitialValidation(organized: OrganizedResources) {
  organized.resources.forEach(entry => {
    if (UNSCANNABLE_TYPES.has(entry.key.type)) return;

    try {
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
    } catch (e) {
      Diagnose.warning(entry, "An exception was thrown while validating this file. This does not necessarily mean there is something wrong with it.", e);
    }
  });
}

function _runPostValidation(organized: OrganizedResources) {
  organized.resources.forEach(entry => {
    if (UNSCANNABLE_TYPES.has(entry.key.type)) return;

    try {
      switch (entry.schema) {
        case ValidationSchema.Tuning:
          return postValidateTuning(entry, organized);
        case ValidationSchema.SimData:
          return postValidateSimData(entry, organized);
        case ValidationSchema.StringTable:
          return postValidateStringTable(entry, organized);
      }
    } catch (e) {
      Diagnose.warning(entry, "An exception was thrown while validating this file. This does not necessarily mean there is something wrong with it.", e);
    }
  });
}

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

function _validateMetaDataRepeats(organized: OrganizedResources) {
  const resourceKeys = new ItemCounter<string>();
  const tuningNames = new ItemCounter<string>();
  const tuningIds = new ItemCounter<bigint>();

  // organized.ids.forEach
}

//#endregion
