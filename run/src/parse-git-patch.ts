const hashRegex = /^From (\S*)/;
const authorRegex = /^From:\s?([^<].*[^>])?\s+(<(.*)>)?/;
const fileNameRegex = /^diff --git "?a\/(.*)"?\s*"?b\/(.*)"?/;
const fileLinesRegex = /^@@ -([0-9]*),?\S* \+([0-9]*),?/;
const similarityIndexRegex = /^similarity index /;
const addedFileModeRegex = /^new file mode /;
const deletedFileModeRegex = /^deleted file mode /;

export type PatchLine =
  | { tag: "added"; addedLineNumber: number; line: string }
  | { tag: "removed"; removedLineNumber: number; line: string }
  | {
      tag: "context";
      addedLineNumber: number;
      removedLineNumber: number;
      line: string;
    };

export type PatchFile = {
  added: boolean;
  deleted: boolean;
  beforeName: string;
  afterName: string;
  modifiedLines: PatchLine[];
};

export type Patch = {
  hash?: string;
  authorName?: string;
  authorEmail?: string;
  date?: string;
  message?: string;
  files: PatchFile[];
};

function parseGitPatch(patch: string) {
  if (typeof patch !== "string") {
    throw new Error("Expected first argument (patch) to be a string");
  }

  const lines = patch.split("\n");

  const gitPatchMetaInfo = splitMetaInfo(patch, lines);

  if (!gitPatchMetaInfo) return null;

  const parsedPatch: Patch = {
    ...gitPatchMetaInfo,
    files: [] as PatchFile[],
  };

  splitIntoParts(lines, "diff --git").forEach((diff) => {
    const fileNameLine = diff.shift();

    if (!fileNameLine) return;

    const match3 = fileNameLine.match(fileNameRegex);

    if (!match3) return;

    const [, a, b] = match3;
    const metaLine = diff.shift();

    if (!metaLine) return;

    const fileData: PatchFile = {
      added: false,
      deleted: false,
      beforeName: a.trim(),
      afterName: b.trim(),
      modifiedLines: [],
    };

    parsedPatch.files.push(fileData);

    if (addedFileModeRegex.test(metaLine)) {
      fileData.added = true;
    }
    if (deletedFileModeRegex.test(metaLine)) {
      fileData.deleted = true;
    }
    if (similarityIndexRegex.test(metaLine)) {
      return;
    }

    splitIntoParts(diff, "@@ ").forEach((lines) => {
      const fileLinesLine = lines.shift();

      if (!fileLinesLine) return;

      const match4 = fileLinesLine.match(fileLinesRegex);

      if (!match4) return;

      const [, a, b] = match4;

      let nA = parseInt(a) - 1;
      let nB = parseInt(b) - 1;

      lines.forEach((line, idx) => {
        nA++;
        nB++;

        // This may be deletion of a line with content "- ", or it may be the
        // end of patch terminator. We can ensure it's the latter by checking
        // that we're the 2nd-to-last line.
        if (line === "-- " && idx === lines.length - 3) {
          return;
        }

        if (line.startsWith("+")) {
          nA--;

          fileData.modifiedLines.push({
            tag: "added",
            addedLineNumber: nB,
            line: line.substring(1),
          });
        } else if (line.startsWith("-")) {
          nB--;

          fileData.modifiedLines.push({
            tag: "removed",
            removedLineNumber: nA,
            line: line.substring(1),
          });
        }
      });
    });
  });

  return parsedPatch;
}

function splitMetaInfo(patch: string, lines: string[]) {
  // Compatible with git output
  if (!/^From/g.test(patch)) {
    return {};
  }

  const hashLine = lines.shift();

  if (!hashLine) return null;

  const match1 = hashLine.match(hashRegex);

  if (!match1) return null;

  const [, hash] = match1;

  const authorLine = lines.shift();

  if (!authorLine) return null;

  const match2 = authorLine.match(authorRegex);

  if (!match2) return null;

  const [, authorName, , authorEmail] = match2;

  const dateLine = lines.shift();

  if (!dateLine) return null;

  const [, date] = dateLine.split("Date: ");

  const messageLine = lines.shift();

  if (!messageLine) return null;

  const [, message] = messageLine.split("Subject: ");

  return {
    hash,
    authorName,
    authorEmail,
    date,
    message,
  };
}

function splitIntoParts(lines: string[], separator: string) {
  const parts = [];
  let currentPart: string[] | undefined;

  lines.forEach((line) => {
    if (line.startsWith(separator)) {
      if (currentPart) {
        parts.push(currentPart);
      }

      currentPart = [line];
    } else if (currentPart) {
      currentPart.push(line);
    }
  });

  if (currentPart) {
    parts.push(currentPart);
  }

  return parts;
}

export default parseGitPatch;
