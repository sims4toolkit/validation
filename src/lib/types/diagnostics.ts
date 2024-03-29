//#region Private Code Types

type CodePrefix =
  "GEN" |
  "TUN" |
  "DAT" |
  "STB" |
  "TDS";

type GeneralCode =
  "GEN_001" |
  "GEN_002" |
  "GEN_003" |
  "GEN_004";

type TuningCode =
  "TUN_001" |
  "TUN_002" |
  "TUN_003" |
  "TUN_004" |
  "TUN_005" |
  "TUN_006" |
  "TUN_007" |
  "TUN_008" |
  "TUN_009" |
  "TUN_010" |
  "TUN_011" |
  "TUN_012" |
  "TUN_013" |
  "TUN_014" |
  "TUN_015" |
  "TUN_016";

type SimDataCode =
  "DAT_001" |
  "DAT_002" |
  "DAT_003" |
  "DAT_004" |
  "DAT_005" |
  "DAT_006";

type StringTableCode =
  "STB_001" |
  "STB_002" |
  "STB_003" |
  "STB_004" |
  "STB_005" |
  "STB_006" |
  "STB_007" |
  "STB_008" |
  "STB_009";

export type TdescCode =
  "TDS_001" |
  "TDS_002" |
  "TDS_003" |
  "TDS_004" |
  "TDS_005" |
  "TDS_006" |
  "TDS_007" |
  "TDS_008" |
  "TDS_009" |
  "TDS_010" |
  "TDS_011";

//#endregion

//#region Public Types

/** Proxy type for entries with IDs and diagnostics. */
export type Diagnosable = { id: number; diagnostics: DiagnosticInfo[]; };

/**
* How serious a diagnostic is. More serious levels have higher int values.
*/
export enum DiagnosticLevel {
  Info = 0,
  Warning = 1,
  Error = 2,
}

/**
 * Diagnostic information for a resource entry.
 */
export interface DiagnosticInfo {
  readonly ownerId: number;
  code: DiagnosticCode;
  level: DiagnosticLevel;
  message: string;
  line?: string;
}

export type DiagnosticCode = "Unknown" |
  GeneralCode |
  TuningCode |
  SimDataCode |
  StringTableCode |
  TdescCode;

export namespace DiagnosticCode {
  const _CODE_BRIEFS: Record<DiagnosticCode, string> = {
    "Unknown": "Something unexpected went wrong.",
    // General
    "GEN_001": "Failed to parse file into appropriate data model.",
    "GEN_002": "File has instance of 0.",
    "GEN_003": "File has instance equal to FNV hash of empty string.",
    "GEN_004": "Same resource key in use by multiple files.",
    // Tuning
    "TUN_001": "Failed to parse tuning's XML DOM.",
    "TUN_002": "Invalid root node for instance tuning.",
    "TUN_003": "Tuning instance does not match s attribute.",
    "TUN_004": "Instance tuning missing c, i, m, n, or s attribute(s).",
    "TUN_005": "Tuning instance exceeds bit limit.",
    "TUN_006": "Unrecognized i attribute in instance tuning.",
    "TUN_007": "Tuning type does not match i attribute.",
    "TUN_008": "Module tuning does not have Tuning type (03B33DDF).",
    "TUN_009": "Module tuning instance does not match name.",
    "TUN_010": "Module tuning missing n or s attribute(s).",
    "TUN_011": "Tuning is missing required paired SimData.",
    "TUN_012": "Suspected tuning file not using a known tuning type.",
    "TUN_013": "Same instance in use by multiple tuning files.",
    "TUN_014": "Same name in use by multiple tuning files.",
    "TUN_015": "Tuning is missing optional SimData.",
    "TUN_016": "Non-override tuning is using non-BG group.",
    // SimData
    "DAT_001": "SimData name does not match paired tuning's name.",
    "DAT_002": "SimData group does not match paired tuning's type.",
    "DAT_003": "SimData group does not exist for paired tuning's type.",
    "DAT_004": "SimData is not paired with tuning file.",
    "DAT_005": "SimData u attribute does not match tuning group.",
    "DAT_006": "Suspected SimData not using SimData type.",
    // String Table
    "STB_001": "Size of string table does not match other locales.",
    "STB_002": "String table locale not recognized.",
    "STB_003": "String table does not have every locale paired.",
    "STB_004": "Multiple strings have same key in same string table.",
    "STB_005": "Multiple strings have same text in same string table.",
    "STB_006": "String table has key of 0.",
    "STB_007": "String table has key equal to FNV hash of empty string.",
    "STB_008": "Suspected string table not using StringTable type.",
    "STB_009": "Multiple string tables with same locale.",
    // TDESC
    "TDS_001": "Found unexpected value node outside of tunable.",
    "TDS_002": "Using deprecated property in tunable tuple.",
    "TDS_003": "Using unrecognized or incorrect XML tag.",
    "TDS_004": "Missing required property in tunable tuple.",
    "TDS_005": "Multiple uses of same property in tunable tuple.",
    "TDS_006": "Using unknown property in tunable tuple.",
    "TDS_007": "Using unknown type in tunable variant.",
    "TDS_008": "Variant child name does not match variant type.",
    "TDS_009": "Using None when not allowed by tunable.",
    "TDS_010": "Using invalid value in tunable.",
    "TDS_011": "Using deleted property in tunable tuple.",
  };

  /**
   * Returns a list of all DiagnosticCodes with the given prefix. If none is
   * provided, then all are returned.
   * 
   * @param prefix Prefix to restrict results by
   */
  export function getAll(prefix?: CodePrefix): readonly DiagnosticCode[] {
    const codes: string[] = [];

    for (const code in _CODE_BRIEFS) {
      if (!prefix || code.startsWith(prefix)) {
        codes.push(code);
      }
    }

    return codes as DiagnosticCode[];
  }

  /**
   * Returns brief, plain English description of error code.
   * 
   * @param code Diagnostic code to get brief for
   */
  export function getBrief(code: DiagnosticCode): string {
    return _CODE_BRIEFS[code];
  }
}

//#endregion
