const SDK = require("dat-sdk");
const path = require("path");
const fs = require("fs");
const alias = require("./index");

// Simple mapping of data
const fileMap = {
  "a.txt": path.resolve(__dirname, "./test/faux_data/a.txt"),
  "b.txt": path.resolve(__dirname, "./test/faux_data/b.txt"),
  "c.txt": path.resolve(__dirname, "./test/faux_data/c.txt")
};

// An example of an alias resolver function that can be used to find files.
// This one uses the file map above to find the real location of the files.
const resolver = filename => {
  if (filename.startsWith("/")) filename = filename.replace("/", "");
  const name = fileMap[filename];
  if (!name) throw new Error("No alias");
  return name;
};

const { Hyperdrive, destroy } = SDK();

const archive = new Hyperdrive(null, {
  persist: true,
  storage: dir => alias(path.join("./dats/", dir), resolver),
  latest: true
});
archive.ready(() => {
  console.log("Creating...");
  // import files referenced in the file map
  importFiles(archive, Object.keys(fileMap), err => {
    if (err) {
      console.log(err);
      destroy();
    }
    console.log("Successfully created!");
    console.log(
      "Try using dat-cli to clone this archive and notice the file structure."
    );
    console.log("\n\tRun: `dat clone " + archive.key.toString("hex") + "`\n");
    /*
    archive.readFile("a.txt", (err, data) => {
      console.log(err, data.toString());
      destroy();
    });
    */
  });
});

function goodbye() {
  destroy(() => {
    console.log("Goodbye!");
    process.exit();
  });
}

process.on("exit", goodbye);
process.on("SIGINT", () => {
  console.log("SIGINT received. Cleaning up and exiting.");
  goodbye();
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
