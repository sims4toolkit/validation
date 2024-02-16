# Sims 4 Toolkit - Validation (@s4tk/validation)

## Overview

Utilities for validating packages and resources.

## Installation

Install the package as a dependency from npm with the following command:

```sh
npm i @s4tk/validation
```

## Disclaimer

Sims 4 Toolkit (S4TK) is a collection of creator-made modding tools for [The Sims 4](https://www.ea.com/games/the-sims). "The Sims" is a registered trademark of [Electronic Arts, Inc](https://www.ea.com/). (EA). Sims 4 Toolkit is not affiliated with or endorsed by EA.

All S4TK software is currently considered to be in its pre-release stage. Use at your own risk, knowing that breaking changes are likely to happen.

## Documentation

Documentation is not available, as the S4TK docs website is being redesigned.

For now, here is the most useful information:

## Import the validation functions

```ts
// use below for ESM / TS
import { validatePackageBuffer, validateResources } from "@s4tk/validation";

// useyse below for CJS
const { validatePackageBuffer, validateResources } = require("@s4tk/validation");
```

## Using the validation functions

```ts
// to validate a package file without first parsing it
const result = validatePackageBuffer(buffer); // buffer = Buffer for a .package file

// to validate the entries in an already-parsed package
const result = validateResources(pkg.entries); // pkg = Package from @s4tk/models

// to validate individual resources / entries
const result = validateResources(entries); // entries = ResourceKeyPair[] from @s4tk/models
```

## Using the validation result

The `result` in all the above lines is a `readonly ValidatedResource[]` object. You can read more about the `ValidatedResource` type and its associated interfaces in lib/types/resources.
