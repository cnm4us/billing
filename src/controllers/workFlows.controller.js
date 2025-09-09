import * as Workflow from "../models/Workflow.model.js";

export async function index(req, res, next) {
  try {
    const workflows = await Workflow.listWorkflows();
    res.render("workflows/list", { title: "Workflows", workflows });
  } catch (e) { next(e); }
}

export async function show(req, res, next) {
  try {
    const wf = await Workflow.getWorkflowBySlug(req.params.slug);
    if (!wf) return res.status(404).render("home/index", { title: "Workflow not found" });
    res.render("workflows/show", { title: wf.name, wf });
  } catch (e) { next(e); }
}

export async function create(req, res, next) {
  try {
    const id = await Workflow.createWorkflow(req.body);
    res.redirect(`/workflows/${req.body.slug}`);
  } catch (e) { next(e); }
}

export async function update(req, res, next) {
  try {
    await Workflow.updateWorkflow(req.params.id, req.body);
    res.redirect(`/workflows/${req.body.slug}`);
  } catch (e) { next(e); }
}

export async function destroy(req, res, next) {
  try {
    await Workflow.deleteWorkflow(req.params.id);
    res.redirect("/workflows");
  } catch (e) { next(e); }
}
