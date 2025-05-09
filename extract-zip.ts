/**
 * Script to extract ZIP files using extract-zip
 * Features: Promise-based, clean API, proper error handling
 *
 * Usage:
 * npx ts-node extract-zip.ts <input-zip-file> <output-directory>
 */

import * as fs from 'fs';
import * as path from 'path';
import extract from 'extract-zip';
import { promisify } from 'util';
import { stat } from 'fs/promises';

// Get command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Usage: bun extract-zip.ts <input-zip-file> <output-directory>');
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

// Helper function to get directory size
async function getDirectorySize(dirPath: string): Promise<number> {
  let size = 0;
  const files = await fs.promises.readdir(dirPath, { withFileTypes: true });
  
  for (const file of files) {
    const filePath = path.join(dirPath, file.name);
    if (file.isDirectory()) {
      size += await getDirectorySize(filePath);
    } else {
      const stats = await stat(filePath);
      size += stats.size;
    }
  }
  
  return size;
}

// Helper function to count files in directory
async function countFiles(dirPath: string): Promise<{ files: number; directories: number }> {
  let count = { files: 0, directories: 0 };
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      count.directories++;
      const subCount = await countFiles(entryPath);
      count.files += subCount.files;
      count.directories += subCount.directories;
    } else {
      count.files++;
    }
  }
  
  return count;
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
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`Created output directory: ${outputDir}`);
    }

    console.log(`Extracting ${inputFile} to ${outputDir}...`);
    const startTime = Date.now();

    // Extract the ZIP file
    await extract(inputFile, {
      dir: path.resolve(outputDir),
      onEntry: (entry, zipfile) => {
        console.log(`Extracting: ${entry.fileName}`);
      }
    });

    // Calculate extraction statistics
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;
    
    console.log('\nGathering statistics...');
    
    // Get total size of extracted files
    const extractedSize = await getDirectorySize(outputDir);
    
    // Count files and directories
    const counts = await countFiles(outputDir);
    
    // Get file type statistics
    const fileTypes = await getFileTypeStats(outputDir);

    // Print summary
    console.log('\nExtraction completed successfully!');
    console.log(`Time taken: ${totalTime.toFixed(1)} seconds`);
    console.log(`Input size: ${formatSize(inputStats.size)}`);
    console.log(`Extracted size: ${formatSize(extractedSize)}`);
    console.log(`Compression ratio: ${(extractedSize / inputStats.size).toFixed(1)}x`);
    console.log(`Average speed: ${formatSize(extractedSize / totalTime)}/sec`);
    console.log(`\nContents:`);
    console.log(`- ${counts.files} files`);
    console.log(`- ${counts.directories} directories`);
    
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
