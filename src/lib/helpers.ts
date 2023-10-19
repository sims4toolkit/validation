import { Resource } from "@s4tk/models/types";
import { DiagnosticLevel } from "./enums";
import { ValidatedResource } from "./types";
import DiagnosticCode from "./diagnostic-code";

/**
 * Utilities for adding diagnostics of any level.
 */
export namespace Diagnose {
  export function info(entry: ValidatedResource, code: DiagnosticCode, message: string, error?: Error | string) {
    _diagnose(DiagnosticLevel.Info, entry, code, message, error);
  }

  export function warning(entry: ValidatedResource, code: DiagnosticCode, message: string, error?: Error | string) {
    _diagnose(DiagnosticLevel.Warning, entry, code, message, error);
  }

  export function error(entry: ValidatedResource, code: DiagnosticCode, message: string, error?: Error | string) {
    _diagnose(DiagnosticLevel.Error, entry, code, message, error);
  }

  export function fatal(entry: ValidatedResource, code: DiagnosticCode, message: string, error?: Error | string) {
    _diagnose(DiagnosticLevel.Fatal, entry, code, message, error);
  }

  function _diagnose(level: DiagnosticLevel, entry: ValidatedResource, code: DiagnosticCode, message: string, error?: Error | string) {
    if (error) message = `${message} [${error instanceof Error ? error.message : error}]`;
    entry.diagnostics.push({ ownerId: entry.id, code, level, message });
  }
}

/**
 * Utility for counting hashable items.
 */
export class ItemCounter<T> {
  private readonly _map = new Map<T, number>();

  count(item: T) {
    this._map.set(item, this.get(item) + 1);
  }

  get(item: T): number {
    return this._map.get(item) ?? 0;
  }

  forEach(threshold: number, fn: (item: T, count: number) => void) {
    this._map.forEach((count, item) => {
      if (count >= threshold) fn(item, count);
    });
  }
}

/**
 * Parses a resource model of type `T` from the buffer in `entry`. If the model
 * is successfully parsed, then `entry.modelLoaded` is set to true and
 * `entry.resource` is set to the parsed model instance. If the model cannot be
 * parsed, then `entry.modelLoaded` remains false and a fatal error is appended
 * to the entry.
 * 
 * @param typeName Type name to use in error message, if added
 * @param entry Entry to add parsed model to
 * @param parse Function that parses model from buffer
 * @returns The parsed model
 */
export function loadModel<T extends Resource>(
  typeName: string,
  entry: ValidatedResource,
  parse: (buffer: Buffer) => T
): T | undefined {
  try {
    const model = parse(entry.resource.getBuffer());
    entry.modelLoaded = true;
    entry.resource = model;
    return model;
  } catch (e) {
    Diagnose.fatal(entry, "GEN_001", `Not a valid ${typeName}.`, e);
  }
}
