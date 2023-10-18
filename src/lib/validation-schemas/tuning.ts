import { fnv64 } from "@s4tk/hashing";
import { formatResourceType, formatResourceInstance } from "@s4tk/hashing/formatting";
import { XmlResource } from "@s4tk/models";
import { TuningResourceType } from "@s4tk/models/enums";
import type { OrganizedResources, ValidatedTuning } from "../types";
import { BIT_RESTRICTIONS, REQUIRED_SIMDATAS } from "../constants";
import { Diagnose, loadModel } from "../helpers";

/**
 * Validates an entry against the `Tuning` schema.
 * 
 * @param entry Tuning entry to validate
 * @param allResources OrganizedResources object for reference
 */
export function validateTuning(
  entry: ValidatedTuning,
  allResources: OrganizedResources
) {
  const tuning = loadModel("tuning", entry, b => XmlResource.from(b));
  if (tuning) _validateStandaloneTuning(entry, tuning);
  const simdata = allResources.ids[entry.pairedSimDataId];
  _validateTuningSimDataPair(entry, tuning, Boolean(simdata));
}

/**
 * Runs additional `Tuning` validation on an entry after all resources have
 * been validated.
 * 
 * @param entry Tuning entry to post-validate
 * @param allResources OrganizedResources object for reference
 */
export function postValidateTuning(
  entry: ValidatedTuning,
  allResources: OrganizedResources
) {
  // TODO:
}

//#region Helpers

function _validateStandaloneTuning(entry: ValidatedTuning, tuning: XmlResource) {
  try {
    tuning.dom;
    entry.domValid = true;
  } catch (e) {
    Diagnose.fatal(entry, "Failed to parse XML DOM.", e);
    return;
  }

  try {
    if (tuning.root.tag === "I") {
      _validateInstanceTuning(entry, tuning);
    } else if (tuning.root.tag === "M") {
      _validateModuleTuning(entry, tuning);
    } else {
      Diagnose.fatal(entry, `<${tuning.root.tag}> is not a valid root node in XML tuning.`);
      return;
    }

    const { s } = tuning.root.attributes;
    if (entry.key.instance.toString() !== s) {
      Diagnose.error(entry, `Instance of ${formatResourceInstance(entry.key.instance)} does not match s="${s}".`);
    }
  } catch (e) {
    Diagnose.warning(entry, "Exception occurred while validating tuning.", e);
  }
}

function _validateInstanceTuning(entry: ValidatedTuning, tuning: XmlResource) {
  const { c, i, m, n, s } = tuning.root.attributes;

  if (!(c && i && m && n && s)) {
    Diagnose.error(entry, "Instance tuning must contain all c, i, m, n, and s attributes.");
    return;
  }

  // checking bit restrictions
  // TODO: check for personality traits somehow
  for (let i = 0; i < BIT_RESTRICTIONS.length; ++i) {
    const { maxBits, maxValue, classNames } = BIT_RESTRICTIONS[i];
    if (entry.key.instance <= maxValue) continue;
    if (classNames.has(c)) {
      // FIXME: should be warning instead?
      Diagnose.error(entry, `${c} class is known to require ${maxBits}-bit instances (max value of ${maxValue}), but this one has an instance of ${entry.key.instance}.`);
    }
  }

  // checking type and i
  const typeFromI = TuningResourceType.parseAttr(i);
  if (typeFromI === TuningResourceType.Tuning) {
    Diagnose.warning(entry, `Unrecognized instance type of i="${i}". If you are sure this is correct, then S4TK might need to be updated.`);
  } else if (typeFromI !== entry.key.type) {
    const foundName = TuningResourceType[entry.key.type] ?? "Unknown";
    const expectedName = TuningResourceType[typeFromI];
    Diagnose.error(entry, `Expected instance tuning with i="${i}" to have a type of ${expectedName} (${formatResourceType(typeFromI)}), but found ${foundName} (${formatResourceType(entry.key.type)}).`);
  }
}

function _validateModuleTuning(entry: ValidatedTuning, tuning: XmlResource) {
  const { n, s } = tuning.root.attributes;

  if (entry.key.type !== TuningResourceType.Tuning) {
    const foundName = TuningResourceType[entry.key.type] ?? "Unknown";
    Diagnose.error(entry, `Expected module tuning to have a type of Tuning (${formatResourceType(TuningResourceType.Tuning)}), but found ${foundName} (${formatResourceType(entry.key.type)}).`);
  }

  if (!(n && s)) {
    Diagnose.error(entry, "Module tuning must contain both n and s attributes.");
    return;
  }

  const expectedInstance = fnv64(n.replace(/\./g, "-")).toString();
  if (s !== expectedInstance) {
    Diagnose.error(entry, `Module tuning with n="${n}" must have s="${expectedInstance}", but found s="${s}" instead.`);
  }
}

function _validateTuningSimDataPair(
  entry: ValidatedTuning,
  tuning: XmlResource | undefined,
  hasSimData: boolean
) {
  if (hasSimData || !(tuning && entry.domValid)) return;
  const { c, i } = tuning.root.attributes;
  if (REQUIRED_SIMDATAS.types.has(i)) {
    const tuningTypeName = TuningResourceType[entry.key.type] ?? "Unknown";
    Diagnose.error(entry, `Tuning type ${tuningTypeName} (${formatResourceType(entry.key.type)}) is known to require SimData, but one wasn't found. If the SimData does exist, ensure its instance matches this tuning.`);
  } else if (REQUIRED_SIMDATAS.classes.has(`${i}:${c}`)) {
    Diagnose.error(entry, `Tuning class ${c} is known to require SimData, but one wasn't found. If the SimData does exist, ensure its instance matches this tuning.`);
  }
}

//#endregion
