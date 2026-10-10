const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const { spawnSync } = require("child_process");

const libDir = path.join(__dirname, "../src/lib");
const outDir = path.join(__dirname, "../.tests_dist");

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Recursively find all .ts files under src/lib
function findTsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(findTsFiles(fullPath));
    } else if (file.endsWith(".ts")) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = findTsFiles(libDir);

console.log("Transpiling test files with TypeScript...");
for (const filePath of files) {
  const code = fs.readFileSync(filePath, "utf-8");
  const result = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });

  const relPath = path.relative(libDir, filePath);
  const outPath = path.join(outDir, relPath.replace(/\.ts$/, ".js"));
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, result.outputText);
}

// Find all transpiled test files recursively
function findTestFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(findTestFiles(fullPath));
    } else if (file.endsWith(".test.js")) {
      results.push(fullPath);
    }
  }
  return results;
}

const testFiles = findTestFiles(outDir);

console.log(`Running ${testFiles.length} test suites with Node.js test runner...`);
const res = spawnSync(process.execPath, ["--test", ...testFiles], {
  stdio: "inherit",
  env: process.env,
});

process.exit(res.status || 0);
