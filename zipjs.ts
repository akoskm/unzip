/**
 * Script to extract ZIP files using @zip.js/zip.js
 *
 * Usage:
 * npx ts-node zipjs.ts <input-zip-file> <output-directory>
 */

import * as fs from "fs";
import * as path from "path";
import { ZipReader, BlobReader, BlobWriter } from "@zip.js/zip.js";

// Get command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error("Usage: bun zipjs.ts <input-zip-file> <output-directory>");
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

    // Read the ZIP file
    const zipData = fs.readFileSync(inputFile);
    const zipBlob = new Blob([zipData]);

    // Create a ZIP reader
    const zipReader = new ZipReader(new BlobReader(zipBlob));

    // Get all entries
    const entries = await zipReader.getEntries();
    console.log(`Found ${entries.length} entries in the ZIP file.`);

    // Extract each entry
    for (const entry of entries) {
      if (!entry.directory && entry.getData) {
        const outputPath = path.join(outputDir, entry.filename);
        const outputDirPath = path.dirname(outputPath);

        // Create subdirectories if needed
        if (!fs.existsSync(outputDirPath)) {
          fs.mkdirSync(outputDirPath, { recursive: true });
        }

        // Extract the file
        const blob = await entry.getData(new BlobWriter());
        const buffer = Buffer.from(await blob.arrayBuffer());
        fs.writeFileSync(outputPath, buffer);
        console.log(`Extracted: ${entry.filename}`);
      }
    }

    await zipReader.close();
    console.log("Extraction completed successfully.");
  } catch (err) {
    console.error(`Error during extraction: ${err}`);
    process.exit(1);
  }
}

extractZip();
