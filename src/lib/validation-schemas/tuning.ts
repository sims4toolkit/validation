import { fnv64 } from "@s4tk/hashing";
import { formatResourceGroup, formatResourceType, formatResourceInstance } from "@s4tk/hashing/formatting";
import { XmlResource } from "@s4tk/models";
import { TuningResourceType } from "@s4tk/models/enums";
import type { OrganizedResources, ValidatedTuning } from "../types/resources";
import { BIT_RESTRICTIONS, REQUIRED_SIMDATAS } from "../utils/constants";
import Diagnose from "../utils/diagnose";
import { groupIsBaseGame, loadModel } from "./helpers";

/**
 * Validates an entry against the `Tuning` schema.
 * 
 * @param entry Tuning entry to validate
 * @param organized OrganizedResources object for reference
 */
export function validateTuning(
  entry: ValidatedTuning,
  organized: OrganizedResources
) {
  const tuning = loadModel("tuning", entry, b => XmlResource.from(b));
  if (tuning) _validateStandaloneTuning(entry, tuning);
  const simdata = organized.resources[entry.pairedSimDataId];
  _validateTuningSimDataPair(entry, tuning, Boolean(simdata));
}

/**
 * Runs additional `Tuning` validation on an entry after all resources have
 * been validated.
 * 
 * @param entry Tuning entry to post-validate
 * @param organized OrganizedResources object for reference
 */
export function postValidateTuning(
  entry: ValidatedTuning,
  organized: OrganizedResources
) {
  // intentionally blank for now
}

//#region Helpers

function _validateStandaloneTuning(entry: ValidatedTuning, tuning: XmlResource) {
  try {
    tuning.dom;
    entry.domValid = true;
  } catch (e) {
    Diagnose.error(entry, "TUN_001", "Failed to parse XML DOM.", {
      exception: e
    });
    return;
  }

  try {
    if (tuning.root.tag === "I") {
      _validateInstanceTuning(entry, tuning);
    } else if (tuning.root.tag === "M") {
      _validateModuleTuning(entry, tuning);
    } else {
      Diagnose.error(entry, "TUN_002", `<${tuning.root.tag}> is not a valid root node in XML tuning.`);
      return;
    }

    const { s } = tuning.root.attributes;
    if ((s !== undefined) && (entry.key.instance.toString() !== s)) {
      Diagnose.error(entry, "TUN_003", `Instance of ${formatResourceInstance(entry.key.instance)} (${entry.key.instance}) does not match s="${s}".`);
    }
  } catch (e) {
    Diagnose.warning(entry, "Unknown", "Exception occurred while validating tuning.", {
      exception: e
    });
  }
}

function _validateInstanceTuning(entry: ValidatedTuning, tuning: XmlResource) {
  const { c, i, m, n, s } = tuning.root.attributes;

  if (!(c && i && m && n && s)) {
    Diagnose.error(entry, "TUN_004", "Instance tuning must contain all c, i, m, n, and s attributes.");
    return;
  }

  const isLikelyCustom = entry.key.instance > 2 ** 24 || n?.includes(":");
  if (isLikelyCustom && !groupIsBaseGame(entry.key.group)) {
    Diagnose.info(entry, "TUN_016", `Group of ${formatResourceGroup(entry.key.group)} will not load with the Base Game. This is not an issue for intentionally pack-restricted files/overrides. For the Base Game, use a group of 00000000 or 80000000.`);
  }

  // checking bit restrictions
  for (let i = 0; i < BIT_RESTRICTIONS.length; ++i) {
    const { maxBits, maxValue, classNames, rootTests } = BIT_RESTRICTIONS[i];
    if (entry.key.instance <= maxValue) continue;

    if (classNames.has(c)) {
      Diagnose.error(entry, "TUN_005", `${c} class is known to require ${maxBits}-bit instances (max value of ${maxValue}), but this one has an instance of ${entry.key.instance}.`);
      break;
    }

    for (let j = 0; j < rootTests.length; ++j) {
      const rootTest = rootTests[j];
      try {
        if (rootTest.fn(tuning.root)) {
          Diagnose.error(entry, "TUN_005", `${rootTest.pluralName} are known to require ${maxBits}-bit instances (max value of ${maxValue}), but this one has an instance of ${entry.key.instance}.`);
          break;
        }
      } catch (_) { }
    }
  }

  // checking type and i
  const typeFromI = TuningResourceType.parseAttr(i);
  if (typeFromI === TuningResourceType.Tuning) {
    Diagnose.warning(entry, "TUN_006", `Unrecognized instance type of i="${i}". If you are sure this is correct, then S4TK might need to be updated.`);
  } else if (typeFromI !== entry.key.type) {
    const foundName = TuningResourceType[entry.key.type] ?? "Unknown";
    const expectedName = TuningResourceType[typeFromI];
    Diagnose.error(entry, "TUN_007", `Expected instance tuning with i="${i}" to have a type of ${expectedName} (${formatResourceType(typeFromI)}), but found ${foundName} (${formatResourceType(entry.key.type)}).`);
  }
}

function _validateModuleTuning(entry: ValidatedTuning, tuning: XmlResource) {
  const { n, s } = tuning.root.attributes;

  if (entry.key.type !== TuningResourceType.Tuning) {
    const foundName = TuningResourceType[entry.key.type] ?? "Unknown";
    Diagnose.error(entry, "TUN_008", `Expected module tuning to have a type of Tuning (${formatResourceType(TuningResourceType.Tuning)}), but found ${foundName} (${formatResourceType(entry.key.type)}).`);
  }

  if (!(n && s)) {
    Diagnose.error(entry, "TUN_010", "Module tuning must contain both n and s attributes.");
    return;
  }

  const expectedInstance = fnv64(n.replace(/\./g, "-")).toString();
  if (s !== expectedInstance) {
    Diagnose.error(entry, "TUN_009", `Module tuning with n="${n}" must have s="${expectedInstance}", but found s="${s}" instead.`);
  }
}

function _validateTuningSimDataPair(
  entry: ValidatedTuning,
  tuning: XmlResource | undefined,
  hasSimData: boolean
) {
  if (hasSimData || !(tuning && entry.domValid)) return;
  const { c, i } = tuning.root.attributes;
  if (REQUIRED_SIMDATAS.alwaysTypes.has(i)) {
    const tuningTypeName = TuningResourceType[entry.key.type] ?? "Unknown";
    Diagnose.error(entry, "TUN_011", `Tuning type ${tuningTypeName} (${formatResourceType(entry.key.type)}) is known to require SimData, but one wasn't found. If the SimData does exist, ensure its instance matches this tuning.`);
  } else if (REQUIRED_SIMDATAS.sometimesTypes.has(i)) {
    const tuningTypeName = TuningResourceType[entry.key.type] ?? "Unknown";
    Diagnose.info(entry, "TUN_015", `Tuning type ${tuningTypeName} (${formatResourceType(entry.key.type)}) sometimes requires SimData, and one wasn't found. If functioning as expected, no action is needed.`);
  } else if (REQUIRED_SIMDATAS.alwaysClasses.has(`${i}:${c}`)) {
    Diagnose.error(entry, "TUN_011", `Tuning class ${c} is known to require SimData, but one wasn't found. If the SimData does exist, ensure its instance matches this tuning.`);
  } else if (REQUIRED_SIMDATAS.sometimesClasses.has(`${i}:${c}`)) {
    Diagnose.info(entry, "TUN_015", `Tuning class ${c} sometimes requires SimData, and one wasn't found. If functioning as expected, no action is needed.`);
  }
}

//#endregion
