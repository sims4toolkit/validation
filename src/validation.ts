//#region Enums

export { DiagnosticCode, DiagnosticLevel } from "./lib/types/diagnostics";
export { ValidationSchema } from "./lib/types/resources";

//#endregion

//#region Types

export type {
  ValidatedResource,
  ValidatedSimData,
  ValidatedStringTable,
  ValidatedTuning,
  ValidatedUnspecified,
} from "./lib/types/resources";

//#endregion

//#region Functions

export {
  validatePackageBuffer,
  validateResources,
} from "./lib/validate-resources";

//#endregion
