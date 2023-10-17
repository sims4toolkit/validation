import { fnv64 } from "@s4tk/hashing";
import { formatStringKey, formatResourceInstance, formatResourceType } from "@s4tk/hashing/formatting";
import { SimDataResource, StringTableResource, XmlResource } from "@s4tk/models";
import { Resource } from "@s4tk/models/types";
import { BinaryResourceType, TuningResourceType } from "@s4tk/models/enums";
import type { ValidatedEntry } from "./types";
import { BIT_RESTRICTIONS, UNSCANNABLE_TYPES } from "./constants";

//#region Exported Funtions

/**
 * Runs file-level validation on the given entry.
 * 
 * @param wrapper Wrapper of entry to validate.
 */
export function validateEntry(wrapper: ValidatedEntry) {
  if (UNSCANNABLE_TYPES.has(wrapper.entry.key.type)) return;

  if (wrapper.entry.key.type === BinaryResourceType.SimData) {
    _validateSimData(wrapper);
  } else if (wrapper.entry.key.type === BinaryResourceType.StringTable) {
    _validateStringTable(wrapper);
  } else if (wrapper.entry.key.type in TuningResourceType) {
    _validateTuning(wrapper);
  } else {
    _tryValidateUnknown(wrapper);
  }
}

//#endregion

//#region Helper Functions

function _validateTuning(wrapper: ValidatedEntry) {
  const tuning = _parseFromRaw(wrapper, "tuning", (b) => {
    const xml = XmlResource.from(b);
    xml.dom;
    return xml;
  });
  if (!tuning) return;

  try {
    if (tuning.root.tag === "I") {
      _validateInstanceTuning(wrapper, tuning);
    } else if (tuning.root.tag === "M") {
      _validateModuleTuning(wrapper, tuning);
    } else {
      return wrapper.diagnostics.push({
        level: "error",
        message: `<${tuning.root.tag}> is not a valid root node in XML tuning.`
      });
    }

    const { s } = tuning.root.attributes;
    if (wrapper.entry.key.instance.toString() !== s) {
      wrapper.diagnostics.push({
        level: "error",
        message: `Instance of ${formatResourceInstance(wrapper.entry.key.instance)} does not match s="${s}"`
      });
    }
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : e as string;
    wrapper.diagnostics.push({
      level: "warning",
      message: `Exception occurred while validating (${errorMsg})`
    });
  }
}

function _validateInstanceTuning(wrapper: ValidatedEntry, tuning: XmlResource) {
  const { c, i, m, n, s } = tuning.root.attributes;

  if (!(c && i && m && n && s)) return wrapper.diagnostics.push({
    level: "error",
    message: `Instance tuning must contain all c, i, m, n, and s attributes.`
  });

  // checking bit restrictions
  for (let i = 0; i < BIT_RESTRICTIONS.length; ++i) {
    const { maxBits, maxValue, classNames } = BIT_RESTRICTIONS[i];
    if (wrapper.entry.key.instance <= maxValue) continue;
    if (classNames.has(c)) {
      wrapper.diagnostics.push({
        level: "warning",
        message: `${c} is known to require ${maxBits}-bit instances (max value of ${maxValue}), but this one has an instance of ${wrapper.entry.key.instance}.`
      });
    }
  }

  // checking type and i
  const expectedType = TuningResourceType.parseAttr(i);
  if (expectedType === TuningResourceType.Tuning) {
    wrapper.diagnostics.push({
      level: "warning",
      message: `Unrecognized instance type of i="${i}". If you are sure this is correct, then S4TK might need to be updated.`
    });
  } else if (expectedType !== wrapper.entry.key.type) {
    const foundName = TuningResourceType[wrapper.entry.key.type] ?? "Unknown";
    const expectedName = TuningResourceType[expectedType];
    wrapper.diagnostics.push({
      level: "error",
      message: `Expected instance tuning with i="${i}" to have a type of ${expectedName} (${formatResourceType(expectedType)}), but found ${foundName} (${formatResourceType(wrapper.entry.key.type)}).`
    });
  }
}

