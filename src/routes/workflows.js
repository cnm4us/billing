// src/routes/workflows.js
import express from 'express';
import { z } from 'zod';
import { getWorkflowDetails, listActiveWorkflows, listPayers, listLocalities } from '../services/workflowsService.js';

export const router = express.Router();

// GET /api/workflows
router.get('/', async (_req, res) => {
  const rows = await listActiveWorkflows();
  res.json(rows);
});

// GET /api/payers
router.get('/payers', async (_req, res) => {
  const rows = await listPayers();
  res.json(rows);
});

// GET /api/workflows/localities?cy=2025
// Returns distinct MAC/locality pairs for the given year to populate the UI selector.
router.get('/localities', async (req, res) => {
  const cy = Number(req.query.cy || 2025);
  const rows = await listLocalities(cy);
  res.json(rows);
});

// GET /api/workflows/:slug/details?cy=2025&payerId=1&place=nonfacility
router.get('/:slug/details', async (req, res) => {
  const schema = z.object({
    slug: z.string().min(1),
    cy: z.coerce.number().int().default(2025),
    payerId: z.coerce.number().int().default(1),
    place: z.enum(['facility','nonfacility']).default('nonfacility'),
    mode: z.enum(['inperson','telehome','tele02']).default('inperson'),
    render: z.enum(['physician','nppa']).default('physician'),
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
    render: req.query.render || 'physician',
    audioOnly: req.query.audioOnly,
    debug: req.query.debug,
    mac: req.query.mac,
    locality: req.query.locality
  });
  if (!parsed.success) return res.status(400).json(parsed.error);

  const data = await getWorkflowDetails(parsed.data);
  if (data?.status && data.status !== 200) return res.status(data.status).json({ error: data.error });
  res.json(data);
  
});

// (optional) also export default so either import style works
export default router;
