import { SimDataResource } from "@s4tk/models";
import type { OrganizedResources, ValidatedSimData } from "../types";
import { loadModel } from "../helpers";

/**
 * Validates an entry against the `SimData` schema.
 * 
 * @param entry SimData entry to validate
 */
export default function validateSimData(
  entry: ValidatedSimData,
  allResources: OrganizedResources
) {
  loadModel("SimData", entry, b => SimDataResource.from(b));
}
