import { formatStringKey } from "@s4tk/hashing/formatting";
import { StringTableResource } from "@s4tk/models";
import type { OrganizedResources, ValidatedStringTable } from "../types";
import { Diagnose, ItemCounter, loadModel } from "../helpers";

/**
 * Validates an entry against the `StringTable` schema.
 * 
 * @param entry String table entry to validate
 */
export default function validateStringTable(
  entry: ValidatedStringTable,
  allResources: OrganizedResources
) {
  const stbl = loadModel("string table", entry, b => StringTableResource.from(b));
  if (stbl === undefined) return;

  const keyCounter = new ItemCounter<number>();
  const valueCounter = new ItemCounter<string>();
  stbl.entries.forEach(({ key, value }) => {
    keyCounter.count(key);
    valueCounter.count(value);
  });
  keyCounter.forEach(2, (key, count) => {
    Diagnose.error(entry, `The key ${formatStringKey(key)} is in use by ${count} strings.`);
  });
  valueCounter.forEach(2, (value, count) => {
    Diagnose.warning(entry, `The value "${value}" appears in ${count} strings.`);
  });

  if (stbl.hasKey(0)) {
    Diagnose.warning(entry, "At least one string has the key 0x00000000.");
  }

  if (stbl.hasKey(0x811C9DC5)) {
    Diagnose.warning(entry, "At least one string has the key 0x811C9DC5 (the FNV-32 hash of an empty string).");
  }
}
