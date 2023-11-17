import { DiagnosticCode, Diagnosable, DiagnosticLevel } from "../types/diagnostics";

type DiagnoseOptions = Partial<{
  exception: Error | string;
  line: string;
}>;

/**
 * Utilities for adding diagnostics to validated resources.
 */
namespace Diagnose {
  export function info(
    entry: Diagnosable,
    code: DiagnosticCode,
    message: string,
    options?: DiagnoseOptions,
  ) {
    _diagnose(DiagnosticLevel.Info, entry, code, message, options);
  }

  export function warning(
    entry: Diagnosable,
    code: DiagnosticCode,
    message: string,
    options?: DiagnoseOptions,
  ) {
    _diagnose(DiagnosticLevel.Warning, entry, code, message, options);
  }

  export function error(
    entry: Diagnosable,
    code: DiagnosticCode,
    message: string,
    options?: DiagnoseOptions,
  ) {
    _diagnose(DiagnosticLevel.Error, entry, code, message, options);
  }

  function _diagnose(
    level: DiagnosticLevel,
    entry: Diagnosable,
    code: DiagnosticCode,
    message: string,
    options?: DiagnoseOptions
  ) {
    if (options?.exception) {
      const error = options.exception;
      const errorMsg = error instanceof Error ? error.message : error;
      message = `${message} [${errorMsg}]`;
    }

    entry.diagnostics.push({
      ownerId: entry.id,
      code,
      level,
      message,
      line: options?.line
    });
  }
}

export default Diagnose;
