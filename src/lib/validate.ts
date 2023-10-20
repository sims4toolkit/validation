import { formatResourceKey } from "@s4tk/hashing/formatting";
import { SimDataResource, type RawResource, StringTableResource, XmlResource, Package } from "@s4tk/models";
import { BinaryResourceType, EncodingType } from "@s4tk/models/enums";
import type { ResourceKeyPair } from "@s4tk/models/types";
import organizeResources from "./organize";
import type { OrganizedResources, ValidatedResource, ValidatedUnspecified } from "./types/resources";
import { ValidationSchema } from "./types/resources";
import { UNSCANNABLE_TYPES } from "./utils/constants";
import Diagnose from "./utils/diagnose";
import ItemCounter from "./utils/item-counter";
import { postValidateSimData, validateSimData } from "./validation-schemas/simdata";
import { postValidateStringTable, validateStringTable } from "./validation-schemas/string-table";
import { validateTuning } from "./validation-schemas/tuning";

/**
 * Validates the resources in the given package in relation to one another,
 * returning a list of wrappers containing their diagnostic information. Any
 * "IDs" referenced in validated resources refer to indices in the returned
 * list.
 * 
 * @param buffer Buffer to read package data from
 */
export function validatePackageBuffer(
  buffer: Buffer
): readonly ValidatedResource[] {
  const entries = Package.extractResources<RawResource>(buffer, {
    decompressBuffers: true,
    keepDeletedRecords: true,
    loadRaw: true,
  });

  return validateResources(entries);
}

/**
 * Validates the given resources in relation to one another, returning a list of
 * wrappers containing their diagnostic information. Any "IDs" referenced in
 * validated resources refer to indices in the returned list.
 * 
 * @param resources List of resources to validate
 * @returns List of validated resources, organized by their unique ID
 */
export function validateResources(
  resources: ResourceKeyPair<RawResource>[]
): readonly ValidatedResource[] {
  const organized = organizeResources(resources);
  _runInitialValidation(organized);
  _runPostValidation(organized);
  _validateMetaDataRepeats(organized);
  return organized.resources;
}

//#region Helpers

function _runInitialValidation(organized: OrganizedResources) {
  organized.resources.forEach(entry => {
    if (UNSCANNABLE_TYPES.has(entry.key.type)) return;

    _validateReservedInstances(entry);

    // do not scan deleted records
    if (entry.resource.encodingType === EncodingType.Null) {
      entry.isDeleted = true;
      return;
    }

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
      Diagnose.warning(entry, "Unknown", "An exception was thrown while validating this file. This does not necessarily mean there is something wrong with it.", e);
    }
  });
}

function _validateReservedInstances(entry: ValidatedResource) {
  if (entry.key.instance === 0n) {
    Diagnose.error(entry, "GEN_002", "Resources cannot have an instance of 0.");
  } else if (entry.key.instance === 0x811C9DC5n) {
    Diagnose.warning(entry, "GEN_003", "Instance is 0x811C9DC5 (the FNV-32 hash of an empty string).");
  } else if (entry.key.instance === 0xCBF29CE484222325n) {
    Diagnose.warning(entry, "GEN_003", "Instance is 0xCBF29CE484222325 (the FNV-64 hash of an empty string).");
  }
}

function _runPostValidation(organized: OrganizedResources) {
  organized.resources.forEach(entry => {
    if (UNSCANNABLE_TYPES.has(entry.key.type)) return;

    try {
      switch (entry.schema) {
        case ValidationSchema.SimData:
          return postValidateSimData(entry, organized);
        case ValidationSchema.StringTable:
          return postValidateStringTable(entry, organized);
      }
    } catch (e) {
      Diagnose.warning(entry, "Unknown", "An exception was thrown while validating this file. This does not necessarily mean there is something wrong with it.", e);
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
      Diagnose.error(entry, "DAT_006", "File appears to be a SimData, but is not using the SimData type (545AC67A). No further validation will be done.");
    } else if (magic === "STBL") {
      entry.resource = StringTableResource.from(buffer);
      entry.modelLoaded = true;
      Diagnose.error(entry, "STB_008", "File appears to be a string table, but is not using the string table type (220557DA). No further validation will be done.");
    } else if (magic.trimStart().startsWith("<")) {
      const xml = XmlResource.from(buffer);
      xml.root;
      entry.resource = xml;
      entry.modelLoaded = true;
      if (xml.root.tag === "I" || xml.root.tag === "M") {
        Diagnose.warning(entry, "TUN_012", "File appears to be XML tuning, but is not using a recognized tuning type. If you are sure this file's type is correct, S4TK may need to be updated. No further validation will be done.");
      }
    }
  } catch (_) { }
}

function _validateMetaDataRepeats(organized: OrganizedResources) {
  const resourceKeys = new ItemCounter<string>();
  const tuningIds = new ItemCounter<bigint>();
  const tuningNames = new ItemCounter<string>();

  organized.resources.forEach(entry => {
    resourceKeys.count(formatResourceKey(entry.key, "-"));
    if (entry.schema === ValidationSchema.Tuning) {
      tuningIds.count(entry.key.instance);
      if (entry.domValid && (entry.resource as XmlResource).root.name) {
        tuningNames.count((entry.resource as XmlResource).root.name);
      }
    }
  });

  organized.resources.forEach(entry => {
    const key = formatResourceKey(entry.key, "-");
    const resourceKeyCount = resourceKeys.get(key);
    if (resourceKeyCount > 1) {
      Diagnose.error(entry, "GEN_004", `Key of ${key} is being used by ${resourceKeyCount} files. One will overwrite the others, and S4S will glitch while handling them.`);
    }

    if (entry.schema === ValidationSchema.Tuning) {
      const idCount = tuningIds.get(entry.key.instance);
      if (idCount > 2) {
        Diagnose.warning(entry, "TUN_013", `Instance of ${entry.key.instance} is being used by ${idCount} tuning files.`);
      }

      if (entry.domValid && (entry.resource as XmlResource).root.name) {
        const filename = (entry.resource as XmlResource).root.name;
        const nameCount = tuningNames.get(filename);
        if (nameCount > 2) {
          Diagnose.warning(entry, "TUN_014", `Name of "${filename}" is being used by ${nameCount} tuning files.`);
        }
      }
    }
  });
}

//#endregion
