import type { StringTableLocale } from "@s4tk/models/enums";
import type { Resource, ResourceKey } from "@s4tk/models/types";
import { DiagnosticInfo } from "./diagnostics";

//#region Private Types

interface _ValidatedResourceBase {
  readonly id: number;
  schema: ValidationSchema;
  key: ResourceKey;
  resource: Resource;
  modelLoaded: boolean;
  diagnostics: DiagnosticInfo[];
}

//#endregion

//#region Public Types

/**
 * Types of schemas used to validate resources.
 */
export enum ValidationSchema {
  Unspecified,
  Tuning,
  SimData,
  StringTable,
}

/**
 * A resource validated with an unspecified schema.
 */
export interface ValidatedUnspecified extends _ValidatedResourceBase {
  schema: ValidationSchema.Unspecified;
}

/**
 * A resource validated with the `Tuning` schema.
 */
export interface ValidatedTuning extends _ValidatedResourceBase {
  schema: ValidationSchema.Tuning;
  domValid: boolean;
  pairedSimDataId?: number;
}

/**
 * A resource validated with the `SimData` schema.
 */
export interface ValidatedSimData extends _ValidatedResourceBase {
  schema: ValidationSchema.SimData;
  pairedTuningId?: number;
}

/**
 * A resource validated with the `StringTable` schema.
 */
export interface ValidatedStringTable extends _ValidatedResourceBase {
  schema: ValidationSchema.StringTable;
  locale: StringTableLocale;
  instanceBase: bigint;
  primary: boolean;
  otherLocaleIds: number[];
}

/**
 * A resource validated with some schema.
 */
export type ValidatedResource =
  ValidatedUnspecified |
  ValidatedTuning |
  ValidatedSimData |
  ValidatedStringTable;

/**
 * Validated resources organized by ID and schema.
 */
export interface OrganizedResources {
  readonly resources: readonly ValidatedResource[];
  readonly schemas: ReadonlyMap<ValidationSchema, readonly ValidatedResource[]>;
}

//#endregion
