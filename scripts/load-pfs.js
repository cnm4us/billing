// scripts/load-pfs.js
// Usage:
//   node scripts/load-pfs.js PFREV25A.txt PFREV25B.txt --year 2025 --promote --baseline avg
//
// Flags:
//   --year <YYYY>      (required) which CY to load
//   --promote          after raw import, upsert into medicare_fee and medicare_fee_locality
//   --baseline <avg|max|min>  how to collapse locality amounts into baseline medicare_fee (default: avg)

import fs from "fs";
import readline from "readline";
import path from "path";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

// ---- DB pool (same style as your project) ----
const password = process.env.DB_PASS ?? process.env.DB_PASSWORD ?? "";
const required = ["DB_HOST","DB_NAME","DB_USER"];
const missing = required.filter(k => !process.env[k]);
if (!password) missing.push("DB_PASS or DB_PASSWORD");
if (missing.length) {
  console.error("❌ Missing env:", missing.join(", "));
  process.exit(2);
}

const pool = await mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

// ---- args ----
const args = process.argv.slice(2).filter(Boolean);
const yearIdx = args.indexOf("--year");
if (yearIdx === -1 || !args[yearIdx+1]) {
  console.error("Usage: node scripts/load-pfs.js <files...> --year 2025 [--promote] [--baseline avg|max|min]");
  process.exit(1);
}
const CY = Number(args[yearIdx+1]);
const promote = args.includes("--promote");
const baselineMode = (() => {
  const i = args.indexOf("--baseline");
  const v = i >= 0 ? String(args[i+1] || "avg").toLowerCase() : "avg";
  return ["avg","max","min"].includes(v) ? v : "avg";
})();
const files = args.filter(f => !f.startsWith("--") && !/^\d{4}$/.test(f));

if (files.length === 0) {
  console.error("Please specify one or more PFS files, e.g. PFREV25A.txt PFREV25B.txt");
  process.exit(1);
}

function parseAmount(s) {
  // input like "0000031.56" (quoted)
  const n = Number((s || "").replaceAll('"','').trim());
  return isFinite(n) ? Number(n.toFixed(2)) : 0;
}
function parseText(s) {
  return (s || "").replaceAll('"','').trim();
}
function parseModifier(s) {
  const m = parseText(s);
  return m === "" ? "" : m;
}

