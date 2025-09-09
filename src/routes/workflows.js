// src/routes/workflows.js
import express from 'express';
import { pool } from '../config/db.js';
import { z } from 'zod';

export const router = express.Router();

// GET /api/workflows
router.get('/', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, slug, name, description FROM workflows WHERE active=1 ORDER BY name'
  );
  res.json(rows);
});

// GET /api/payers
router.get('/payers', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, name, kind, multiplier FROM payers ORDER BY id'
  );
  res.json(rows);
});

// GET /api/workflows/localities?cy=2025
// Returns distinct MAC/locality pairs for the given year to populate the UI selector.
router.get('/localities', async (req, res) => {
  const cy = Number(req.query.cy || 2025);
  const [rows] = await pool.query(
    `SELECT DISTINCT mac_code AS mac, locality_number AS locality
       FROM medicare_fee_raw
      WHERE cy = ?
   ORDER BY mac, locality`,
    [cy]
  );
  // Shape for UI
  res.json(rows.map(r => ({
    id: `${r.mac}|${r.locality}`,
    label: `MAC ${r.mac} / Loc ${r.locality}`,
    mac: r.mac, locality: r.locality
  })));
});

// GET /api/workflows/:slug/details?cy=2025&payerId=1&place=nonfacility
router.get('/:slug/details', async (req, res) => {
  const schema = z.object({
    slug: z.string().min(1),
    cy: z.coerce.number().int().default(2025),
    payerId: z.coerce.number().int().default(1),
    place: z.enum(['facility','nonfacility']).default('nonfacility'),
    mode: z.enum(['inperson','telehome','tele02']).default('inperson'),
    audioOnly: z.coerce.boolean().optional(),
    debug: z.coerce.boolean().optional(),
    mac: z.string().trim().optional(),
    locality: z.string().trim().optional()
 
  });

  const parsed = schema.safeParse({
    slug: req.params.slug,
    cy: req.query.cy,
    payerId: req.query.payerId,
    place: req.query.place || 'nonfacility',
    mode: req.query.mode || 'inperson',
    audioOnly: req.query.audioOnly,
    debug: req.query.debug,
    mac: req.query.mac,
    locality: req.query.locality
  });
  if (!parsed.success) return res.status(400).json(parsed.error);

    const { slug, cy, payerId, place, mode, audioOnly, mac, locality, debug } = parsed.data;
 
  // Telehealth -> derive effective place & POS
  let effectivePlace = place;
  let pos = null, teleModifier = null;
  if (mode === 'telehome') {        // POS 10, paid at non-facility rate
    effectivePlace = 'nonfacility'; pos = '10'; teleModifier = audioOnly ? '93' : '95';
  } else if (mode === 'tele02') {   // POS 02, paid at facility rate
    effectivePlace = 'facility';    pos = '02'; teleModifier = audioOnly ? '93' : '95';
  }

  const [[wf]] = await pool.query(
    'SELECT id, slug, name, description FROM workflows WHERE slug=? AND active=1',
    [slug]
  );
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });

  const [[payer]] = await pool.query(
    'SELECT id, name, kind, multiplier FROM payers WHERE id=?',
    [payerId]
  );
  if (!payer) return res.status(400).json({ error: 'Invalid payerId' });

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

    // If a locality is provided, prefer those fees
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

    // NEW: pick a preferred description per code
  // Preference order: AMA_CPT (for CPT), CMS_HCPCS (for HCPCS), then INTERNAL (your stop-gap)
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

  // NEW (optional): HCPCS meta badges (BETOS/TOS/OPPS)
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

  const items = codes.map(c => {
        // Prefer locality amount if present, else national baseline
    const loc = lfMap.get(c.code);
    const base = feeMap.get(c.code);
    const med = loc ? loc.amount : (base ? base.amount : 0);
    const placeholder = loc ? loc.placeholder : (base ? base.placeholder : true);
    const override = ovMap.get(c.code);
    const amount = override != null ? override : (med > 0 ? med * Number(payer.multiplier) : 0);
    const codeNotes = notes.filter(n => n.code === c.code).map(n => n.note_text);
    
    const d = descMap.get(c.code);
    const m = metaMap.get(c.code);
    const tos = [m?.tos1, m?.tos2, m?.tos3, m?.tos4, m?.tos5].filter(Boolean);

    // NEW: estimate patient cost-sharing
    // For Original Medicare (Part B), assume 20% coinsurance (est.) after deductible.
    // For MA/commercial, leave null (plan-specific) unless you add plan rules later.
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
      notes: codeNotes,
      pos,
      teleModifier,
      
      // NEW: enrichments
      descShort: d?.short || null,
      descLong: d?.long || null,
      descSource: d?.source || null,
      betos: m?.betos || null,
      tos,
      oppsStatus: m?.opps_pi || null,
      // NEW: patient portion (est.)
      patientPortion,
      patientPortionLabel

    };

    // Optional debugging payload on each item
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
          amountSource: item.amountSource,
          computedAmount: item.amount,
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
  // NEW: total patient portion (only sums defined values)
  const patientTotal = items.reduce((acc, it) => acc + (it.patientPortion ?? 0), 0);
 

  const response = {
    workflow: wf, payer, cy, place, mode, pos, teleModifier,
    mac: mac || null, locality: locality || null,
    items,
    total: Number(total.toFixed(2)),
    patientTotal: Number(patientTotal.toFixed(2))
  };

  if (debug) {
    // Server-side console logging for spot-checks
    console.log('=== Calculation Debug ===');
    console.log('Context:', {
      workflow: wf.slug,
      payer: payer.name,
      cy, place, mode, pos, teleModifier,
      mac: mac || null, locality: locality || null
    });
    for (const it of items) {
      console.log(`Code ${it.code}:`, {
        baseAllowed: feeMap.get(it.code)?.amount ?? null,
        localityAllowed: lfMap.get(it.code)?.amount ?? null,
        chosenBaseline: it.medicareBaseline,
        payerMultiplier: Number(payer.multiplier),
        payerOverride: ovMap.get(it.code) ?? null,
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

    // Attach a summarized debug block to the response for UI rendering
    response.debug = {
      context: {
        workflow: wf,
        payer,
        cy, place, mode, pos, teleModifier,
        mac: mac || null, locality: locality || null
      },
      items: items.map(it => ({ code: it.code, ...(it.debug?.values || {}) })),
      totals: { total: response.total, patientTotal: response.patientTotal }
    };
  }

  res.json(response);
  
});

// (optional) also export default so either import style works
export default router;
