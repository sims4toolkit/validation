import type { StringTableLocale } from "@s4tk/models/enums";
import type { ResourceKeyPair } from "@s4tk/models/types";

/**
 * How serious a diagnostic is. More serious levels have higher values.
 */
export enum DiagnosticLevel {
  Warning = 1,
  Error = 2,
  Fatal = 3
}

/**
 * Diagnostic information for a resource entry.
 */
export interface DiagnosticInfo {
  level: DiagnosticLevel;
  message: string;
}

/**
 * Wrapper for a `ResourceKeyPair` and its diagnostic information.
 */
export interface ValidatedEntry {
  /** List of all diagnostics associated with `entry`. */
  diagnostics: DiagnosticInfo[];

  /** Entry to which the `diagnostics` apply. */
  entry: ResourceKeyPair;

  /** Whether or not `entry` has been parsed into the appropriate model. */
  parsed: boolean;
}

/**
 * Wrapper for a `ResourceKeyPair<StringTableResource>` with its locale and
 * diagnostic information.
 */
export interface ValidatedStringTableEntry extends ValidatedEntry {
  locale: StringTableLocale;
}

/**
 * Wrapper for a grouping of string tables that share the same instance base.
 */
export interface ValidatedStringTableSet {
  groupInstance: string;
  stringTables: ValidatedStringTableEntry[];
}

/**
 * Wrapper for a tuning and its paired SimData, if it has one. Pairing is
 * determined by instance.
 */
export interface ValidatedTuningPair {
  tuning: ValidatedEntry;
  simdata?: ValidatedEntry;
}

/**
 * Organized structure containing all diagnostic information for related
 * resource entries.
 */
export interface ValidatedEntries {
  pairedTunings: ValidatedTuningPair[];
  stringTables: ValidatedStringTableSet[];
  others: ValidatedEntry[];
}
