
import fs from "node:fs";
import path from "node:path";
import xlsx from "xlsx";

const inputFile = path.resolve(
  "src/data/tn-legislative-assembly/2026/10-Detailed_Results_1778165153.xlsx"
);

const outputDir = path.resolve(
  "src/data/tn-legislative-assembly/2026"
);

const outputFile = path.join(outputDir, "detailed-results.json");

if (!fs.existsSync(inputFile)) {
  console.error("Excel file not found:", inputFile);
  console.error("Check the folder and filename.");
  process.exit(1);
}

const workbook = xlsx.readFile(inputFile);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];

// The report's column headings are on Excel row 4.
const rows = xlsx.utils.sheet_to_json(worksheet, {
  range: 3,
  defval: null,
});

const results = rows
  .filter((row) => row["CANDIDATE NAME"])
  .map((row) => ({
    state: row["STATE/UT NAME"],
    constituencyNumber: row["AC NO."],
    constituencyName: row["AC NAME"],
    candidateName: String(row["CANDIDATE NAME"])
    .replace(/^\d+\s+/, "")
    .trim(),
    sex: row["SEX"],
    age: row["AGE"],
    category: row["CATEGORY"],
    party: row["PARTY"],
    symbol: row["SYMBOL"],
    generalVotes: row["GENERAL"],
    postalVotes: row["POSTAL"],
    totalVotes: row["TOTAL"],
    votePercentage: row["OVER VALID VOTES + NOTA"],
    totalElectors: row["TOTAL ELECTORS"],
  }));

fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));

const constituencyNames = new Set(
  results.map((row) => row.constituencyName)
);

console.log(`Unique constituencies: ${constituencyNames.size}`);

console.log("First 5 candidate names:");
console.log(results.slice(0, 5).map((row) => row.candidateName));

console.log(`Converted ${results.length} candidate records.`);
console.log(`JSON saved to: ${outputFile}`);
