#!/bin/bash

# Output file
OUTPUT="project_tree.txt"

# Header
{
  echo "# Semantic Blog Project Structure"
  echo "# Generated: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "# Purpose: AI-readable project map for OpenAI thread startup"
  echo "# Semantic Blog is an AI-assisted knowledge base with chunked content, GPT-querying, and memory-aware personas."
  echo ""

  # Highlight key files
  echo "🔧 Entrypoints & Core Files:"
  echo "- app.js: Express entrypoint"
  echo "- knowledge_base.sql: MySQL schema"
  echo "- package.json: Dependencies & scripts"
  echo "- project_map.txt: Import/export map"
  echo "- project_roles.txt: Team/persona roles"
  echo "- services/logger/Logger.js: Centralized logging system"
  echo "- services/embedding/embedder.js: Embedding wrapper for OpenAI API"
  echo "- services/article/article-chunker-orchestrator.js: Full chunking pipeline"
  echo ""

  # Root-level files
  echo "📁 Root Files"
  tree -L 1 -I "node_modules|uploads|.git" >> "$OUTPUT"
  echo ""

  # Routes
  echo "📁 /routes"
  tree routes -L 2
  echo ""

  # Services (deep)
  echo "📁 /services"
  tree services -L 4 -I "node_modules|uploads|.git"
  echo ""

  # Views
  echo "📁 /views"
  tree views -L 3
  echo ""

  # SQL, scripts, utils
  echo "📁 Other Notable Folders"
  tree config -L 2
  tree scripts -L 2
  tree utils -L 2
  echo ""

  # File type summary
  echo "📊 File Type Summary:"
  find . -type f -name "*.*" \
    | sed 's|.*\.||' \
    | grep -E '^(js|ejs|json|sql|md)$' \
    | sort | uniq -c | sort -rn

  echo ""
  echo "# End of AI bootstrapping tree. Use this to understand:"
  echo "# - Entrypoints and file hierarchy"
  echo "# - Location of logger, chunking, and embedder systems"
  echo "# - View rendering structure"
  echo "# - Common file types in the codebase"
} > "$OUTPUT"

# Completion
echo -e "\n✅ Output written to $OUTPUT"