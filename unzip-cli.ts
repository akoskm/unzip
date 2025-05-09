/**
 * Script to extract ZIP files using the system unzip command
 * 
 * Usage:
 * npx ts-node unzip-cli.ts <input-zip-file> <output-directory>
 */

import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Get command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Usage: bun unzip-cli.ts <input-zip-file> <output-directory>');
  process.exit(1);
}

const inputFile = args[0];
const outputDir = args[1];

// Validate input file exists
if (!fs.existsSync(inputFile)) {
  console.error(`Error: Input file "${inputFile}" does not exist.`);
  process.exit(1);
}

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  try {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
  } catch (err) {
    console.error(`Error creating output directory: ${err}`);
    process.exit(1);
  }
}

async function extractZip() {
  try {
    console.log(`Extracting ${inputFile} to ${outputDir}...`);
    
    // Use unzip command with -o flag to overwrite files without prompting
    const { stdout, stderr } = await execAsync(`unzip -o "${inputFile}" -d "${outputDir}"`);
    
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    console.log('Extraction completed successfully.');
  } catch (err) {
    console.error(`Error during extraction: ${err}`);
    process.exit(1);
  }
}

extractZip(); 
