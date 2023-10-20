type CodePrefix =
  "GEN" |
  "TUN" |
  "DAT" |
  "STB";

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
  "TUN_014";

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
  "STB_008";

export type DiagnosticCode = "Unknown" |
  GeneralCode |
  TuningCode |
  SimDataCode |
  StringTableCode;

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
