/**
 * Grouping of `c`, `i`, and `m` attributes found in tuning instances.
 */
export interface InstanceAttributes {
  c: string;
  i: string;
  m: string;
}

/** How raw TDESC data can be formatted. */
export type RawTdescFormat = "xml" | "json";

/**
 * Raw data for a TDESC document, in either XML or JSON format.
 */
export interface RawTdescData {
  /** What format `data` is in. */
  format: RawTdescFormat;

  /** Raw TDESC data as a plain text. */
  data: string | Buffer;
}

/**
 * Fetches and returns TDESC data from an arbitrary location.
 */
export interface RawTdescResolver {
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
