#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

try {
  const showcaseDir = path.join(__dirname, 'showcase');
  const files = fs.readdirSync(showcaseDir);
  const fullPaths = files
    .filter(file => fs.statSync(path.join(showcaseDir, file)).isFile())
    .map(file => path.join(showcaseDir, file));
  console.log(JSON.stringify(fullPaths));
} catch (error) {
  console.error('Error reading showcase directory:', error.message);
  process.exit(1);
}