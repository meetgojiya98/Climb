#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

const root = process.cwd()
const chunksDir = path.join(root, ".next", "static", "chunks")
const maxLargestChunkKb = Number(process.env.MAX_LARGEST_CHUNK_KB || 320)
const maxTotalChunksKb = Number(process.env.MAX_TOTAL_CHUNKS_KB || 2600)

function listChunkFiles(dir) {
  if (!fs.existsSync(dir)) return []
  const files = fs.readdirSync(dir)
  return files
    .filter((file) => file.endsWith(".js"))
    .map((file) => {
      const filePath = path.join(dir, file)
      const size = fs.statSync(filePath).size
      return { file, size }
    })
}

const chunks = listChunkFiles(chunksDir)
if (chunks.length === 0) {
  console.error("No chunk files found. Run `npm run build` before performance checks.")
  process.exit(1)
}

chunks.sort((a, b) => b.size - a.size)
const totalBytes = chunks.reduce((sum, item) => sum + item.size, 0)
const largest = chunks[0]

const toKb = (value) => Number((value / 1024).toFixed(2))
const largestKb = toKb(largest.size)
const totalKb = toKb(totalBytes)

console.log(`Largest chunk: ${largest.file} (${largestKb} KB)`)
console.log(`Total JS chunks: ${totalKb} KB`)
console.log(`Budgets -> largest <= ${maxLargestChunkKb} KB, total <= ${maxTotalChunksKb} KB`)

if (largestKb > maxLargestChunkKb) {
  console.error(`Largest chunk budget exceeded by ${(largestKb - maxLargestChunkKb).toFixed(2)} KB`)
  process.exit(1)
}

if (totalKb > maxTotalChunksKb) {
  console.error(`Total chunk budget exceeded by ${(totalKb - maxTotalChunksKb).toFixed(2)} KB`)
  process.exit(1)
}

console.log("Performance budget check passed.")
