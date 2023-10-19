import { formatAsHexString, formatStringKey } from "@s4tk/hashing/formatting";
import { StringTableResource } from "@s4tk/models";
import type { OrganizedResources, ValidatedStringTable } from "../types";
import { Diagnose, ItemCounter, loadModel } from "../helpers";
import { StringTableLocale } from "@s4tk/models/enums";

/**
 * Validates an entry against the `StringTable` schema.
 * 
 * @param entry String table entry to validate
 * @param organized OrganizedResources object for reference
 */
export function validateStringTable(
  entry: ValidatedStringTable,
  organized: OrganizedResources
) {
  const stbl = loadModel("string table", entry, b => StringTableResource.from(b));
  if (stbl) _validateStandaloneStbl(entry, stbl);
}

/**
 * Runs additional `StringTable` validation on an entry after all resources have
 * been validated.
 * 
 * @param entry StringTable entry to post-validate
 * @param organized OrganizedResources object for reference
 */
export function postValidateStringTable(
  entry: ValidatedStringTable,
  organized: OrganizedResources
) {
  // ensuring that stbls of same group/instance have same # entries
  if (entry.primary || !entry.modelLoaded) return;
  const stbl = entry.resource as StringTableResource;
  entry.otherLocaleIds.forEach(id => {
    const primaryEntry = organized.resources[id] as ValidatedStringTable;
    if (!(primaryEntry?.primary && primaryEntry.modelLoaded)) return;
    const primaryStbl = primaryEntry.resource as StringTableResource;
    const primaryLocaleName = StringTableLocale[primaryEntry.locale] ?? "Unknown";
    if (stbl.size < primaryStbl.size) {
      const diff = primaryStbl.size - stbl.size;
      const stringText = diff === 1 ? "string" : "strings";
      Diagnose.warning(entry, "STB_001", `Missing ${diff} ${stringText} from paired ${primaryLocaleName} string table.`);
    } else if (stbl.size > primaryStbl.size) {
      const diff = stbl.size - primaryStbl.size;
      const stringText = diff === 1 ? "string" : "strings";
      Diagnose.warning(entry, "STB_001", `Contains ${diff} more ${stringText} than paired ${primaryLocaleName} string table.`);
    }
  });
}

//#region Helpers

function _validateStandaloneStbl(entry: ValidatedStringTable, stbl: StringTableResource) {
  if (!(entry.locale in StringTableLocale)) {
    Diagnose.fatal(entry, "STB_002", `Locale of ${formatAsHexString(entry.locale, 2, true)} is not recognized; this string table will never be loaded.`);
  }

  if (entry.primary) {
    const missingLocales = 17 - entry.otherLocaleIds.length;
    if (missingLocales > 0) {
      const pl = missingLocales === 1 ? "" : "s";
      Diagnose.info(entry, "STB_003", `Missing string table${pl} for ${missingLocales} locale${pl}. Text will be blank in these languages.`);
    }
  }

  const keyCounter = new ItemCounter<number>();
  const valueCounter = new ItemCounter<string>();
  stbl.entries.forEach(({ key, value }) => {
    keyCounter.count(key);
    valueCounter.count(value);
  });
  keyCounter.forEach(2, (key, count) => {
    Diagnose.error(entry, "STB_004", `The key ${formatStringKey(key)} is in use by ${count} strings.`);
  });
  valueCounter.forEach(2, (value, count) => {
    Diagnose.info(entry, "STB_005", `The value "${value}" appears in ${count} strings.`);
  });

  if (stbl.hasKey(0)) {
    Diagnose.warning(entry, "STB_006", "At least one string has the key 0x00000000.");
  }

  if (stbl.hasKey(0x811C9DC5)) {
    Diagnose.warning(entry, "STB_007", "At least one string has the key 0x811C9DC5 (the FNV-32 hash of an empty string).");
  }
}

//#endregion
