import db from "../config/db.js";

export async function listWorkflows() {
  const [rows] = await db.query("SELECT id, slug, name, description FROM workflows ORDER BY id DESC");
  return rows;
}

export async function getWorkflowBySlug(slug) {
  const [rows] = await db.query("SELECT id, slug, name, description FROM workflows WHERE slug = :slug LIMIT 1", { slug });
  return rows[0] || null;
}

export async function createWorkflow({ slug, name, description }) {
  const [res] = await db.query(
    "INSERT INTO workflows (slug, name, description) VALUES (:slug, :name, :description)",
    { slug, name, description }
  );
  return res.insertId;
}

export async function updateWorkflow(id, { slug, name, description }) {
  await db.query(
    "UPDATE workflows SET slug = :slug, name = :name, description = :description WHERE id = :id",
    { id, slug, name, description }
  );
}

export async function deleteWorkflow(id) {
  await db.query("DELETE FROM workflows WHERE id = :id", { id });
}
