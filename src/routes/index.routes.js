// src/routes/index.routes.js
import { Router } from "express";

const router = Router();

/**
 * Landing page route
 * Renders the EJS view at src/views/home/index.ejs
 */
router.get("/", (_req, res) => {
  res.render("home/index", {
    title: "Billing Workflow MVP",
  });
});

export default router;
