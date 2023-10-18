import type { RawResource } from "@s4tk/models";
import type { ResourceKey, ResourceKeyPair } from "@s4tk/models/types";
import { BinaryResourceType, StringTableLocale, TuningResourceType } from "@s4tk/models/enums";
import type { ValidatedResource, OrganizedResources, ValidatedTuning, ValidatedSimData, ValidatedStringTable } from "./types";
import { ValidationSchema } from "./enums";

//#region Exported Functions

/**
 * Organizes resources into a structure that can be used during validation.
 * 
 * @param resources Resources to organize
 */
export default function organizeResources(
  resources: ResourceKeyPair<RawResource>[]
): OrganizedResources {
  const validatedResources: ValidatedResource[] = [];
  const resourcesBySchema = new Map<ValidationSchema, ValidatedResource[]>();
  const simdataInstanceToId = new Map<bigint, number>();
  const stblSetToIds = new Map<string, number[]>();

  function addToSchema(validated: ValidatedResource) {
    if (resourcesBySchema.has(validated.schema)) {
      resourcesBySchema.get(validated.schema).push(validated);
    } else {
      resourcesBySchema.set(validated.schema, [validated]);
    }
  }

  function addToStblSet(validated: ValidatedStringTable) {
    const set = `${validated.key.group}-${validated.instanceBase}`;
    if (stblSetToIds.has(set)) {
      stblSetToIds.get(set).push(validated.id);
    } else {
      stblSetToIds.set(set, [validated.id]);
    }
  }

  // creating ValidatedResource instances for resources
  resources.forEach((resource, id) => {
    const validated = _toValidatedResource(id, resource);
    validatedResources.push(validated);
    addToSchema(validated);
    if (validated.schema === ValidationSchema.SimData) {
      simdataInstanceToId.set(resource.key.instance, id);
    } else if (validated.schema === ValidationSchema.StringTable) {
      addToStblSet(validated);
    }
  });

  // pairing tuning and SimData
  resourcesBySchema.get(ValidationSchema.Tuning)?.forEach((validated) => {
    validated = validated as ValidatedTuning;
    const simdataId = simdataInstanceToId.get(validated.key.instance);
    if (simdataId !== undefined) {
      validated.pairedSimDataId = simdataId;
      const simdata = validatedResources[simdataId] as ValidatedSimData;
      simdata.pairedTuningId = validated.id;
    }
  });

  // pairing string tables
  stblSetToIds.forEach(ids => {
    let lowestLocale = 100; // highest locale is Swedish at 21
    let primaryId = -1;

    ids.forEach(id => {
      const validated = validatedResources[id] as ValidatedStringTable;

      ids.forEach(idToAdd => {
        if (idToAdd === id) return;
        validated.otherLocaleIds.push(idToAdd);
      });

      if (validated.locale < lowestLocale) {
        lowestLocale = validated.locale;
        primaryId = id;
      }
    });

    const primaryStbl = validatedResources[primaryId] as ValidatedStringTable;
    primaryStbl.primary = true;
  });

  return {
    ids: validatedResources,
    schemas: resourcesBySchema
  };
}

//#endregion

//#region Helper Functions

function _determineSchema(key: ResourceKey): ValidationSchema {
  if (key.type === BinaryResourceType.SimData) {
    return ValidationSchema.SimData;
  } else if (key.type === BinaryResourceType.StringTable) {
    return ValidationSchema.StringTable;
  } else if (key.type in TuningResourceType) {
    return ValidationSchema.Tuning;
  } else {
    return ValidationSchema.Unspecified;
  }
}

function _toValidatedResource(
  id: number,
  resource: ResourceKeyPair<RawResource>
): ValidatedResource {
  const schema = _determineSchema(resource.key);
  switch (schema) {
    case ValidationSchema.Unspecified:
      return {
        id: id,
        schema: schema,
        key: resource.key,
        resource: resource.value,
        modelLoaded: false,
        diagnostics: []
      };
    case ValidationSchema.SimData:
      return {
        id: id,
        schema: schema,
        key: resource.key,
        resource: resource.value,
        modelLoaded: false,
        diagnostics: []
      };
    case ValidationSchema.Tuning:
      return {
        id: id,
        schema: schema,
        key: resource.key,
        resource: resource.value,
        modelLoaded: false,
        diagnostics: [],
        domValid: false
      };
    case ValidationSchema.StringTable:
      return {
        id: id,
        schema: schema,
        key: resource.key,
        resource: resource.value,
        modelLoaded: false,
        diagnostics: [],
        locale: StringTableLocale.getLocale(resource.key.instance),
        instanceBase: StringTableLocale.getInstanceBase(resource.key.instance),
        primary: false,
        otherLocaleIds: []
      };
  }
}

//#endregion
