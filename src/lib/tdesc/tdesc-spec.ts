import { XmlNode } from "@s4tk/xml-dom";
import { TuningResourceType } from "@s4tk/models/enums";
import { Diagnosable, DiagnosticLevel } from "../types/diagnostics";
import Diagnose from "../utils/diagnose";

interface TdescSpecArgs {
  name?: string;
  required?: boolean;
  deprecated?: boolean;
}

abstract class TdescSpec {
  public readonly tag: "I" | "M" | "L" | "U" | "V" | "T" | "E" | "C";
  public readonly name?: string;
  public readonly required: boolean;
  public readonly deprecated: boolean;

  constructor(args: TdescSpecArgs) {
    this.name = args.name;
    this.required = args.required ?? false;
    this.deprecated = args.deprecated ?? false;
  }

  static tryParse(json: object): TdescSpec | undefined {
    let tag: string;
    for (const key in json) if (key !== ":@") tag = key;
    if (!tag) throw new Error("No tag found for node.");
    const attrs = json[":@"];
    const children = json[tag];
    switch (tag) {
      case "Tunable":
        return TdescValueSpec.parse(children, attrs);
      case "TunableEnum":
        return TdescEnumSpec.parse(children, attrs);
      case "TunableList":
        return TdescListSpec.parse(children, attrs);
      case "TunableTuple":
        return TdescTupleSpec.parse(children, attrs);
      case "TunableVariant":
        return TdescVariantSpec.parse(children, attrs);
      case "TdescFragTag":
        // TODO: handle frags later
        return;
      case "Deleted":
        return TdescDeletedSpec.parse(children, attrs);
      default:
        // intentionally ignoring classes, enum items, etc.
        return;
    }
  }

  validate(xml: XmlNode | undefined, entry: Diagnosable) {
    if (xml) {
      if (!xml.tag) {
        Diagnose.warning(
          entry,
          "TDS_001",
          "Found an unexpected value node.",
          _lineNumber(xml)
        );

        return;
      }

      if (this.deprecated) {
        Diagnose.warning(
          entry,
          "TDS_002",
          `Property "${this.name}" is deprecated.`,
          _lineNumber(xml)
        );
      } else {
        if (this.tag && xml.tag !== this.tag) {
          const nodeName = this.name ? `"${this.name}"` : "node";
          Diagnose.error(
            entry,
            "TDS_003",
            `Expected ${nodeName} to be <${this.tag}>, but found <${xml.tag}>.`,
            _lineNumber(xml)
          );
        }
        this._validateSelf(xml, entry);
      }
    } else if (this.required) {
      // TODO: only push if there is no default value and None isn't allowed
      Diagnose.warning(
        entry,
        "TDS_004",
        `Missing required property "${this.name}".`,
        _lineNumber(xml)
      );
    }
  }

  protected abstract _validateSelf(xml: XmlNode | undefined, entry: Diagnosable): void;
}

interface TdescListSpecArgs extends TdescSpecArgs {
  childSpec: TdescSpec;
}

export class TdescListSpec extends TdescSpec {
  public readonly tag = "L";
  private readonly _childSpec: TdescSpec;

  constructor(args: TdescListSpecArgs) {
    super(args);
    this._childSpec = args.childSpec;
  }

  static parse(children: object[], attrs: object): TdescListSpec {
    return new TdescListSpec({
      name: attrs["name"],
      required: attrs["tuning_state"] === "NeedsTuning",
      deprecated: attrs["Deprecated"] === "True",
      childSpec: TdescSpec.tryParse(children[0]),
    });
  }

  protected _validateSelf(xml: XmlNode | undefined, entry: Diagnosable) {
    xml.children.forEach((child) => {
      this._childSpec.validate(child, entry);
    });
  }
}

interface TdescTupleSpecArgs extends TdescSpecArgs {
  childrenSpecs: { [key: string]: TdescSpec; };
}

abstract class _TdescTupleSpecBase extends TdescSpec {
  private readonly _childrenSpecs: { [key: string]: TdescSpec; };
  private readonly _requiredChildren = new Set<string>();
  protected readonly _readableType: string;

  constructor(args: TdescTupleSpecArgs) {
    super(args);
    this._childrenSpecs = args.childrenSpecs;
    for (const propName in this._childrenSpecs) {
      const spec = this._childrenSpecs[propName];
      if (spec.required) this._requiredChildren.add(spec.name);
    }
  }

