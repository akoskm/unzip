/**
 * Script to extract compressed files using decompress library
 * Supports multiple formats: zip, tar, tar.gz, rar, etc.
 *
 * Usage:
 * npx ts-node decompress.ts <input-compressed-file> <output-directory>
 */

import * as fs from 'fs';
import * as path from 'path';
import decompress from 'decompress';

// Get command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Usage: bun decompress.ts <input-compressed-file> <output-directory>');
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

async function extractArchive() {
  try {
    console.log(`Extracting ${inputFile} to ${outputDir}...`);

    // Extract the archive with progress tracking
    const files = await decompress(inputFile, outputDir, {
      // Optional plugins are automatically detected based on file extension
      filter: file => {
        // Log each file as it's being processed
        console.log(`Processing: ${file.path}`);
        return true; // Extract all files
      },
      map: file => {
        // You can transform files here if needed
        return file;
      }
    });

    // Log summary
    console.log(`\nExtraction completed successfully!`);
    console.log(`Total files extracted: ${files.length}`);
    
    // Group files by type for summary
    const fileTypes = files.reduce((acc, file) => {
      const ext = path.extname(file.path).toLowerCase() || '(no extension)';
      acc[ext] = (acc[ext] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\nFile types extracted:');
    Object.entries(fileTypes)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .forEach(([ext, count]) => {
        console.log(`${ext}: ${count} file${count === 1 ? '' : 's'}`);
      });

  } catch (err) {
    console.error(`Error during extraction: ${err}`);
    
    // Provide more helpful error messages for common issues
    if (err instanceof Error) {
      if (err.message.includes('not a valid')) {
        console.error('\nThis might be due to:');
        console.error('1. Unsupported compression format');
        console.error('2. Corrupted archive file');
        console.error('3. Password-protected archive');
      }
    }
    
    process.exit(1);
  }
}

extractArchive(); 
