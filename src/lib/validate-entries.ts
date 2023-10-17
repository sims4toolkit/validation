import { formatResourceGroup, formatResourceKey, formatResourceType } from "@s4tk/hashing/formatting";
import { Package, RawResource, StringTableResource, XmlResource } from "@s4tk/models";
import type { ResourceKeyPair } from "@s4tk/models/types";
import { BinaryResourceType, SimDataGroup, StringTableLocale, TuningResourceType } from "@s4tk/models/enums";
import type { ValidatedEntries, ValidatedEntry, ValidatedStringTableEntry, ValidatedStringTableSet, ValidatedTuningPair } from "./types";
import { validateEntry } from "./validate-entry";
import { REQUIRED_SIMDATAS, UNSCANNABLE_TYPES } from "./constants";

//#region Exported Functions

/**
 * Parses the given buffer as a package and scans its contents for issues with
 * metadata or relationships between files.
 * 
 * @param buffer Buffer containing uncompressed package (DBPF) data.
 * @returns Structure detailing the validaity of the resources in the package.
 */
export function validatePackageBuffer(buffer: Buffer): ValidatedEntries {
  const entries = Package.extractResources<RawResource>(buffer, {
    decompressBuffers: true,
    keepDeletedRecords: true,
    loadRaw: true,
  });

  return validateEntries(entries);
}

/**
 * Scans the submitted resource entries for common issues with their metadata
 * and relationships with other entries. Provided entries *must* have been
 * loaded raw, because checking for corrupt files is part of validation.
 * 
 * @param entries List of related resource entries to validate.
 * @returns Structure detailing the validaity of the submitted resource entries.
 */
export function validateEntries(entries: ResourceKeyPair<RawResource>[]): ValidatedEntries {
  const organized = _organizeEntries(entries);

  organized.pairedTunings.forEach(_validatePairedTuning);
  organized.stringTables.forEach(_validateStringTableSet);
  organized.others.forEach(_validateOther);

  _validateRepeatedTuningNames(organized.pairedTunings);
  _validateResourceKeys(organized);

  return organized;
}

//#endregion

//#region Helper Functions

function _organizeEntries(entries: ResourceKeyPair<RawResource>[]): ValidatedEntries {
  const tunings: ResourceKeyPair<RawResource>[] = [];
  const others: ResourceKeyPair<RawResource>[] = [];
  const simdataByInstance = new Map<bigint, ResourceKeyPair<RawResource>>();
  const stblsByInstance = new Map<string, ResourceKeyPair<RawResource>[]>();

  entries.forEach(entry => {
    if (entry.key.type === BinaryResourceType.SimData) {
      if (simdataByInstance.has(entry.key.instance)) {
        others.push(entry);
      } else {
        simdataByInstance.set(entry.key.instance, entry);
      }
    } else if (entry.key.type === BinaryResourceType.StringTable) {
      const instanceBase = StringTableLocale.getInstanceBase(entry.key.instance);
      const groupInst = `${entry.key.group}-${instanceBase}`;
      if (stblsByInstance.has(groupInst)) {
        stblsByInstance.get(groupInst).push(entry);
      } else {
        stblsByInstance.set(groupInst, [entry]);
      }
    } else if (entry.key.type in TuningResourceType) {
      tunings.push(entry);
    } else {
      others.push(entry);
    }
  });

  const addDiagnostics: (entry: ResourceKeyPair) => ValidatedEntry =
    (entry) => ({ diagnostics: [], entry, parsed: false });

  return {
    pairedTunings: tunings.map(entry => {
      let simdata: ValidatedEntry = undefined;
      if (simdataByInstance.has(entry.key.instance)) {
        simdata = addDiagnostics(simdataByInstance.get(entry.key.instance));
        simdataByInstance.delete(entry.key.instance);
      }
      return { tuning: addDiagnostics(entry), simdata };
    }),
    stringTables: (() => {
      const stbls: ValidatedStringTableSet[] = [];
      stblsByInstance.forEach((entries, groupInstance) => {
        stbls.push({
          groupInstance,
          stringTables: entries.map(entry => {
            const stbl = addDiagnostics(entry) as ValidatedStringTableEntry;
            stbl.locale = StringTableLocale.getLocale(entry.key.instance);
            return stbl;
          })
        });
      });
      return stbls;
    })(),
    others: (() => {
      simdataByInstance.forEach(entry => others.push(entry));
      return others.map(addDiagnostics);
    })()
  };
}