function _validateModuleTuning(wrapper: ValidatedEntry, tuning: XmlResource) {
  const { n, s } = tuning.root.attributes;

  if (wrapper.entry.key.type !== TuningResourceType.Tuning) {
    const foundName = TuningResourceType[wrapper.entry.key.type] ?? "Unknown";
    wrapper.diagnostics.push({
      level: "error",
      message: `Expected module tuning to have a type of Tuning (${formatResourceType(TuningResourceType.Tuning)}), but found ${foundName} (${formatResourceType(wrapper.entry.key.type)}).`
    });
  }

  if (!(n && s)) return wrapper.diagnostics.push({
    level: "error",
    message: `Module tuning must contain both n and s attributes.`
  });

  const expectedInstance = fnv64(n.replace(/\./g, "-"));
  if (s !== expectedInstance.toString()) wrapper.diagnostics.push({
    level: "error",
    message: `Module tuning with n="${n}" must have s="${expectedInstance}", but found s="${s}" instead.`,
  });
}

function _validateSimData(wrapper: ValidatedEntry) {
  _parseFromRaw(wrapper, "SimData", (b) => SimDataResource.from(b));
}

function _validateStringTable(wrapper: ValidatedEntry) {
  const stbl = _parseFromRaw(wrapper, "string table", (b) => StringTableResource.from(b));
  if (!stbl) return;

  const repeatedKeys = stbl.findRepeatedKeys();
  repeatedKeys.forEach(key => {
    wrapper.diagnostics.push({
      level: "error",
      message: `The key ${formatStringKey(key)} is used by more than one string.`,
    });
  });

  const valueCounts = new Map<string, number>;
  stbl.entries.forEach(({ value }) => {
    valueCounts.set(value, (valueCounts.get(value) ?? 0) + 1);
  });
  valueCounts.forEach((count, value) => {
    if (count > 1) wrapper.diagnostics.push({
      level: "warning",
      message: `The string "${value}" appears in more than one entry.`,
    });
  });

  if (stbl.hasKey(0)) wrapper.diagnostics.push({
    level: "error",
    message: "At least one entry has the key 0x00000000.",
  });

  if (stbl.hasKey(0x811C9DC5)) wrapper.diagnostics.push({
    level: "warning",
    message: "At least one entry has the key 0x811C9DC5 (the FNV-32 hash of an empty string).",
  });
}

function _parseFromRaw<T extends Resource>(
  wrapper: ValidatedEntry,
  type: string,
  parse: (buffer: Buffer) => T
): T | undefined {
  try {
    const model = parse(wrapper.entry.value.getBuffer());
    wrapper.parsed = true;
    wrapper.entry = { key: wrapper.entry.key, value: model };
    return model;
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : e as string;
    if (!wrapper.parsed) {
      wrapper.diagnostics.push({
        level: "fatal",
        message: `Not a valid ${type} (${errorMsg})`
      });
    } else {
      wrapper.diagnostics.push({
        level: "warning",
        message: `Exception occurred while parsing (${errorMsg})`
      });
    }
  }
}

function _tryValidateUnknown(wrapper: ValidatedEntry) {
  try {
    const magic = wrapper.entry.value.getBuffer().toString("utf-8", 0, 4);
    if (magic === "DATA" && wrapper.entry.key.type !== BinaryResourceType.CombinedTuning) {
      wrapper.diagnostics.push({
        level: "error",
        message: "File appears to be a SimData, but is not using the SimData type (545AC67A)."
      });
      wrapper.entry.value = SimDataResource.from(wrapper.entry.value.getBuffer());
      wrapper.parsed = true;
    } else if (magic === "STBL") {
      wrapper.diagnostics.push({
        level: "error",
        message: "File appears to be a string table, but is not using the string table type (220557DA)."
      });
    } else if (magic.startsWith("<")) {
      const xml = XmlResource.from(wrapper.entry.value.getBuffer());
      xml.dom;
      wrapper.entry.value = xml;
      wrapper.parsed = true;
      if (xml.root.tag === "I" || xml.root.tag === "M") {
        wrapper.diagnostics.push({
          level: "warning",
          message: "File appears to be XML tuning, but is not using a recognized tuning type. If you are sure this file's type is correct, S4TK may need to be updated."
        });
      }
    }
  } catch (_) { }
}

//#endregion
