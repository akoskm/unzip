/**
 * Script to extract ZIP files using minizip-asm.js library
 * Features: memory efficient, fast extraction, WebAssembly-powered
 *
 * Usage:
 * npx ts-node minizip.ts <input-zip-file> <output-directory>
 */

import * as fs from 'fs';
import * as path from 'path';
import { instantiate } from 'minizip-asm.js';

// Get command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Usage: bun minizip.ts <input-zip-file> <output-directory>');
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

// Helper function to format file size
function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

async function extractZip() {
  try {
    console.log(`Loading ${inputFile}...`);
    
    // Initialize minizip
    const minizip = await instantiate();
    
    // Read the ZIP file
    const data = fs.readFileSync(inputFile);
    const startTime = Date.now();
    
    // Open ZIP archive
    const zip = await minizip.openArchive(data);
    const entries = zip.getEntries();
    console.log(`Found ${entries.length} entries in the ZIP archive`);

    // Track extraction progress
    let extractedCount = 0;
    let totalBytes = 0;
    const totalFiles = entries.length;
    const fileTypes: Record<string, number> = {};

    // Process each entry
    for (const entry of entries) {
      try {
        // Skip directories
        if (entry.isDirectory) {
          extractedCount++;
          continue;
        }

        // Create full output path
        const outputPath = path.join(outputDir, entry.path);
        const outputDirPath = path.dirname(outputPath);

        // Create subdirectories if needed
        if (!fs.existsSync(outputDirPath)) {
          fs.mkdirSync(outputDirPath, { recursive: true });
        }

        // Extract file content
        const content = await zip.extractEntry(entry);
        fs.writeFileSync(outputPath, content);

        // Update statistics
        totalBytes += content.length;
        const ext = path.extname(entry.path).toLowerCase() || '(no extension)';
        fileTypes[ext] = (fileTypes[ext] || 0) + 1;

        // Update progress
        extractedCount++;
        const progress = Math.round((extractedCount / totalFiles) * 100);
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        const bytesPerSecond = totalBytes / elapsedSeconds;

        console.log(
          `[${progress}%] Extracted: ${entry.path} ` +
          `(${formatSize(content.length)}, ` +
          `${extractedCount}/${totalFiles}, ` +
          `${formatSize(bytesPerSecond)}/sec)`
        );

      } catch (err) {
        console.error(`Error extracting ${entry.path}: ${err}`);
        // Continue with next file
      }
    }

    // Close the archive
    zip.close();

    // Print summary
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;
    
    console.log('\nExtraction completed!');
    console.log(`Total size: ${formatSize(totalBytes)}`);
    console.log(`Time taken: ${totalTime.toFixed(1)} seconds`);
    console.log(`Average speed: ${formatSize(totalBytes / totalTime)}/sec`);
    
    // Print file type statistics
    console.log('\nFile types extracted:');
    Object.entries(fileTypes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([ext, count]) => {
        console.log(`${ext}: ${count} file${count === 1 ? '' : 's'}`);
      });

  } catch (err) {
    console.error(`Error during extraction: ${err}`);
    
    // Provide more helpful error messages for common issues
    if (err instanceof Error) {
      if (err.message.includes('invalid') || err.message.includes('corrupted')) {
        console.error('\nThis might be due to:');
        console.error('1. Corrupted ZIP file');
        console.error('2. Unsupported compression method');
        console.error('3. Password-protected ZIP');
      }
    }
    
    process.exit(1);
  }
}

extractZip(); 