// simple CSV-ish splitter for quoted fields without commas inside fields
function splitFields(line) {
  // Handles lines like: "2025","01112","05","G0011","  ","0000031.56",...
  // If CMS ever switches to pipe, we detect and split by | instead.
  if (line.includes("|")) return line.split("|").map(x => x.trim());
  // basic quoted CSV (no embedded quotes)
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i=0; i<line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (c === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

async function importFile(filename) {
  const rl = readline.createInterface({
    input: fs.createReadStream(filename),
    crlfDelay: Infinity
  });

  const rawRows = [];
  const codesSet = new Set();
  let total = 0;

  for await (const line0 of rl) {
    const line = line0.trim();
    if (!line || line.startsWith("#")) continue;

    const f = splitFields(line);
    // Expected minimal fields (based on your sample):
    // 0: year, 1: MAC, 2: locality, 3: HCPCS, 4: modifier,
    // 5: nonfacility, 6: facility, 7..: indicators (ignored or optional)
    if (f.length < 7) continue;

    const year = Number(parseText(f[0]));
    if (year !== CY) continue; // skip other years in the file just in case

    const mac = parseText(f[1]).padStart(5, "0");
    const loc = parseText(f[2]);
    const hcpcs = parseText(f[3]);       // e.g., "G0011" or "99213"
    const modifier = parseModifier(f[4]); // '' or '95', 'TC', etc.
    const nf = parseAmount(f[5]);
    const fac = parseAmount(f[6]);

    // Optional extras (keep 2 more for future analysis)
    const status_ind  = parseText(f[9]  ?? "");
    const global_surg = parseText(f[10] ?? "");
    const opps_ind    = parseText(f[13] ?? "");

    rawRows.push([CY, mac, loc, hcpcs, modifier, nf, fac, status_ind, global_surg, opps_ind, null, null]);
    codesSet.add(hcpcs);

    total++;
    if (rawRows.length >= 1000) {
      await flushRaw(rawRows);
      rawRows.length = 0;
    }
  }
  if (rawRows.length) await flushRaw(rawRows);

  // Upsert codes first so FKs don’t fail later
  await upsertCodes([...codesSet]);

  return { rows: total, codes: codesSet.size };
}

async function flushRaw(batch) {
  const sql = `
    REPLACE INTO medicare_fee_raw
      (cy, mac_code, locality_number, hcpcs, modifier, nonfacility_amt, facility_amt, status_ind, global_surg, opps_ind, extra1, extra2)
    VALUES ?
  `;
  await pool.query(sql, [batch]);
}

async function upsertCodes(codes) {
  if (codes.length === 0) return;
  const values = codes.map(code => {
    const isHCPCS = /^[A-Z]/.test(code);
    return [code, isHCPCS ? "HCPCS" : "CPT", "active"];
  });
  const sql = `
    INSERT INTO codes (code, code_type, status)
    VALUES ?
    ON DUPLICATE KEY UPDATE status=VALUES(status)
  `;
  await pool.query(sql, [values]);
}

async function promoteBaseline(cy, mode) {
  // collapse localities into a single baseline per code/place for medicare_fee
  // mode: avg|max|min
  const agg = mode === "max" ? "MAX" : mode === "min" ? "MIN" : "AVG";

  // non-facility
  await pool.query(`
    REPLACE INTO medicare_fee (code, cy, place, allowed_amount, is_placeholder, notes)
    SELECT r.hcpcs AS code, r.cy, 'nonfacility' AS place, ROUND(${agg}(r.nonfacility_amt),2) AS amt, 0, 'PFS National Payment Amounts'
    FROM medicare_fee_raw r
    WHERE r.cy = ?
    GROUP BY r.hcpcs, r.cy
  `, [cy]);

  // facility
  await pool.query(`
    REPLACE INTO medicare_fee (code, cy, place, allowed_amount, is_placeholder, notes)
    SELECT r.hcpcs AS code, r.cy, 'facility' AS place, ROUND(${agg}(r.facility_amt),2) AS amt, 0, 'PFS National Payment Amounts'
    FROM medicare_fee_raw r
    WHERE r.cy = ?
    GROUP BY r.hcpcs, r.cy
  `, [cy]);
}

async function promoteLocality(cy) {
  // explode raw rows into locality-resolved table (two rows per raw: NF & FAC)
  await pool.query(`
    REPLACE INTO medicare_fee_locality
      (code, cy, mac_code, locality_number, place, allowed_amount, modifier, notes)
    SELECT r.hcpcs, r.cy, r.mac_code, r.locality_number, 'nonfacility', r.nonfacility_amt, r.modifier, 'PFS National Payment Amounts'
    FROM medicare_fee_raw r
    WHERE r.cy = ?
  `, [cy]);

  await pool.query(`
    REPLACE INTO medicare_fee_locality
      (code, cy, mac_code, locality_number, place, allowed_amount, modifier, notes)
    SELECT r.hcpcs, r.cy, r.mac_code, r.locality_number, 'facility', r.facility_amt, r.modifier, 'PFS National Payment Amounts'
    FROM medicare_fee_raw r
    WHERE r.cy = ?
  `, [cy]);
}

(async () => {
  console.log(`Loading CY ${CY} from ${files.length} file(s)…`);
  let totalRows = 0, totalCodes = 0;
  for (const f of files) {
    const { rows, codes } = await importFile(f);
    totalRows += rows; totalCodes += codes;
    console.log(`  • ${path.basename(f)}: ${rows} rows, ${codes} unique codes`);
  }
  console.log(`Imported to medicare_fee_raw: ${totalRows} rows total`);

  if (promote) {
    console.log(`Promoting to medicare_fee (baseline: ${baselineMode}) and medicare_fee_locality…`);
    await promoteBaseline(CY, baselineMode);
    await promoteLocality(CY);
  }

  console.log("✅ Done.");
  await pool.end();
})().catch(err => {
  console.error("❌ Import failed:", err);
  process.exit(1);
});
