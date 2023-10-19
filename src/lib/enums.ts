/**
 * How serious a diagnostic is. More serious levels have higher int values.
 */
export enum DiagnosticLevel {
  Info = 0,
  Warning = 1,
  Error = 2,
  Fatal = 3,
}

/**
 * Types of schemas used to validate resources.
 */
export enum ValidationSchema {
  Unspecified,
  Tuning,
  SimData,
  StringTable,
}