/**
 * Script to extract ZIP files using adm-zip library
 *
 * Usage:
 * npx ts-node adm-zip.ts <input-zip-file> <output-directory>
 */

import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';

// Get command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Usage: bun adm-zip.ts <input-zip-file> <output-directory>');
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

    // Create AdmZip instance
    const zip = new AdmZip(inputFile);
    
    // Get information about ZIP contents
    const zipEntries = zip.getEntries();
    console.log(`Found ${zipEntries.length} entries in the ZIP archive`);

    // Try different extraction approaches
    try {
      // Method 1: Extract all at once
      zip.extractAllTo(outputDir, true); // true = overwrite
      console.log('Successfully extracted all files using bulk extraction');
      return;
    } catch (error) {
      console.log('Bulk extraction failed, trying individual file extraction...');
    }

    // Method 2: Extract files individually
    try {
      for (const entry of zipEntries) {
        if (!entry.isDirectory) {
          const outputPath = path.join(outputDir, entry.entryName);
          const outputDirPath = path.dirname(outputPath);

          // Create subdirectories if needed
          if (!fs.existsSync(outputDirPath)) {
            fs.mkdirSync(outputDirPath, { recursive: true });
          }

          // Extract individual file
          zip.extractEntryTo(entry.entryName, outputDirPath, false, true); // false = maintain folder structure, true = overwrite
          console.log(`Extracted: ${entry.entryName}`);
        }
      }
      console.log('Successfully extracted all files individually');
      return;
    } catch (error) {
      console.error('Individual file extraction failed');
      throw error;
    }
  } catch (err) {
    console.error(`Error during extraction: ${err}`);
    process.exit(1);
  }
}

extractZip(); 
