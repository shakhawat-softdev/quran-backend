#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const srcDataDir = path.join(path.dirname(__dirname), "src", "data");
const destDataDir = path.join(path.dirname(__dirname), "dist", "data");

// Create destination directory if it doesn't exist
if (!fs.existsSync(destDataDir)) {
  fs.mkdirSync(destDataDir, { recursive: true });
}

// Copy all JSON files from src/data to dist/data
try {
  const files = fs.readdirSync(srcDataDir);
  files.forEach((file) => {
    if (file.endsWith(".json")) {
      const srcFile = path.join(srcDataDir, file);
      const destFile = path.join(destDataDir, file);
      fs.copyFileSync(srcFile, destFile);
      console.log(`✓ Copied ${file}`);
    }
  });
  console.log("✓ Data files copied successfully");
} catch (error) {
  console.error("✗ Error copying data files:", error.message);
  process.exit(1);
}
