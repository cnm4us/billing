import express from "express";
import path from "path";
import methodOverride from "method-override";
import morgan from "morgan";
import dotenv from "dotenv";
import indexRoutes from "./routes/index.routes.js";
import workflowRoutes from "./routes/workflows.js";

dotenv.config();
const app = express();

app.set("views", path.join(process.cwd(), "src", "views"));
app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(morgan("dev"));
app.use(express.static(path.join(process.cwd(), "public")));

app.use("/", indexRoutes);
app.use("/api/workflows", workflowRoutes); 

// 404 and error handlers
app.use((req, res) => res.status(404).render("home/index", { title: "Not found" }));
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).render("home/index", { title: "Server error", error: err.message });
});

export default app;
