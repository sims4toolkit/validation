import { formatAsHexString, formatResourceGroup, formatResourceType } from "@s4tk/hashing/formatting";
import { SimDataResource, XmlResource } from "@s4tk/models";
import { SimDataGroup, TuningResourceType } from "@s4tk/models/enums";
import type { OrganizedResources, ValidatedResource, ValidatedSimData, ValidatedTuning } from "../types/resources";
import Diagnose from "../utils/diagnose";
import { loadModel } from "./helpers";

/**
 * Validates an entry against the `SimData` schema.
 * 
 * @param entry SimData entry to validate
 * @param organized OrganizedResources object for reference
 */
export function validateSimData(
  entry: ValidatedSimData,
  organized: OrganizedResources
) {
  const simdata = loadModel("SimData", entry, b => SimDataResource.from(b));
  const tuning = organized.resources[entry.pairedTuningId];
  _validateSimDataWithTuning(entry, tuning);
  _validateUnusedFlags(entry, simdata, tuning);
}

/**
 * Runs additional `SimData` validation on an entry after all resources have
 * been validated.
 * 
 * @param entry SimData entry to post-validate
 * @param organized OrganizedResources object for reference
 */
export function postValidateSimData(
  entry: ValidatedSimData,
  organized: OrganizedResources
) {
  if (!entry.modelLoaded) return;
  const tuning = organized.resources[entry.pairedTuningId];
  if (tuning?.modelLoaded && (tuning as ValidatedTuning).domValid) {
    const tuningName = (tuning.resource as XmlResource).root.name;
    const simdataName = (entry.resource as SimDataResource).instance.name;
    if (tuningName !== simdataName) {
      Diagnose.info(entry, "DAT_001", `Expected SimData name to match tuning name of "${tuningName}", but found "${simdataName}".`);
    }
  }
}

//#region Helpers

function _validateSimDataWithTuning(
  entry: ValidatedSimData,
  tuning: ValidatedResource | undefined
) {
  if (tuning) {
    // validate SimData group
    const expectedGroup = SimDataGroup.getForTuning(tuning.key.type);
    if (expectedGroup in SimDataGroup) {
      if (expectedGroup !== entry.key.group) {
        const expectedGroupName = SimDataGroup[expectedGroup];
        const foundGroupName = SimDataGroup[entry.key.group] ?? "Unknown";
        Diagnose.error(entry, "DAT_002", `Expected this SimData to have a group of ${expectedGroupName} (${formatResourceGroup(expectedGroup)}), but found ${foundGroupName} (${formatResourceGroup(entry.key.group)}) instead.`);
      }
    } else {
      const tuningTypeName = TuningResourceType[tuning.key.type] ?? "Unknown";
      Diagnose.warning(entry, "DAT_003", `There is no known SimData group for tuning type ${tuningTypeName} (${formatResourceType(tuning.key.type)}). If you are sure this is correct, then S4TK might need to be updated.`);
    }
  } else {
    Diagnose.warning(entry, "DAT_004", "SimData is not paired with a tuning file. If the tuning does exist, ensure its instance matches this SimData.");
  }
}

function _validateUnusedFlags(
  entry: ValidatedSimData,
  simdata: SimDataResource | undefined,
  tuning: ValidatedResource | undefined
) {
  if (!(simdata && tuning)) return;
  if (simdata.unused !== tuning.key.group) {
    Diagnose.info(entry, "DAT_005", `Expected u attribute to match paired tuning's group of ${formatResourceGroup(tuning.key.group)}, but found u="${formatAsHexString(simdata.unused, 8, true)}" instead.`);
  }
}

//#endregion
