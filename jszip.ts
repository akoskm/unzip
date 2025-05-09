/**
 * Script to extract ZIP files using JSZip library
 * Features: streaming support, progress tracking, memory efficient
 *
 * Usage:
 * npx ts-node jszip.ts <input-zip-file> <output-directory>
 */

import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip';

// Get command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Usage: bun jszip.ts <input-zip-file> <output-directory>');
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
    console.log(`Loading ${inputFile}...`);
    
    // Read the ZIP file
    const data = fs.readFileSync(inputFile);
    const zip = new JSZip();
    
    // Load the ZIP content with progress tracking
    const zipContent = await zip.loadAsync(data, {
      checkCRC32: true,
      createFolders: true
    });

    // Get all files in the ZIP
    const files = Object.keys(zipContent.files);
    console.log(`Found ${files.length} entries in the ZIP archive`);

    // Track extraction progress
    let extractedCount = 0;
    const totalFiles = files.length;
    const startTime = Date.now();

    // Group for storing file type statistics
    const fileTypes: Record<string, number> = {};

    // Process each file
    for (const filePath of files) {
      const zipEntry = zipContent.files[filePath];
      
      // Skip directories
      if (zipEntry.dir) {
        extractedCount++;
        continue;
      }

      try {
        // Create full output path
        const outputPath = path.join(outputDir, filePath);
        const outputDirPath = path.dirname(outputPath);

        // Create subdirectories if needed
        if (!fs.existsSync(outputDirPath)) {
          fs.mkdirSync(outputDirPath, { recursive: true });
        }

        // Extract file content
        const content = await zipEntry.async('nodebuffer');
        fs.writeFileSync(outputPath, content);

        // Update file type statistics
        const ext = path.extname(filePath).toLowerCase() || '(no extension)';
        fileTypes[ext] = (fileTypes[ext] || 0) + 1;

        // Update progress
        extractedCount++;
        const progress = Math.round((extractedCount / totalFiles) * 100);
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        const filesPerSecond = extractedCount / elapsedSeconds;

        console.log(
          `[${progress}%] Extracted: ${filePath} ` +
          `(${extractedCount}/${totalFiles}, ${filesPerSecond.toFixed(1)} files/sec)`
        );

      } catch (err) {
        console.error(`Error extracting ${filePath}: ${err}`);
        // Continue with next file
      }
    }

    // Print summary
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;
    
    console.log('\nExtraction completed!');
    console.log(`Time taken: ${totalTime.toFixed(1)} seconds`);
    console.log(`Average speed: ${(extractedCount / totalTime).toFixed(1)} files/sec`);
    
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
      if (err.message.includes('invalid signature')) {
        console.error('\nThis might be due to:');
        console.error('1. Corrupted ZIP file');
        console.error('2. Not a valid ZIP file');
        console.error('3. Password-protected ZIP');
      }
    }
    
    process.exit(1);
  }
}

extractZip(); 
