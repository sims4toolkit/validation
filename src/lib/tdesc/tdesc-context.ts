import { InstanceAttributes, RawTdescResolver } from "./types";
import { TdescInstanceSpec, TdescFragmentSpec } from "./tdesc-spec";

/**
 * TODO:
 */
export default class TdescValidationContext {
  private readonly _instances = new Map<string, TdescInstanceSpec>();
  private readonly _modules = new Map<string, TdescInstanceSpec>();
  private readonly _fragments = new Map<string, TdescFragmentSpec>();

  constructor(
    private readonly _resolver: RawTdescResolver,
  ) { }
}

//#region Helpers

const _formatInstanceAttrs = (attrs: InstanceAttributes) =>
  `${attrs.c}|${attrs.i}|${attrs.m}`;

//#endregion
