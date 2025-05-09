/**
 * Script to extract deflate-compressed files using node:zlib
 *
 * Usage:
 * npx ts-node deflate-extractor.ts <input-compressed-file> <output-file>
 */

import * as fs from "fs";
import * as path from "path";
import * as zlib from "node:zlib";

// Get command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error(
    "Usage: bun node-zlib.ts <input-compressed-file> <output-file>"
  );
  process.exit(1);
}

const inputFile = args[0];
const outputFile = args[1];

// Validate input file exists
if (!fs.existsSync(inputFile)) {
  console.error(`Error: Input file "${inputFile}" does not exist.`);
  process.exit(1);
}

// Create output directory if it doesn't exist
const outputDir = path.dirname(outputFile);
if (!fs.existsSync(outputDir)) {
  try {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
  } catch (err) {
    console.error(`Error creating output directory: ${err}`);
    process.exit(1);
  }
}

try {
  console.log(`Decompressing ${inputFile} to ${outputFile}...`);

  // Read the compressed data
  const compressedData = fs.readFileSync(inputFile);

  // Attempt standard deflate decompression
  try {
    const decompressedData = zlib.inflateSync(compressedData);
    fs.writeFileSync(outputFile, decompressedData);
    console.log(`Successfully decompressed with standard deflate algorithm.`);
    console.log(`Decompressed size: ${decompressedData.length} bytes`);
    process.exit(0);
  } catch (error) {
    console.log("Standard deflate decompression failed, trying raw deflate...");
  }

  // Try raw deflate (no header)
  try {
    const decompressedData = zlib.inflateRawSync(compressedData);
    fs.writeFileSync(outputFile, decompressedData);
    console.log(`Successfully decompressed with raw deflate algorithm.`);
    console.log(`Decompressed size: ${decompressedData.length} bytes`);
    process.exit(0);
  } catch (error) {
    console.log("Raw deflate decompression failed, trying gzip...");
  }

  // Try gzip (which uses deflate with a different header)
  try {
    const decompressedData = zlib.gunzipSync(compressedData);
    fs.writeFileSync(outputFile, decompressedData);
    console.log(`Successfully decompressed with gzip algorithm.`);
    console.log(`Decompressed size: ${decompressedData.length} bytes`);
    process.exit(0);
  } catch (error) {
    console.error("All decompression methods failed.");
    console.error(
      "Note: node:zlib does not support deflate64. For deflate64, you may need a specialized library."
    );
    process.exit(1);
  }
} catch (err) {
  console.error(`Error during decompression: ${err}`);
  process.exit(1);
}
