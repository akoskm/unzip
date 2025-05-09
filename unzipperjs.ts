/**
 * Script to extract ZIP files using unzipper library
 *
 * Usage:
 * npx ts-node unzipjs.ts <input-zip-file> <output-directory>
 */

import * as fs from 'fs';
import * as path from 'path';
import * as unzipper from 'unzipper';
import { promisify } from 'util';
import { pipeline } from 'stream';

const pipelineAsync = promisify(pipeline);

// Get command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Usage: bun unzipperjs.ts <input-zip-file> <output-directory>');
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

    // Create a read stream for the ZIP file
    const zipStream = fs.createReadStream(inputFile);
    
    // Get information about the ZIP contents
    const directory = await unzipper.Open.file(inputFile);
    console.log(`Found ${directory.files.length} files in the ZIP archive`);
    
    // Try different extraction methods
    try {
      // Method 1: Extract all files at once
      await pipelineAsync(
        fs.createReadStream(inputFile),
        unzipper.Extract({ path: outputDir })
      );
      console.log('Successfully extracted all files using direct extraction');
      return;
    } catch (error) {
      console.log('Direct extraction failed, trying individual file extraction...');
    }

    // Method 2: Extract files individually
    try {
      for (const file of directory.files) {
        const outputPath = path.join(outputDir, file.path);
        const outputDirPath = path.dirname(outputPath);

        // Create subdirectories if needed
        if (!fs.existsSync(outputDirPath)) {
          fs.mkdirSync(outputDirPath, { recursive: true });
        }

        // Extract individual file
        await pipelineAsync(
          file.stream(),
          fs.createWriteStream(outputPath)
        );
        console.log(`Extracted: ${file.path}`);
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
