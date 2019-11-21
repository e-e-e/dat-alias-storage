const raf = require("random-access-file");
const multi = require("multi-random-access");
const randomAccessAlias = require("random-access-alias");
const defaultStorage = require("dat-storage");

module.exports = function createAliasStorage(dir, resolver, opts) {
  if (typeof dir === "function") {
    throw new Error("Does not support dir as function");
  }
  if (!resolver || typeof resolver !== "function") {
    throw new Error("Requires resolver function");
  }
  const storage = defaultStorage(dir, opts);
  const aliasStorage = randomAccessAlias.create(resolver, raf);

  return {
    metadata: storage.metadata,
    content: function(name, contentOpts, archive) {
      if (!archive) archive = contentOpts;
      if (name === "data") return createStorage(archive, aliasStorage);
      return storage.content(name, contentOpts, archive);
    }
  };
};

/**
 * This is largely duplicated from dat-storage: https://github.com/datproject/dat-storage
 * The main difference is the injection of alias file storage for finding file content.
 */
function createStorage(archive, aliasStorage) {
  if (!archive.latest)
    throw new Error('Currently only "latest" mode is supported.');

  var head = null;
  var storage = multi({ limit: 128 }, locate);

  archive.on("appending", onappending);
  archive.on("append", onappend);

  return storage;

  function onappend(name, opts) {
    if (head) head.end = archive.content.byteLength;
  }

  function onappending(name, opts) {
    if (head) head.end = archive.content.byteLength;
    head = {
      start: archive.content.byteLength,
      end: Infinity,
      storage: aliasStorage(name)
    };

    storage.add(head);
  }

  function locate(offset, cb) {
    archive.ready(err => {
      if (err) return cb(err);

      find(archive.metadata, offset, (err, node, st, index) => {
        if (err) return cb(err);
        if (!node) return cb(new Error("Could not locate data"));
        cb(null, {
          start: st.byteOffset,
          end: st.byteOffset + st.size,
          storage: aliasStorage(node.name)
        });
      });
    });
  }
}

// This function is directly lifted from dat-storage.
function get(metadata, btm, seq, cb) {
  if (seq < btm) return cb(null, -1, null);

  var i = seq;
  while (!metadata.has(i) && i > btm) i--;
  if (!metadata.has(i)) return cb(null, -1, null);

  metadata.get(i, { valueEncoding: messages.Node }, function(err, node) {
    if (err) return cb(err);

    var st = node.value && stat.decode(node.value);

    if (
      !node.value ||
      (!st.offset && !st.blocks) ||
      (!st.byteOffset && !st.blocks)
    ) {
      return get(metadata, btm, i - 1, cb); // TODO: check the index instead for fast lookup
    }

    cb(null, i, node, st);
  });
}

// This function is directly lifted from dat-storage.
function find(metadata, bytes, cb) {
  var top = metadata.length - 1;
  var btm = 1;
  var mid = Math.floor((top + btm) / 2);

  get(metadata, btm, mid, function loop(err, actual, node, st) {
    if (err) return cb(err);

    var oldMid = mid;

    if (!node) {
      btm = mid;
      mid = Math.floor((top + btm) / 2);
    } else {
      var start = st.byteOffset;
      var end = st.byteOffset + st.size;

      if (start <= bytes && bytes < end) return cb(null, node, st, actual);
      if (top <= btm) return cb(null, null, null, -1);

      if (bytes < start) {
        top = mid;
        mid = Math.floor((top + btm) / 2);
      } else {
        btm = mid;
        mid = Math.floor((top + btm) / 2);
      }
    }

    if (mid === oldMid) {
      if (btm < top) mid++;
      else return cb(null, null, null, -1);
    }

    get(metadata, btm, mid, loop);
  });
}