function _validatePairedTuning(pair: ValidatedTuningPair) {
  validateEntry(pair.tuning);
  const tuningTypeName = TuningResourceType[pair.tuning.entry.key.type] ?? "Unknown";
  if (pair.simdata) {
    validateEntry(pair.simdata);
    const expectedGroup = SimDataGroup.getForTuning(pair.tuning.entry.key.type);
    if (expectedGroup in SimDataGroup) {
      if (expectedGroup !== pair.simdata.entry.key.group) {
        const expectedGroupName = SimDataGroup[expectedGroup];
        const foundGroupName = SimDataGroup[pair.simdata.entry.key.group] ?? "Unknown";
        pair.simdata.diagnostics.push({
          level: "error",
          message: `Expected this SimData to have a group of ${expectedGroupName} (${formatResourceGroup(expectedGroup)}), but found ${foundGroupName} (${formatResourceGroup(pair.simdata.entry.key.group)}).`
        });
      }
    } else {
      pair.simdata.diagnostics.push({
        level: "error",
        message: `There is no known SimData group for tuning type ${tuningTypeName} (${formatResourceType(pair.tuning.entry.key.type)}). If you are sure this is correct, then S4TK might need to be updated.`
      });
    }
  } else if (pair.tuning.parsed) {
    const { c, i } = (pair.tuning.entry.value as XmlResource).root.attributes;
    if (REQUIRED_SIMDATAS.types.has(i)) {
      pair.tuning.diagnostics.push({
        level: "error",
        message: `Tuning type ${tuningTypeName} (${formatResourceType(pair.tuning.entry.key.type)}) is known to require SimData, but one wasn't found. If the SimData does exist, ensure its instance matches this tuning.`
      });
    } else if (REQUIRED_SIMDATAS.classes.has(`${i}:${c}`)) {
      pair.tuning.diagnostics.push({
        level: "error",
        message: `Tuning class ${c} is known to require SimData, but one wasn't found. If the SimData does exist, ensure its instance matches this tuning.`
      });
    }
    // TODO: personality traits?
  }
}

function _validateStringTableSet(set: ValidatedStringTableSet) {
  let expectedSize: number = undefined;
  set.stringTables.forEach(stbl => {
    validateEntry(stbl);
    if (!stbl.parsed) return;
    const size = (stbl.entry.value as StringTableResource).size;
    expectedSize ??= size;
    if (expectedSize !== size) stbl.diagnostics.push({
      level: "warning",
      message: "Size of this string table is inconsistent with other locales."
    });
  });
}

function _validateOther(wrapper: ValidatedEntry) {
  validateEntry(wrapper);

  if (wrapper.entry.key.type === BinaryResourceType.SimData) {
    wrapper.diagnostics.push({
      level: "warning",
      message: "SimData is not paired with a tuning file."
    });
  }
}

function _validateRepeatedTuningNames(pairs: ValidatedTuningPair[]) {
  const tuningsByName = new Map<string, ValidatedEntry[]>();

  pairs.forEach(({ tuning }) => {
    if (tuning.parsed) {
      const filename = (tuning.entry.value as XmlResource).root.name;
      if (tuningsByName.has(filename)) {
        tuningsByName.get(filename).push(tuning);
      } else {
        tuningsByName.set(filename, [tuning]);
      }
    }
  });

  tuningsByName.forEach((tunings, filename) => {
    if (tunings.length > 1) tunings.forEach(tuning => {
      tuning.diagnostics.push({
        level: "warning",
        message: `${tunings.length} tuning files are using the name "${filename}".`
      });
    });
  });
}

function _validateResourceKeys(entries: ValidatedEntries) {
  const filesByKey = new Map<string, ValidatedEntry[]>();

  const warnInstance = (validated: ValidatedEntry) => {
    if (UNSCANNABLE_TYPES.has(validated.entry.key.type)) return;
    if (validated.entry.key.instance === 0n) {
      validated.diagnostics.push({
        level: "error",
        message: "Resources cannot have an instance of 0."
      });
    } else if (validated.entry.key.instance === 0x811C9DC5n) {
      validated.diagnostics.push({
        level: "warning",
        message: "Instance is 0x811C9DC5 (the FNV-32 hash of an empty string)."
      });
    } else if (validated.entry.key.instance === 0xCBF29CE484222325n) {
      validated.diagnostics.push({
        level: "warning",
        message: "Instance is 0xCBF29CE484222325 (the FNV-64 hash of an empty string)."
      });
    }
  };

  const addFile = (validated: ValidatedEntry, isSimData = false) => {
    warnInstance(validated);

    const key = formatResourceKey(validated.entry.key, "-");
    if (filesByKey.has(key)) {
      filesByKey.get(key).push(validated);
    } else {
      filesByKey.set(key, [validated]);
    }
  };

  entries.pairedTunings.forEach(({ tuning, simdata }) => {
    addFile(tuning);
    if (simdata) addFile(simdata, true);
  });

  entries.stringTables.forEach(stblSet => {
    stblSet.stringTables.forEach(stbl => addFile(stbl));
  });

  entries.others.forEach(other => addFile(other));

  filesByKey.forEach((entries, key) => {
    if (entries.length > 1) entries.forEach(entry => {
      entry.diagnostics.push({
        level: "error",
        message: `Resource key ${key} is in use by ${entries.length} files.`
      });
    });
  });
}

//#endregion
