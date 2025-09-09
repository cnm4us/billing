// src/services/workflowsService.js
import { pool } from '../config/db.js';

// Lightweight list APIs used by the UI
export async function listActiveWorkflows() {
  const [rows] = await pool.query(
    'SELECT id, slug, name, description FROM workflows WHERE active=1 ORDER BY name'
  );
  return rows;
}

export async function listPayers() {
  const [rows] = await pool.query(
    'SELECT id, name, kind, multiplier FROM payers ORDER BY id'
  );
  return rows;
}

export async function listLocalities(cy) {
  const [rows] = await pool.query(
    `SELECT DISTINCT mac_code AS mac, locality_number AS locality
       FROM medicare_fee_raw
      WHERE cy = ?
   ORDER BY mac, locality`,
    [cy]
  );
  return rows.map(r => ({
    id: `${r.mac}|${r.locality}`,
    label: `MAC ${r.mac} / Loc ${r.locality}`,
    mac: r.mac,
    locality: r.locality
  }));
}

// Centralized computation for workflow details
export async function getWorkflowDetails({ slug, cy, payerId, place, mode, render, audioOnly, mac, locality, debug }) {
  // Derive telehealth effective place/POS
  let effectivePlace = place;
  let pos = null;
  let teleModifier = null;
  if (mode === 'telehome') {        // POS 10, paid at non-facility rate
    effectivePlace = 'nonfacility'; pos = '10'; teleModifier = audioOnly ? '93' : '95';
  } else if (mode === 'tele02') {   // POS 02, paid at facility rate
    effectivePlace = 'facility';    pos = '02'; teleModifier = audioOnly ? '93' : '95';
  }

  const [[wf]] = await pool.query(
    'SELECT id, slug, name, description FROM workflows WHERE slug=? AND active=1',
    [slug]
  );
  if (!wf) return { error: 'Workflow not found', status: 404 };

  const [[payer]] = await pool.query(
    'SELECT id, name, kind, multiplier FROM payers WHERE id=?',
    [payerId]
  );
  if (!payer) return { error: 'Invalid payerId', status: 400 };

  const [codes] = await pool.query(
    `SELECT wc.code, wc.is_base, wc.display_order, c.code_type
       FROM workflow_codes wc
       JOIN codes c ON c.code = wc.code
      WHERE wc.workflow_id=?
   ORDER BY wc.is_base DESC, wc.display_order ASC, wc.code ASC`,
    [wf.id]
  );

  const codeList = codes.map(c => c.code);
  const [notes] = await pool.query(
    `SELECT code, note_text, priority FROM doc_notes
      WHERE cy=? AND code IN (?) ORDER BY code, priority, id`,
    [cy, codeList]
  );
  const [fees] = await pool.query(
    `SELECT code, allowed_amount, is_placeholder
       FROM medicare_fee WHERE cy=? AND place=? AND code IN (?)`,
    [cy, effectivePlace, codeList]
  );

  // Prefer locality fees if provided
  let lfMap = new Map();
  if (mac && locality) {
    const [locFees] = await pool.query(
      `SELECT code, allowed_amount
         FROM medicare_fee_locality
        WHERE cy=? AND place=? AND mac_code=? AND locality_number=? AND code IN (?)`,
      [cy, effectivePlace, mac, locality, codeList]
    );
    lfMap = new Map(locFees.map(f => [f.code, { amount: Number(f.allowed_amount), placeholder: false }]));
  }

  const [overrides] = await pool.query(
    `SELECT code, amount FROM payer_overrides
      WHERE payer_id=? AND cy=? AND place=? AND code IN (?)`,
    [payerId, cy, place, codeList]
  );

  // Preferred descriptions
  const [descs] = await pool.query(
    `SELECT code, source, version, short_desc, long_desc
       FROM code_descriptions
      WHERE code IN (?)
   ORDER BY FIELD(source,'AMA_CPT','CMS_HCPCS','INTERNAL'), version DESC`,
    [codeList]
  );
  const descMap = new Map();
  for (const d of descs) {
    if (!descMap.has(d.code)) {
      descMap.set(d.code, { short: d.short_desc, long: d.long_desc, source: d.source });
    }
  }

  // HCPCS meta
  const [metaRows] = await pool.query(
    `SELECT code, version, betos, tos1, tos2, tos3, tos4, tos5, opps_pi
       FROM hcpcs_meta
      WHERE code IN (?)
   ORDER BY version DESC`,
    [codeList]
  );
  const metaMap = new Map();
  for (const m of metaRows) {
    if (!metaMap.has(m.code)) metaMap.set(m.code, m);
  }

  const feeMap = new Map(fees.map(f => [f.code, { amount: Number(f.allowed_amount), placeholder: !!f.is_placeholder }]));
  const ovMap  = new Map(overrides.map(o => [o.code, Number(o.amount)]));

  // Rendering clinician multiplier: MD/DO 100%, NP/PA 85%
  const providerMultiplier = (render === 'nppa') ? 0.85 : 1.0;

  const items = codes.map(c => {
    const loc = lfMap.get(c.code);
    const base = feeMap.get(c.code);
    const med = loc ? loc.amount : (base ? base.amount : 0);
    const placeholder = loc ? loc.placeholder : (base ? base.placeholder : true);
    const override = ovMap.get(c.code);
    // Payer math first (override OR Medicare * payer.multiplier), then apply provider multiplier
    const baseAfterPayer = override != null ? override : (med > 0 ? med * Number(payer.multiplier) : 0);
    const amount = baseAfterPayer > 0 ? baseAfterPayer * providerMultiplier : 0;
    const codeNotes = notes.filter(n => n.code === c.code).map(n => n.note_text);

    const d = descMap.get(c.code);
    const m = metaMap.get(c.code);
    const tos = [m?.tos1, m?.tos2, m?.tos3, m?.tos4, m?.tos5].filter(Boolean);

    let patientPortion = null;
    let patientPortionLabel = null;
    if (payer.kind === 'medicare_original') {
      patientPortion = Number((amount * 0.20).toFixed(2));
      patientPortionLabel = '20% coinsurance (est.)';
    }

    const item = {
      code: c.code,
      codeType: c.code_type,
      isBase: !!c.is_base,
      amount: Number(amount.toFixed(2)),
      amountSource: override != null ? 'payer_override' : 'medicare*multiplier',
      medicareBaseline: med,
      isPlaceholder: placeholder,
      providerMultiplier,
      render, // 'physician' | 'nppa'
      notes: codeNotes,
      pos,
      teleModifier,
      descShort: d?.short || null,
      descLong: d?.long || null,
      descSource: d?.source || null,
      betos: m?.betos || null,
      tos,
      oppsStatus: m?.opps_pi || null,
      patientPortion,
      patientPortionLabel
    };

    if (debug) {
      item.debug = {
        labels: {
          code: 'Procedure code',
          baseAllowed: 'Medicare allowed (national)',
          localityAllowed: 'Medicare allowed (locality)',
          chosenBaseline: 'Baseline used',
          payerMultiplier: 'Payer multiplier',
          payerOverride: 'Payer override',
          amountSource: 'Amount source',
          computedAmount: 'Computed amount',
          pos: 'Place of service (POS)',
          teleModifier: 'Telehealth modifier',
          isPlaceholder: 'Placeholder seed value',
          patientPortion: 'Estimated patient portion',
          patientPortionLabel: 'Patient portion basis'
        },
        values: {
          code: c.code,
          baseAllowed: base?.amount ?? null,
          localityAllowed: loc?.amount ?? null,
          chosenBaseline: med,
          payerMultiplier: Number(payer.multiplier),
          payerOverride: override ?? null,
          providerMultiplier,
          amountSource: item.amountSource,
          computedAmount: Number(amount.toFixed(2)),
          pos,
          teleModifier,
          isPlaceholder: !!placeholder,
          patientPortion: patientPortion,
          patientPortionLabel
        }
      };
    }

    return item;
  });

  const total = items.reduce((acc, it) => acc + it.amount, 0);
  const patientTotal = items.reduce((acc, it) => acc + (it.patientPortion ?? 0), 0);

  const response = {
    workflow: wf, payer, cy, place, mode, render, pos, teleModifier,
    mac: mac || null, locality: locality || null,
    items,
    total: Number(total.toFixed(2)),
    patientTotal: Number(patientTotal.toFixed(2))
  };

  if (debug) {
    console.log('=== Calculation Debug ===');
    console.log('Context:', {
      workflow: wf.slug,
      payer: payer.name,
      cy, place, mode, pos, teleModifier,
      mac: mac || null, locality: locality || null
    });
    for (const it of items) {
      console.log(`Code ${it.code}:`, {
        baseAllowed: (fees.find(f => f.code === it.code)?.allowed_amount) ?? null,
        localityAllowed: (lfMap.get(it.code)?.amount) ?? null,
        chosenBaseline: it.medicareBaseline,
        payerMultiplier: Number(payer.multiplier),
        payerOverride: (overrides.find(o => o.code === it.code)?.amount) ?? null,
        amountSource: it.amountSource,
        computedAmount: it.amount,
        pos,
        teleModifier,
        isPlaceholder: it.isPlaceholder,
        patientPortion: it.patientPortion ?? null,
        patientPortionLabel: it.patientPortionLabel ?? null
      });
    }
    console.log('Totals:', { total: response.total, patientTotal: response.patientTotal });

    response.debug = {
      context: { workflow: wf, payer, cy, place, mode, pos, teleModifier, mac: mac || null, locality: locality || null },
      items: items.map(it => ({ code: it.code, ...(it.debug?.values || {}) })),
      totals: { total: response.total, patientTotal: response.patientTotal }
    };
  }

  return response;
}
