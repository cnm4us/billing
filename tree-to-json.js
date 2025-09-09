#!/usr/bin/env node

/**
 * tree-to-json.js
 * Recursively scans a directory and outputs a JSON hierarchy of files and folders.
 * Intended for generating a structured `project_tree.json` snapshot.
 */

import fs from 'fs';
import path from 'path';

const IGNORE = ['node_modules', '.git', 'uploads', '.DS_Store', 'project_tree.json'];
const ROOT_DIR = process.cwd();
const OUTPUT_FILE = 'project_tree.json';

function buildTree(dirPath, depth = 0) {
  const name = path.basename(dirPath);
  const item = { name, path: dirPath.replace(ROOT_DIR + '/', ''), type: 'directory', children: [] };

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE.includes(entry.name)) continue;

    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      item.children.push(buildTree(fullPath, depth + 1));
    } else {
      item.children.push({
        name: entry.name,
        path: fullPath.replace(ROOT_DIR + '/', ''),
        type: 'file',
        extension: path.extname(entry.name).replace('.', '') || null
      });
    }
  }

  return item;
}

const tree = buildTree(ROOT_DIR);
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(tree, null, 2), 'utf8');
console.log(`✅ Project tree written to ${OUTPUT_FILE}`);
