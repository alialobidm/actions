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
import { type ParsedPatchType } from "parse-git-patch";

import { Hunks } from "./hunk";
import * as NE from "./non-empty";

export type Suggestion = {
  path: string;
  description: string;
  startLine: number;
  endLine: number;
  code: string[];
  skipReason?: string;
};

export function getSuggestions(
  bases: ParsedPatchType[],
  patches: ParsedPatchType[],
  resolved: Suggestion[],
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const baseFiles = bases.flatMap((p) => p.files);

  patches.forEach((patch) => {
    patch.files.forEach((file) => {
      const baseFile = baseFiles.find((x) => x.afterName === file.afterName);

      if (!baseFile) {
        suggestions.push({
          path: file.afterName,
          description: (patch.message || "").replace(/^\[PATCH] /, ""),
          startLine: 0,
          endLine: 0,
          code: [],
          skipReason: `Restyled file ${file.afterName} was not changed in the PR`,
        });
        return;
      }

      const baseAdds = new Hunks(baseFile.modifiedLines.filter((x) => x.added));
      const dels = new Hunks(file.modifiedLines.filter((x) => !x.added));
      const adds = new Hunks(file.modifiedLines.filter((x) => x.added));

      dels.forEach((del) => {
        const line = NE.head(del).lineNumber;
        const location = `${file.afterName}:${line}`;
        const add = adds.get(line);
        const mkSkipped = (
          message: string,
          omitLineDetails?: boolean,
        ): Suggestion => {
          const lineDetails = omitLineDetails
            ? []
            : [
                `Lines   added in PR       diff: ${JSON.stringify(baseAdds.lines())}`,
                `Lines deleted in Restyled diff: ${JSON.stringify(dels.lines())}`,
                `Lines   added in Restyled diff: ${JSON.stringify(adds.lines())}`,
              ];

          const skipReason = [`[${location}] ${message}`]
            .concat(lineDetails)
            .join("\n");

          return {
            path: file.afterName,
            description: (patch.message || "").replace(/^\[PATCH] /, ""),
            startLine: NE.head(del).lineNumber,
            endLine: NE.last(del).lineNumber,
            code: [],
            skipReason,
          };
        };

        // TODO: this can suggest a removal
        if (!add) {
          suggestions.push(
            mkSkipped(
              `Restyled line did not add anything at the same location`,
            ),
          );
          return;
        }

        const suggestion: Suggestion = {
          path: file.afterName,
          description: (patch.message || "").replace(/^\[PATCH] /, ""),
          startLine: NE.head(del).lineNumber,
          endLine: NE.last(del).lineNumber,
          code: NE.toList(add).map((x) => x.line),
        };

        if (!baseAdds.contain(del)) {
          suggestions.push(
            mkSkipped(`Suggestions can only be made on added lines`),
          );
          return;
        }

        if (resolved.some((r) => isSameLocation(r, suggestion))) {
          suggestions.push(
            mkSkipped(`Suggestion already marked resolved`, true),
          );
          return;
        }

        suggestions.push(suggestion);
      });
    });
  });

  return suggestions;
}

function isSameLocation(a: Suggestion, b: Suggestion): boolean {
  return (
    a.path === b.path && a.startLine == b.startLine && a.endLine == b.endLine
  );
}
