# dat-alias-storage

[![Build Status](https://travis-ci.org/e-e-e/dat-alias-storage.svg?branch=master)](https://travis-ci.org/e-e-e/dat-alias-storage)

This is a fork of [dat-storage](https://github.com/datproject/dat-storage) which adds [random-access-alias](https://github.com/e-e-e/random-access-alias) to allow dats to be made with `content.data` aliased to files outside of the specified dat directory.

This is useful if you have a large data set which you would like to provide as a collection of smaller dats, without duplicating data or having to change file structure. One such use case, is a large library of texts, with sets of texts defined as collections, **dat-alias-storage** can be used to share the collections as individual dats.

## Installation

```bash
npm install --save dat-alias-storage
```

## Usage

```js
const storage = require("dat-alias-storage");
const hyperdrive = require("hyperdrive");

async function resolver(name) {
  if (name === "a.txt") {
    return "/var/web/http/collection/some.txt";
  }
  return name;
}

// Files are stored at whatever paths are returned from the resolver
// Metadata (hashes and stuff) are stored in ./my-dataset/.dat
// Secret keys are stored in ~/.dat/secret_keys/<discovery-key>
const archive = hyperdrive(storage("my-dataset", resolver));
```

## API

#### `var store = storage(dir: string, resolver: (string) => string | Promise<string>, opts?: object)`

Takes Arguments:

- `dir`: location where to store the primary dat metadata
- `resolver`: a function which takes a string and returns a string or a promise resolving to a string. Used to map desired dat file structure to real file locations on disk.
- `opts`: optionally accepts the same options as [dat-storage](https://github.com/datproject/dat-storage).

Returns a storage provider for creating a [hyperdrive](https://github.com/mafintosh/hyperdrive).
