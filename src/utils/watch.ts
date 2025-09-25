import { readdir } from "fs/promises";
import {
  readFileSync,
  unlinkSync,
  watch as fsWatch,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "fs";
import { transpile } from "../transpile";

/**
 * Options for the file watcher
 */
type WatchOptions = {
  /** Directory to watch (relative to cwd) */
  directory?: string;
};

/**
 * Watches .tsmd files and auto-transpiles them to TypeScript
 *
 * @param watchOptions - Watch configuration
 * @param watchOptions.directory - Directory to watch (defaults to "/tsmd")
 * @returns File system watcher
 *
 * @example
 * ```typescript
 * const watcher = await watch({ directory: "/tsmd" });
 * watcher.close();
 * ```
 */
export async function watch(watchOptions?: WatchOptions) {
  const directory = watchOptions?.directory;

  const cwd = process.cwd();
  const listenDir = directory || `/tsmd`;
  const dir = `${cwd}${listenDir}`;

  async function processTsmdFile(fileName: string) {
    const inputFileName = `${dir}/${fileName}`;
    const fileTitle = fileName.split(".")[0];
    const outputFileName = `${dir}/_generated/${fileTitle}.ts`;

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const generatedDir = `${dir}/_generated`;
    if (!existsSync(generatedDir)) {
      mkdirSync(generatedDir, { recursive: true });
    }

    try {
      const file = readFileSync(inputFileName, "utf8");
      const fullFileResult = await transpile(file);

      writeFileSync(
        outputFileName,
        `import { __tsm } from "typescriptmd";\n\n${fullFileResult}`
      );
    } catch (error) {
      console.error(`❌ Error transpiling ${fileName}:`, error);
    }
  }

  const files = await readdir(dir);
  for (const file of files) {
    if (!file.endsWith(".tsmd")) {
      continue;
    }
    await processTsmdFile(file);
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
    const outputFileName = `${dir}/_generated/${fileTitle}.ts`;
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
      } catch (error) {}
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
