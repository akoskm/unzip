/**
 * Script to extract compressed files using minizlib
 * Features: memory efficient, fast extraction, supports multiple formats
 *
 * Usage:
 * npx ts-node minizlib.ts <input-compressed-file> <output-directory>
 */

import * as fs from 'fs';
import * as path from 'path';
import { Unzip, ZlibOptions } from 'minizlib';
import { promisify } from 'util';
import { pipeline } from 'stream';

const pipelineAsync = promisify(pipeline);

// Get command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Usage: bun minizlib.ts <input-compressed-file> <output-directory>');
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

async function extractCompressed() {
  try {
    console.log(`Processing ${inputFile}...`);
    const startTime = Date.now();
    let totalBytes = 0;

    // Create read stream for input file
    const inputStream = fs.createReadStream(inputFile);
    
    // Create unzip stream with default options
    const defaultOptions: ZlibOptions = {
      chunkSize: 16 * 1024
    };
    const unzip = new Unzip(defaultOptions);

    // Set up error handlers
    inputStream.on('error', (err) => {
      console.error(`Error reading input file: ${err}`);
      process.exit(1);
    });

    unzip.on('error', (err) => {
      console.error(`Error during decompression: ${err}`);
      process.exit(1);
    });

    // Track progress
    let lastProgress = Date.now();
    unzip.on('data', (chunk) => {
      totalBytes += chunk.length;
      
      // Update progress every 100ms
      const now = Date.now();
      if (now - lastProgress >= 100) {
        const elapsedSeconds = (now - startTime) / 1000;
        const bytesPerSecond = totalBytes / elapsedSeconds;
        console.log(
          `Processed: ${formatSize(totalBytes)} ` +
          `(${formatSize(bytesPerSecond)}/sec)`
        );
        lastProgress = now;
      }
    });

    // Try different decompression methods
    try {
      console.log('Attempting standard decompression...');
      
      // Method 1: Direct decompression
      const outputPath = path.join(outputDir, path.basename(inputFile, '.gz'));
      await pipelineAsync(
        inputStream,
        unzip,
        fs.createWriteStream(outputPath)
      );

      const endTime = Date.now();
      const totalTime = (endTime - startTime) / 1000;
      
      console.log('\nDecompression completed!');
      console.log(`Output file: ${outputPath}`);
      console.log(`Total size: ${formatSize(totalBytes)}`);
      console.log(`Time taken: ${totalTime.toFixed(1)} seconds`);
      console.log(`Average speed: ${formatSize(totalBytes / totalTime)}/sec`);
      
      return;
    } catch (error) {
      console.log('Standard decompression failed, trying without header...');
    }

    // Method 2: Decompression without header
    try {
      const outputPath = path.join(outputDir, path.basename(inputFile, '.gz'));
      const noHeaderOptions: ZlibOptions = {
        ...defaultOptions,
        windowBits: -15  // Negative windowBits means no header
      };
      await pipelineAsync(
        inputStream,
        new Unzip(noHeaderOptions),
        fs.createWriteStream(outputPath)
      );

      const endTime = Date.now();
      const totalTime = (endTime - startTime) / 1000;
      
      console.log('\nDecompression without header completed!');
      console.log(`Output file: ${outputPath}`);
      console.log(`Total size: ${formatSize(totalBytes)}`);
      console.log(`Time taken: ${totalTime.toFixed(1)} seconds`);
      console.log(`Average speed: ${formatSize(totalBytes / totalTime)}/sec`);
      
      return;
    } catch (error) {
      console.error('All decompression methods failed');
      throw error;
    }

  } catch (err) {
    console.error(`Error during extraction: ${err}`);
    
    // Provide more helpful error messages for common issues
    if (err instanceof Error) {
      if (err.message.includes('invalid') || err.message.includes('not a')) {
        console.error('\nThis might be due to:');
        console.error('1. File is not compressed or uses unsupported compression');
        console.error('2. Corrupted compressed file');
        console.error('3. Unsupported compression method');
      }
    }
    
    process.exit(1);
  }
}

extractCompressed(); 