  protected _validateSelf(xml: XmlNode | undefined, entry: Diagnosable) {
    const validatedChildren = new Set<string>();
    xml?.children.forEach(child => {
      if (validatedChildren.has(child.name)) {
        Diagnose.warning(
          entry,
          "TDS_005",
          `Multiple instances of property "${child.name}" found in same ${this._readableType}.`,
          _lineNumber(xml)
        );
      } else {
        validatedChildren.add(child.name);
      }

      const childSpec = this._childrenSpecs[child.name];
      if (childSpec) {
        childSpec.validate(child, entry);
      } else {
        Diagnose.warning(
          entry,
          "TDS_006",
          `Property "${child.name}" is not defined for this ${this._readableType}.`,
          _lineNumber(xml)
        );
      }
    });

    this._requiredChildren.forEach(propName => {
      if (validatedChildren.has(propName)) return;
      const childSpec = this._childrenSpecs[propName];
      childSpec.validate(undefined, entry);
    });
  }
}

export class TdescTupleSpec extends _TdescTupleSpecBase {
  public readonly tag = "U";
  protected readonly _readableType = "tuple";

  constructor(args: TdescTupleSpecArgs) {
    super(args);
  }

  static parse(children: object[], attrs: object): TdescTupleSpec {
    return new TdescTupleSpec({
      name: attrs["name"],
      required: attrs["tuning_state"] === "NeedsTuning",
      deprecated: attrs["Deprecated"] === "True",
      childrenSpecs: _parseNamedChildren(children),
    });
  }
}

export class TdescInstanceSpec extends _TdescTupleSpecBase {
  public readonly tag = "I";
  protected readonly _readableType = "instance";

  constructor(args: TdescTupleSpecArgs) {
    super(args);
  }

  static parse(children: object[], attrs: object): TdescInstanceSpec {
    return new TdescInstanceSpec({
      childrenSpecs: _parseNamedChildren(children),
    });
  }

  protected _validateSelf(xml: XmlNode | undefined, entry: Diagnosable) {
    super._validateSelf(xml, entry);
  }
}

export class TdescModuleSpec extends _TdescTupleSpecBase {
  public readonly tag = "M";
  protected readonly _readableType = "module";

  constructor(args: TdescTupleSpecArgs) {
    super(args);
  }

  static parse(children: object[], attrs: object): TdescInstanceSpec {
    return new TdescInstanceSpec({
      childrenSpecs: _parseNamedChildren(children),
    });
  }

  protected _validateSelf(xml: XmlNode | undefined, entry: Diagnosable) {
    super._validateSelf(xml, entry);
  }
}

export class TdescFragmentSpec extends _TdescTupleSpecBase {

}

interface TdescVariantSpecArgs extends TdescSpecArgs {
  variantSpecs: { [key: string]: TdescSpec; };
}

export class TdescVariantSpec extends TdescSpec {
  public readonly tag = "V";
  private readonly _variantSpecs: { [key: string]: TdescSpec; };

  constructor(args: TdescVariantSpecArgs) {
    super(args);
    this._variantSpecs = args.variantSpecs;
  }

  static parse(children: object[], attrs: object): TdescVariantSpec {
    return new TdescVariantSpec({
      name: attrs["name"],
      required: attrs["tuning_state"] === "NeedsTuning",
      deprecated: attrs["Deprecated"] === "True",
      variantSpecs: _parseNamedChildren(children),
    });
  }

  protected _validateSelf(xml: XmlNode | undefined, entry: Diagnosable) {
    if (!xml.type) return;
    const variantSpec = this._variantSpecs[xml.type];
    if (!variantSpec) {
      Diagnose.error(
        entry,
        "TDS_007",
        `Type "${xml.type}" is not defined for this variant.`,
        _lineNumber(xml)
      );

      return;
    }

    if (xml.child) {
      if (xml.child.name !== xml.type) {
        Diagnose.warning(
          entry,
          "TDS_008",
          `Variant name of "${xml.child.name}" does not match parent's type of "${xml.type}".`,
          _lineNumber(xml)
        );
      } else {
        variantSpec.validate(xml.child, entry);
      }
    }
  }
}

interface TdescValueSpecArgs extends TdescSpecArgs {
  type?: string;
  class?: string;
  allowNone?: boolean;
}

export class TdescValueSpec extends TdescSpec {
  private static readonly _LOCKEY_REGEX = /^0x[0-9a-f]{1,8}$/i;
  private static readonly _RESKEY_REGEX = /^[0-9a-f]{8}:[0-9a-f]{8}:[0-9a-f]{16}$/i;

  public readonly tag = "T";
  private readonly type?: string;
  private readonly class?: string;
  private readonly allowNone: boolean;

  constructor(args: TdescValueSpecArgs) {
    super(args);
    this.type = args.type;
    this.class = args.class;
    this.allowNone = args.allowNone ?? true;
  }

  static parse(children: object[], attrs: object): TdescValueSpec {
    return new TdescValueSpec({
      name: attrs["name"],
      required: attrs["tuning_state"] === "NeedsTuning",
      deprecated: attrs["Deprecated"] === "True",
      type: attrs["type"],
      class: attrs["class"],
      allowNone: attrs["allow_none"] !== "False", // undefined -> true
    });
  }

