/* Copyright (C) 2024 Patrick Brisbin
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import { Patch, PatchFile, PatchLine } from "./parse-git-patch";
import { Suggestion, getSuggestions } from "./suggestions";

type TestCase = {
  name: string;
  bases: Patch[];
  patches: Patch[];
  suggestions: Suggestion[];
};

function testCase(
  name: string,
  bases: Patch[],
  patches: Patch[],
  suggestions: Suggestion[],
): TestCase {
  return { name, bases, patches, suggestions };
}

function patch(message: string, files: PatchFile[]): Patch {
  return {
    hash: "<some hash>",
    date: "<some date>",
    authorName: "Restyled Test",
    authorEmail: "test@restyled.io",
    message: `[PATCH] ${message}`,
    files,
  };
}

function patchFile(name: string, diff: string): PatchFile {
  const modifiedLines: PatchLine[] = [];

  diff
    .split("\n")
    .filter((x) => x.trim() !== "")
    .forEach((diffLine) => {
      const [rawBeforeLine, rawAfterLine, ...line] = diffLine.split("|");
      const beforeLine = rawBeforeLine.trim();
      const afterLine = rawAfterLine.trim();

      if (beforeLine !== "" && afterLine !== "") {
        // context
        return;
      }

      const modifiedLine: PatchLine =
        beforeLine !== ""
          ? {
              tag: "removed",
              removedLineNumber: parseInt(beforeLine, 10),
              line: line.join("|"),
            }
          : {
              tag: "added",
              addedLineNumber: parseInt(afterLine, 10),
              line: line.join("|"),
            };

      modifiedLines.push(modifiedLine);
    });

  return {
    added: false,
    deleted: false,
    beforeName: name,
    afterName: name,
    modifiedLines,
  };
}

const cases: TestCase[] = [
  testCase(
    "Change on change",
    [
      patch("JSON stringify string responses", [
        patchFile(
          "src/events/http/File1.js",
          `
            774|   |        if (result && typeof result.body !== 'undefined') {
               |774|        if (typeof result === 'string') {
               |775|          response.source = JSON.stringify(result)
               |776|        } else if (result && typeof result.body !== 'undefined') {
          `,
        ),
      ]),
    ],
    [
      patch("Restyled by prettier", [
        patchFile(
          "src/events/http/File1.js",
          `
            775|   |          response.source = JSON.stringify(result)
               |775|          response.source = JSON.stringify(result);
          `,
        ),
      ]),
    ],
    [
      {
        path: "src/events/http/File1.js",
        description: "Restyled by prettier",
        startLine: 775,
        endLine: 775,
        code: ["          response.source = JSON.stringify(result);"],
      },
    ],
  ),
  testCase(
    "Change on addition",
    [
      patch("Blah blah", [
        patchFile(
          "suggestions/src/hunk.ts",
          `
            | 1|import { type NonEmpty } from "./non-empty";
            | 2|import * as NE from "./non-empty";
            | 3|
            | 4|export interface HasLineNumber {
            | 5|  lineNumber: number;
            | 6|}
            | 7|
            | 8|export class Hunks<T> {
            | 9|  private map: Map<number, NonEmpty<T & HasLineNumber>>;
            |10|  private lastHunk: number;
            |11|  private lastLine: number;
            |12|
            |12|  constructor() {
            |13|    this.map = new Map();
            |14|    this.lastHunk = -1;
            |15|    this.lastLine = -1;
            |16|  }
            |17|
            |18|  get(lineNumber: number): NonEmpty<T & HasLineNumber> | null { return this.map.get(lineNumber) || null; }
            |19|
            |20|  add(line: T & HasLineNumber) {
            |21|    const current = this.get(line.lineNumber);
            |22|    const sameLine = line.lineNumber == this.lastLine;
            |23|    const lastLine = line.lineNumber === this.lastLine + 1;
            |24|
            |25|    if (current && (sameLine || lastLine)) {
            |26|      NE.append(current, NE.singleton(line));
            |27|    } else {
            |28|      this.map.set(line.lineNumber, NE.singleton(line));
            |29|      this.lastHunk = line.lineNumber;
            |30|    }
            |31|
            |32|    this.lastLine = line.lineNumber;
            |33|  }
            |34|
            |35|  forEachHunkWithin(
            |36|    other: Hunks<T>,
            |37|    f: (hunk: NonEmpty<T & HasLineNumber>) => void,
            |38|  ): void {
            |39|    Array.from(this.map.values()).forEach((hunk) => {
            |40|      if (other.contains(hunk)) {
            |41|        f(hunk);
            |42|      }
            |43|    });
            |44|  }
            |45|
            |46|  contains(hunk: NonEmpty<T & HasLineNumber>) {
            |47|    return Array.from(this.map.values()).some((x) => {
            |48|      return (
            |49|        hunk.head.lineNumber >= x.head.lineNumber &&
            |50|        hunk.last.lineNumber <= x.last.lineNumber
            |51|      );
            |52|    });
            |53|  }
            |54|}
            |55|
            |56|export function build<T>(lines: (T & HasLineNumber)[]): Hunks<T> {
            |57|  const hunks: Hunks<T> = new Hunks();
            |58|  lines.forEach((line) => hunks.add(line));
            |59|  return hunks;
            |60|}
        `,
        ),
      ]),
    ],
    [
      patch("Restyled by prettier", [
        patchFile(
          "suggestions/src/hunk.ts",
          `
            18|  |  get(lineNumber: number): NonEmpty<T & HasLineNumber> | null { return this.map.get(lineNumber) || null; }
              |18|  get(lineNumber: number): NonEmpty<T & HasLineNumber> | null {
              |19|    return this.map.get(lineNumber) || null;
              |20|  }
          `,
        ),
      ]),
    ],
    [
      {
        path: "suggestions/src/hunk.ts",
        startLine: 18,
        endLine: 18,
        description: "Restyled by prettier",
        code: [
          "  get(lineNumber: number): NonEmpty<T & HasLineNumber> | null {",
          "    return this.map.get(lineNumber) || null;",
          "  }",
        ],
      },
    ],
  ),
  testCase(
    "Multi-line suggestion",
    [
      patch("Update Foo", [
        patchFile(
          "Foo.hs",
          `
          1|1|
          2| | setRequestBody
          3| |   $ encode
           |2| setRequestBody $
           |3|   encode
          4|4|
          `,
        ),
      ]),
    ],
    [
      patch("Restyled by fourmolu", [
        patchFile(
          "Foo.hs",
          `
          1|1|
          2| | setRequestBody $
          3| |   encode
           |2| setRequestBody
           |3|   $ encode
          4|4|
          `,
        ),
      ]),
    ],
    [
      {
        path: "Foo.hs",
        startLine: 2,
        endLine: 3,
        description: "Restyled by fourmolu",
        code: [" setRequestBody", "   $ encode"],
      },
    ],
  ),
  testCase(
    "Suggested deletion",
    [
      patch("Update Foo", [
        patchFile(
          "Foo2.hs",
          `
          1|1|
          2| | setRequestBody
          3| |   $ encode
           |2| setRequestBody $
           |3|   encode
          4|4|
          `,
        ),
      ]),
    ],
    [
      patch("Restyled by fourmolu", [
        patchFile(
          "Foo2.hs",
          `
          1|1|
          2| | setRequestBody $
          3| |   encode
          4|2|
          `,
        ),
      ]),
    ],
    [
      {
        path: "Foo2.hs",
        startLine: 2,
        endLine: 3,
        description: "Restyled by fourmolu",
        code: [],
      },
    ],
  ),
  testCase(
    "Skipped on non-added file",
    [
      patch("JSON stringify string responses", [
        patchFile(
          "src/events/http/File3.js",
          `
            773|773|        # mispelt
            774|   |        if (result && typeof result.body !== 'undefined') {
               |774|        if (typeof result === 'string') {
               |775|          response.source = JSON.stringify(result)
               |776|        } else if (result && typeof result.body !== 'undefined') {
          `,
        ),
      ]),
    ],
    [
      patch("Restyled by spelling", [
        patchFile(
          "src/events/http/Other2.js",
          `
            12|  | # from
              |12| # to
          `,
        ),
      ]),
    ],
    [
      {
        path: "src/events/http/Other2.js",
        description: "Restyled by spelling",
        startLine: 12,
        endLine: 12,
        code: [" # to"],
        skipReason: "suggestions can only be made on added lines",
      },
    ],
  ),
  testCase(
    "Skipped on non-added line",
    [
      patch("JSON stringify string responses", [
        patchFile(
          "src/events/http/File4.js",
          `
            773|773|        # mispelt
            774|   |        if (result && typeof result.body !== 'undefined') {
               |774|        if (typeof result === 'string') {
               |775|          response.source = JSON.stringify(result)
               |776|        } else if (result && typeof result.body !== 'undefined') {
          `,
        ),
      ]),
    ],
    [
      patch("Restyled by spelling", [
        patchFile(
          "src/events/http/File4.js",
          `
            773|   |       # mispelt
               |773|       # mispelled
          `,
        ),
      ]),
    ],
    [
      {
        path: "src/events/http/File4.js",
        description: "Restyled by spelling",
        startLine: 773,
        endLine: 773,
        code: ["       # mispelled"],
        skipReason: "suggestions can only be made on added lines",
      },
    ],
  ),
];

describe("getSuggestions", () => {
  test.each(cases)("$name", ({ bases, patches, suggestions }) => {
    const actual = getSuggestions(bases, patches, []);
    expect(actual).toEqual(suggestions);
  });

  test.each(cases)("$name (resolved)", ({ bases, patches, suggestions }) => {
    const actual = getSuggestions(bases, patches, suggestions);
    const notSkipped = actual.filter((x) => {
      return !x.skipReason;
    });

    expect(notSkipped).toEqual([]);
    expect(actual.map((x) => x.skipReason)).toEqual(
      suggestions.map(() => {
        return `previously marked resolved`;
      }),
    );
  });

  it("Multiple suggestions", () => {
    const bases = cases.flatMap((c) => c.bases);
    const patches = cases.flatMap((c) => c.patches);
    const suggestions = cases.flatMap((c) => c.suggestions);
    const actual = getSuggestions(bases, patches, []);
    expect(actual.length).toEqual(cases.length);
    expect(actual).toEqual(suggestions);
  });
});
