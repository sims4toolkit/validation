import { TdescInstanceSpec, TdescFragmentSpec } from "./tdesc-spec";

/**
 * Grouping of `c`, `i`, and `m` attributes found in tuning instances.
 */
interface InstanceAttributes {
  c: string;
  i: string;
  m: string;
}

/**
 * Raw data for a TDESC document, in either XML or JSON format.
 */
interface RawTdescData {
  /** Whether `data` is in XML or JSON format. */
  format: "xml" | "json";

  /** Raw XML or JSON data as a plain text, UTF8 string. */
  data: string;
}

/**
 * Fetches and returns TDESC data from an arbitrary location.
 */
interface TdescResolver {
  /**
   * Fetches TDESC data to use for instance tuning with the given attributes.
   * 
   * @param attrs Attributes that appear on the root `I` node
   */
  fetchInstance(attrs: InstanceAttributes): Promise<RawTdescData>;

  /**
   * Fetches TDESC data to use for module tuning with the given name.
   * 
   * @param name Name of tuning module (`n` attribute of root `M` node)
   */
  fetchModule(name: string): Promise<RawTdescData>;

  /**
   * Fetches data to use for TDESC fragment with the given name.
   * 
   * @param name Name of TDESC fragment
   */
  fetchFragment(name: string): Promise<RawTdescData>;
}

/**
 * TODO:
 */
export default class TdescValidationContext {
  private readonly _instances = new Map<string, TdescInstanceSpec>();
  private readonly _fragments = new Map<string, TdescFragmentSpec>();

  constructor(private readonly _resolver: TdescResolver) { }
}
