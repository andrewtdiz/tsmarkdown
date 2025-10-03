import { readdir } from "fs/promises";
import {
  readFileSync,
  unlinkSync,
  watch as fsWatch,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "fs";
import { transpileSource } from "../compiler/core.js";

/**
 * Options for the file watcher
 */
type WatchOptions = {
  /** Directory to watch (relative to cwd) */
  directory?: string;
  /** Output directory for generated files */
  outputDirectory?: string;
  /** If true, only process the files once and then exit */
  once?: boolean;
};

const DEFAULT_OUTPUT_DIR = "tsmd-out";

/**
 * Watches .tsmd files and auto-transpiles them to TypeScript
 *
 * @param watchOptions - Watch configuration
 * @param watchOptions.directory - Directory to watch (defaults to "tsmd")
 * @param watchOptions.once - If true, processes files once and exits (no watcher returned)
 * @returns File system watcher (or void if once mode)
 *
 * @example
 * ```typescript
 * const watcher = await watch({ directory: "tsmd" });
 * watcher.close();
 * ```
 *
 * @example
 * ```typescript
 * await watch({ directory: "tsmd", once: true });
 * ```
 */
export async function watch(watchOptions?: WatchOptions) {
  const directory = watchOptions?.directory;
  const outputDir = watchOptions?.outputDirectory || DEFAULT_OUTPUT_DIR;

  const cwd = process.cwd();
  const listenDir = directory || `tsmd`;
  const dir = `${cwd}/${listenDir}`;

  async function processTsmdFile(fileName: string) {
    const inputFileName = `${dir}/${fileName}`;
    const fileTitle = fileName.split(".")[0];
    const outputFileName = `${cwd}/${outputDir}/${fileTitle}.ts`;

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const generatedDir = `${cwd}/${outputDir}`;
    if (!existsSync(generatedDir)) {
      mkdirSync(generatedDir, { recursive: true });
    }

    try {
      const file = readFileSync(inputFileName, "utf8");
      const fullFileResult = transpileSource(file);

      writeFileSync(
        outputFileName,
        fullFileResult.transpiledFile
      );
    } catch (error) {
      console.error(`❌ Error transpiling ${fileName}:`, error);
    }
  }

  if (!existsSync(dir)) {
    if (watchOptions?.once) {
      console.log(`Directory ${listenDir} does not exist, nothing to process.`);
      return;
    }
    mkdirSync(dir, { recursive: true });
  }

  const files = await readdir(dir);
  for (const file of files) {
    if (!file.endsWith(".tsmd")) {
      continue;
    }
    await processTsmdFile(file);
  }

  // If once mode, exit after processing all files
  if (watchOptions?.once) {
    console.log(`Processed all .tsmd files in ${listenDir}, exiting...`);
    return;
  }

  const watcher = fsWatch(dir, async (event, fullFileName) => {
    console.log(`Detected ${event} in ${fullFileName}`);
    if (!fullFileName) {
      return;
    }
    if (!fullFileName.endsWith(".tsmd")) {
      return;
    }
    const inputFileName = `${dir}/${fullFileName}`;
    const fileTitle = fullFileName.split(".")[0];
    const outputFileName = `${cwd}/${outputDir}/${fileTitle}.ts`;
    try {
      const file = readFileSync(inputFileName, "utf8");
    } catch (error) {
      try {
        console.log(`Removing ${outputFileName}`);
        const file = readFileSync(outputFileName, "utf8");
        if (file) {
          unlinkSync(outputFileName);
          console.log(`Removed ${outputFileName}`);
        }
      } catch (error) { }
      return;
    }
    await processTsmdFile(fullFileName);
    console.log(`Updated: ${fileTitle}.ts`);
    console.log(`Listening for changes in ${listenDir}...`);
  });

  console.clear();
  console.log(`Listening for changes in ${listenDir}...`);

  process.on("SIGINT", () => {
    console.log("SIGINT received, closing watcher");
    watcher.close();
    process.exit(0);
  });

  return watcher;
}
