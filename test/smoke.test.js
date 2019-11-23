const SDK = require("dat-sdk");
const path = require("path");
const fs = require("fs");
const storage = require("../index");
const rimraf = require("rimraf");

// Simple mapping of data
const fileMap = {
  "a.txt": path.resolve(__dirname, "./faux_data/a.txt"),
  "b.txt": path.resolve(__dirname, "./faux_data/b.txt"),
  "c.txt": path.resolve(__dirname, "./faux_data/c.txt")
};

// An example of an alias resolver function that can be used to find files.
// This one uses the file map above to find the real location of the files.
const resolver = filename => {
  if (filename.startsWith("/")) filename = filename.replace("/", "");
  const name = fileMap[filename];
  if (!name) throw new Error("No alias");
  return name;
};

let destroy;
let Hyperdrive;

const tmpPath = path.resolve(__dirname, "./dats");

beforeAll(done => {
  const sdk = SDK();
  destroy = sdk.destroy;
  Hyperdrive = sdk.Hyperdrive;
  done();
});

afterAll(done => {
  destroy(() => {
    rimraf(tmpPath, done);
  });
  done();
});

describe("smoke test", () => {
  it("creates a dat archive with aliased files and syncs", done => {
    // create a new archive
    const archive = new Hyperdrive(null, {
      persist: true,
      storage: dir => storage(path.join(tmpPath, dir), resolver),
      latest: true
    });
    // when ready import files
    archive.ready(() => {
      runImport();
    });

    function runImport() {
      importFiles(archive, Object.keys(fileMap), err => {
        expect(err).toBeUndefined();
        archive.readFile("a.txt", (err, data) => {
          expect(err).toBeNull();
          expect(data.toString()).toEqual("file A");
          expect(
            fs.readdirSync(
              path.join(tmpPath, archive.key.toString("hex"), ".dat")
            )
          ).toMatchSnapshot();
          runDatSync();
        });
      });
    }
    function runDatSync() {
      const clone = new Hyperdrive(archive.key, {
        persist: false,
        latest: true
      });
      clone.ready(() => {
        archive.readdir("/", (err, files) => {
          expect(err).toBeNull();
          expect(files).toMatchSnapshot();
          done();
        });
      });
    }
  });
});

// Crude method to add specified files to an archive.
function importFiles(archive, files, cb) {
  loop(
    files,
    (file, next) => {
      const filePath = fileMap[file];
      archive.writeFile(file, fs.readFileSync(filePath), next);
    },
    cb
  );
}

function loop(arr, action, cb) {
  let count = 0;
  next();
  function next(err) {
    if (err) return cb(err);
    if (count >= arr.length) return cb();
    action(arr[count++], next);
  }
}
