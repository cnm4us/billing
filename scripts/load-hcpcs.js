// scripts/load-hcpcs.js
// Usage:
//   node scripts/load-hcpcs.js /path/to/ALPHA-NUMERIC-HCPCS.txt --version=2025-10
// Notes:
// - Detects delimiter (tab, pipe, comma) from header line.
// - Inserts into hcpcs_raw(version, ...), then promotes into:
//     codes (type=HCPCS, status/eff dates),
//     code_descriptions (source=CMS_HCPCS),
//     code_actions (optional),
//     hcpcs_meta (optional extras).
import fs from 'fs';
import readline from 'readline';
import { pool } from '../src/config/db.js'; // matches your test-db.js pattern:contentReference[oaicite:10]{index=10}

// --- helpers ---
function detectDelimiter(headerLine) {
  if (headerLine.includes('\t')) return '\t';
  if (headerLine.includes('|')) return '|';
  return ','; // fallback
}
function norm(s) { return (s ?? '').trim(); }
function parseDate(s) {
  const t = norm(s);
  if (!t) return null;
  // expected yyyymmdd; accept yyyy-mm-dd too
  if (/^\d{8}$/.test(t)) return `${t.slice(0,4)}-${t.slice(4,6)}-${t.slice(6,8)}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  return null;
}
function toNumber(s) {
  const t = norm(s).replace(/[$,]/g, '');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function mapHeaderToCols(rawHeader) {
  // normalize header tokens → our column names in hcpcs_raw
  const map = {
    'HCPC':'hcpc','HCPCS':'hcpc','CODE':'hcpc',
    'SEQNUM':'seqnum','RECID':'recid',
    'LONG DESCRIPTION':'long_desc','SHORT DESCRIPTION':'short_desc',
    'PRICE1':'price1','PRICE2':'price2','PRICE3':'price3','PRICE4':'price4',
    'MULT_PI':'mult_pi',
    'CIM1':'cim1','CIM2':'cim2','CIM3':'cim3',
    'MCM1':'mcm1','MCM2':'mcm2','MCM3':'mcm3',
    'STATUTE':'statute',
    'LABCERT1':'labcert1','LABCERT2':'labcert2','LABCERT3':'labcert3','LABCERT4':'labcert4',
    'LABCERT5':'labcert5','LABCERT6':'labcert6','LABCERT7':'labcert7','LABCERT8':'labcert8',
    'XREF1':'xref1','XREF2':'xref2','XREF3':'xref3','XREF4':'xref4','XREF5':'xref5',
    'COV':'cov',
    'ASC_GRP':'asc_grp','ASC_DT':'asc_dt',
    'OPPS':'opps','OPPS_PI':'opps_pi','OPPS_DT':'opps_dt',
    'PROCNOTE':'procnote','BETOS':'betos',
    'TOS1':'tos1','TOS2':'tos2','TOS3':'tos3','TOS4':'tos4','TOS5':'tos5',
    'ANEST_BU':'anest_bu',
    'ADD DT':'add_dt','ADD_DT':'add_dt',
    'ACT EFF DT':'act_eff_dt','ACT_EFF_DT':'act_eff_dt',
    'TERM DT':'term_dt','TERM_DT':'term_dt',
    'ACTION CD':'action_cd','ACTION_CD':'action_cd'
  };
  const cols = rawHeader.split(/\t|\|/).length > 1
    ? rawHeader.split(/\t|\|/)
    : rawHeader.split(',');
  return cols.map(c => map[norm(c).toUpperCase()] || norm(c).toLowerCase());
}

async function ensureTables() {
  // run the DDL once if needed; harmless if already created
  const ddl = fs.readFileSync(new URL('./hcpcs.ddl.sql', import.meta.url).pathname, 'utf8');
  await pool.query(ddl);
}

function splitQuoted(s, delim) {
  const out = []; let cur = ''; let inQ = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') {
      if (inQ && s[i+1] === '"') { cur += '"'; i++; } else { inQ = !inQ; }
    } else if (ch === delim && !inQ) { out.push(cur); cur = ''; }
    else { cur += ch; }
  }
  out.push(cur);
  return out;
}

// --- main ---
async function run(file, version) {
  if (!file || !version) {
    console.error('Usage: node scripts/load-hcpcs.js <file> --version=YYYY-MM');
    process.exit(2);
  }
  await ensureTables();

  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
  let lineNo = 0, delimiter = '\t', headers = [], colnames = [];
  const rows = [];

  for await (const raw of rl) {
    const line = raw.replace(/\r$/, '');
    lineNo++;
    if (lineNo === 1) {
      delimiter = detectDelimiter(line);
      headers = line.split(delimiter);
      colnames = mapHeaderToCols(line);
      continue;
    }
    if (!line.trim()) continue;
    const parts = splitQuoted(line, delimiter);
    const rec = Object.fromEntries(colnames.map((k, i) => [k, parts[i] ?? '']));

    // normalize a single record for hcpcs_raw
    rows.push([
      version,
      norm(rec.hcpc),
      norm(rec.seqnum) || null,
      norm(rec.recid) || null,
      norm(rec['long_desc']) || null,
      norm(rec['short_desc']) || null,
      toNumber(rec.price1), toNumber(rec.price2), toNumber(rec.price3), toNumber(rec.price4),
      norm(rec.mult_pi) || null,
      norm(rec.cim1) || null, norm(rec.cim2) || null, norm(rec.cim3) || null,
      norm(rec.mcm1) || null, norm(rec.mcm2) || null, norm(rec.mcm3) || null,
      norm(rec.statute) || null,
      norm(rec.labcert1) || null, norm(rec.labcert2) || null, norm(rec.labcert3) || null, norm(rec.labcert4) || null,
      norm(rec.labcert5) || null, norm(rec.labcert6) || null, norm(rec.labcert7) || null, norm(rec.labcert8) || null,
      norm(rec.xref1) || null, norm(rec.xref2) || null, norm(rec.xref3) || null, norm(rec.xref4) || null, norm(rec.xref5) || null,
      norm(rec.cov) || null,
      norm(rec.asc_grp) || null,
      parseDate(rec.asc_dt),
      norm(rec.opps) || null, norm(rec.opps_pi) || null, parseDate(rec.opps_dt),
      norm(rec.procnote) || null,
      norm(rec.betos) || null,
      norm(rec.tos1) || null, norm(rec.tos2) || null, norm(rec.tos3) || null, norm(rec.tos4) || null, norm(rec.tos5) || null,
      toNumber(rec.anest_bu),
      parseDate(rec['add_dt']),
      parseDate(rec['act_eff_dt']),
      parseDate(rec['term_dt']),
      norm(rec['action_cd']) || null
    ]);

    if (rows.length >= 1000) {
      await insertRaw(rows);
      rows.length = 0;
    }
  }
  if (rows.length) await insertRaw(rows);

  await promote(version);
  console.log('✅ HCPCS load & promote complete for', version);
}

async function insertRaw(batch) {
  const sql = `
    INSERT INTO hcpcs_raw (
      version,hcpc,seqnum,recid,long_desc,short_desc,price1,price2,price3,price4,
      mult_pi,cim1,cim2,cim3,mcm1,mcm2,mcm3,statute,
      labcert1,labcert2,labcert3,labcert4,labcert5,labcert6,labcert7,labcert8,
      xref1,xref2,xref3,xref4,xref5,cov,asc_grp,asc_dt,opps,opps_pi,opps_dt,
      procnote,betos,tos1,tos2,tos3,tos4,tos5,anest_bu,add_dt,act_eff_dt,term_dt,action_cd
    ) VALUES ?
    ON DUPLICATE KEY UPDATE
      long_desc=VALUES(long_desc), short_desc=VALUES(short_desc),
      price1=VALUES(price1), price2=VALUES(price2), price3=VALUES(price3), price4=VALUES(price4),
      mult_pi=VALUES(mult_pi), cim1=VALUES(cim1), cim2=VALUES(cim2), cim3=VALUES(cim3),
      mcm1=VALUES(mcm1), mcm2=VALUES(mcm2), mcm3=VALUES(mcm3), statute=VALUES(statute),
      labcert1=VALUES(labcert1), labcert2=VALUES(labcert2), labcert3=VALUES(labcert3), labcert4=VALUES(labcert4),
      labcert5=VALUES(labcert5), labcert6=VALUES(labcert6), labcert7=VALUES(labcert7), labcert8=VALUES(labcert8),
      xref1=VALUES(xref1), xref2=VALUES(xref2), xref3=VALUES(xref3), xref4=VALUES(xref4), xref5=VALUES(xref5),
      cov=VALUES(cov), asc_grp=VALUES(asc_grp), asc_dt=VALUES(asc_dt),
      opps=VALUES(opps), opps_pi=VALUES(opps_pi), opps_dt=VALUES(opps_dt),
      procnote=VALUES(procnote), betos=VALUES(betos),
      tos1=VALUES(tos1), tos2=VALUES(tos2), tos3=VALUES(tos3), tos4=VALUES(tos4), tos5=VALUES(tos5),
      anest_bu=VALUES(anest_bu),
      add_dt=VALUES(add_dt), act_eff_dt=VALUES(act_eff_dt), term_dt=VALUES(term_dt), action_cd=VALUES(action_cd)
  `;
  await pool.query(sql, [batch]);
}

async function promote(version) {
  // 1) codes (canonical id + lifecycle)
  await pool.query(`
    INSERT INTO codes (code, code_type, status, eff_start, eff_end)
    SELECT r.hcpc, 'HCPCS',
          CASE WHEN r.term_dt IS NULL OR r.term_dt = '0000-00-00' THEN 'active' ELSE 'inactive' END,
          COALESCE(NULLIF(r.act_eff_dt,'0000-00-00'), NULLIF(r.add_dt,'0000-00-00')),
          NULLIF(r.term_dt,'0000-00-00')
    FROM hcpcs_raw r
    WHERE r.version = ?
    ON DUPLICATE KEY UPDATE
      status=VALUES(status),
      eff_start=COALESCE(codes.eff_start, VALUES(eff_start)),
      eff_end=VALUES(eff_end)
  `, [version]);

  // 2) descriptions (snapshot this release)
  await pool.query(`
    INSERT INTO code_descriptions
      (code, source, version, short_desc, long_desc, eff_start, eff_end)
    SELECT r.hcpc, 'CMS_HCPCS', ?, COALESCE(r.short_desc,''), COALESCE(r.long_desc,''),
          NULLIF(r.act_eff_dt,'0000-00-00'), NULLIF(r.term_dt,'0000-00-00')
    FROM hcpcs_raw r
    WHERE r.version = ?
    ON DUPLICATE KEY UPDATE
      short_desc=VALUES(short_desc),
      long_desc=VALUES(long_desc),
      eff_start=VALUES(eff_start),
      eff_end=VALUES(eff_end)
  `, [version, version]);

  // 3) code_actions (keep raw action code + dates)
  await pool.query(`
    INSERT IGNORE INTO code_actions (code, source, version, action, details, eff_start, eff_end)
    SELECT r.hcpc, 'CMS_HCPCS', ?, COALESCE(r.action_cd,''),
          NULL, NULLIF(r.act_eff_dt,'0000-00-00'), NULLIF(r.term_dt,'0000-00-00')
    FROM hcpcs_raw r
    WHERE r.version = ?
  `, [version, version]);

  // 4) hcpcs_meta (useful extras for analytics/warnings)
  await pool.query(`
    INSERT INTO hcpcs_meta (code, version, betos, tos1, tos2, tos3, tos4, tos5, opps, opps_pi, opps_dt, asc_grp, asc_dt, anest_bu, cov)
    SELECT r.hcpc, r.version, r.betos, r.tos1, r.tos2, r.tos3, r.tos4, r.tos5,
           r.opps, r.opps_pi, r.opps_dt, r.asc_grp, r.asc_dt, r.anest_bu, r.cov
    FROM hcpcs_raw r
    WHERE r.version = ?
    ON DUPLICATE KEY UPDATE
      betos=VALUES(betos), tos1=VALUES(tos1), tos2=VALUES(tos2), tos3=VALUES(tos3), tos4=VALUES(tos4), tos5=VALUES(tos5),
      opps=VALUES(opps), opps_pi=VALUES(opps_pi), opps_dt=VALUES(opps_dt),
      asc_grp=VALUES(asc_grp), asc_dt=VALUES(asc_dt),
      anest_bu=VALUES(anest_bu), cov=VALUES(cov)
  `, [version]);
}

// argv
const file = process.argv[2];
const versionArg = process.argv.find(a => a.startsWith('--version='));
const version = versionArg ? versionArg.split('=')[1] : null;

run(file, version).catch(err => {
  console.error(err);
  process.exit(1);
});
