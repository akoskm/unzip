/**
 * Script to extract ZIP files using fflate
 * Features: High performance, streaming support, WASM-like speed in pure JS
 *
 * Usage:
 * npx ts-node fflate.ts <input-zip-file> <output-directory>
 */

import * as fs from 'fs';
import * as path from 'path';
import { unzipSync } from 'fflate';
import { stat } from 'fs/promises';

// Get command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Usage: bun fflate.ts <input-zip-file> <output-directory>');
  process.exit(1);
}

const inputFile = args[0];
const outputDir = args[1];

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

// Helper function to ensure directory exists
function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Helper function to get file type statistics
async function getFileTypeStats(dirPath: string): Promise<Record<string, number>> {
  const stats: Record<string, number> = {};
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const subStats = await getFileTypeStats(entryPath);
      for (const [ext, count] of Object.entries(subStats)) {
        stats[ext] = (stats[ext] || 0) + count;
      }
    } else {
      const ext = path.extname(entry.name).toLowerCase() || '(no extension)';
      stats[ext] = (stats[ext] || 0) + 1;
    }
  }
  
  return stats;
}

async function extractZipFile() {
  try {
    // Validate input file exists
    if (!fs.existsSync(inputFile)) {
      console.error(`Error: Input file "${inputFile}" does not exist.`);
      process.exit(1);
    }

    // Get input file size
    const inputStats = await stat(inputFile);
    console.log(`Input ZIP size: ${formatSize(inputStats.size)}`);

    // Create output directory if it doesn't exist
    ensureDir(outputDir);
    console.log(`Extracting ${inputFile} to ${outputDir}...`);

    // Read the ZIP file
    const zipData = fs.readFileSync(inputFile);
    const startTime = Date.now();
    let totalBytes = 0;
    let fileCount = 0;
    let dirCount = 0;

    // Extract the ZIP file
    const files = unzipSync(zipData);
    
    // Process each file
    for (const [filename, contents] of Object.entries(files)) {
      const filePath = path.join(outputDir, filename);
      const fileDir = path.dirname(filePath);
      
      // Create directory if needed
      ensureDir(fileDir);
      
      // Write the file
      const fileContents = contents as Uint8Array;
      fs.writeFileSync(filePath, fileContents);
      
      // Update statistics
      totalBytes += fileContents.length;
      fileCount++;
      
      // Show progress
      process.stdout.write(`\rExtracting: ${filename} (${formatSize(fileContents.length)})`);
    }

    // Calculate final statistics
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;
    
    // Get file type statistics
    console.log('\n\nGathering file type statistics...');
    const fileTypes = await getFileTypeStats(outputDir);

    // Print summary
    console.log('\nExtraction completed successfully!');
    console.log(`Time taken: ${totalTime.toFixed(1)} seconds`);
    console.log(`Input size: ${formatSize(inputStats.size)}`);
    console.log(`Extracted size: ${formatSize(totalBytes)}`);
    console.log(`Compression ratio: ${(totalBytes / inputStats.size).toFixed(1)}x`);
    console.log(`Average speed: ${formatSize(totalBytes / totalTime)}/sec`);
    console.log(`\nContents:`);
    console.log(`- ${fileCount} files`);
    console.log(`- ${dirCount} directories`);
    
    // Print file type statistics
    console.log('\nFile types:');
    Object.entries(fileTypes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([ext, count]) => {
        console.log(`${ext}: ${count} file${count === 1 ? '' : 's'}`);
      });

  } catch (err) {
    console.error(`Error during extraction: ${err}`);
    
    // Provide more helpful error messages for common issues
    if (err instanceof Error) {
      if (err.message.includes('invalid') || err.message.includes('not a')) {
        console.error('\nThis might be due to:');
        console.error('1. Corrupted ZIP file');
        console.error('2. Unsupported ZIP format');
        console.error('3. Password-protected ZIP');
      }
    }
    
    process.exit(1);
  }
}

extractZipFile(); 
