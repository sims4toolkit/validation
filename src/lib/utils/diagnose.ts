import { ValidatedResource } from "../types/resources";
import { DiagnosticCode, DiagnosticLevel } from "../types/diagnostics";

/**
 * Utilities for adding diagnostics to validated resources.
 */
namespace Diagnose {
  export function info(entry: ValidatedResource, code: DiagnosticCode, message: string, error?: Error | string) {
    _diagnose(DiagnosticLevel.Info, entry, code, message, error);
  }

  export function warning(entry: ValidatedResource, code: DiagnosticCode, message: string, error?: Error | string) {
    _diagnose(DiagnosticLevel.Warning, entry, code, message, error);
  }

  export function error(entry: ValidatedResource, code: DiagnosticCode, message: string, error?: Error | string) {
    _diagnose(DiagnosticLevel.Error, entry, code, message, error);
  }

  function _diagnose(level: DiagnosticLevel, entry: ValidatedResource, code: DiagnosticCode, message: string, error?: Error | string) {
    if (error) message = `${message} [${error instanceof Error ? error.message : error}]`;
    entry.diagnostics.push({ ownerId: entry.id, code, level, message });
  }
}

export default Diagnose;