  protected _validateSelf(xml: XmlNode | undefined, entry: Diagnosable) {
    if (!this.allowNone) {
      if (!xml.innerValue || xml.innerValue === "None") {
        // FIXME: check default value if empty
        Diagnose.warning(
          entry,
          "TDS_009",
          `Value omitted or set to None when not allowed.`,
          _lineNumber(xml)
        );
      }
    } else if (!xml.innerValue) {
      return;
    }

    function checkWhitespace() {
      if ((xml.innerValue as string)?.trim() !== xml.innerValue) {
        Diagnose.warning(
          entry,
          "TDS_010",
          `Found invalid whitespace in value.`,
          _lineNumber(xml)
        );
      }
    }

    switch (this.type) {
      case "float": {
        checkWhitespace();
        if (isNaN(parseFloat(xml.innerValue as string))) {
          Diagnose.error(
            entry,
            "TDS_010",
            `Expected float type to be a number, but found "${xml.innerValue}".`,
            _lineNumber(xml)
          );
        }
        return;
      }
      case "int": {
        checkWhitespace();
        if (this.class === "TunableLocalizedString") {
          if (!TdescValueSpec._LOCKEY_REGEX.test(xml.innerValue as string)) {
            Diagnose.error(
              entry,
              "TDS_010",
              `Expected string reference to be a 32-bit hex number, but found "${xml.innerValue}".`,
              _lineNumber(xml)
            );
          }
        } else if (isNaN(parseInt(xml.innerValue as string)) || (xml.innerValue as string).includes(".")) {
          Diagnose.error(
            entry,
            "TDS_010",
            `Expected int type to be a whole number, but found "${xml.innerValue}".`,
            _lineNumber(xml)
          );
        }
        return;
      }
      case "bool": {
        checkWhitespace();
        if (!(xml.innerValue === "True" || xml.innerValue === "False")) {
          Diagnose.error(
            entry,
            "TDS_010",
            `Expected bool type to be "True" or "False", but found "${xml.innerValue}".`,
            _lineNumber(xml)
          );
        }
        return;
      }
      case "str": {
        // intentionally blank
        return;
      }
      case "ResourceKey": {
        checkWhitespace();
        if (!TdescValueSpec._RESKEY_REGEX.test(xml.innerValue as string)) {
          Diagnose.error(
            entry,
            "TDS_010",
            `Expected ResourceKey type to be a full hex resource key, but found "${xml.innerValue}".`,
            _lineNumber(xml)
          );
        }
        return;
      }
    }

    const refType = TuningResourceType.parseAttr(this.type);
    if (refType !== TuningResourceType.Tuning) {
      checkWhitespace();
      try {
        const ref = BigInt(xml.innerValue);
        if (ref < 0n || ref > 18446744073709551615n) {
          Diagnose.error(
            entry,
            "TDS_010",
            `Expected tuning reference to be a 64-bit integer, but found "${xml.innerValue}".`,
            _lineNumber(xml)
          );
        }
      } catch (_) {
        Diagnose.error(
          entry,
          "TDS_010",
          `Expected tuning reference to be a 64-bit integer, but found "${xml.innerValue}".`,
          _lineNumber(xml)
        );
      }
    }
  }
}

interface TdescEnumSpecArgs extends TdescSpecArgs {
  // TODO:
}

export class TdescEnumSpec extends TdescSpec {
  public readonly tag = "E";

  constructor(args: TdescEnumSpecArgs) {
    super(args);
  }

  static parse(children: object[], attrs: object): TdescEnumSpec {
    return new TdescEnumSpec({ name: attrs["name"] });
  }

  protected _validateSelf(xml: XmlNode | undefined, entry: Diagnosable) {
    // TODO:
  }
}

interface TdescDeletedSpecArgs extends TdescSpecArgs {
  name: string;
}

export class TdescDeletedSpec extends TdescSpec {
  constructor(args: TdescDeletedSpecArgs) {
    super(args);
  }

  static parse(children: object[], attrs: object): TdescDeletedSpec {
    return new TdescDeletedSpec({ name: attrs["name"] });
  }

  protected _validateSelf(xml: XmlNode | undefined, entry: Diagnosable) {
    Diagnose.warning(
      entry,
      "TDS_011",
      `Property "${this.name}" is no longer tunable.`,
      _lineNumber(xml)
    );
  }
}

function _parseNamedChildren(children: object[]): { [key: string]: TdescSpec } {
  const nameMap: { [key: string]: TdescSpec } = {};
  children.forEach(child => {
    const childName = child[":@"]?.["name"];
    const childSpec = TdescSpec.tryParse(child);
    if (childName && childSpec) nameMap[childName] = childSpec;
  });
  return nameMap;
}

function _lineNumber(xml: XmlNode | undefined): { line?: string; } {
  return { line: xml?.attributes["l"] };
}
