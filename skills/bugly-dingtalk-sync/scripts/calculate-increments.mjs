#!/usr/bin/env node

import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import {
  ensureUniqueIssueIds,
  nonnegativeInteger,
  normalizeIssueId,
  parseArgs,
  printErrorAndExit,
  readJson,
  recordsFrom,
  requireArgs,
  writeJson,
} from "./common.mjs";

async function findHistoryFiles(root) {
  const files = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && entry.name === "bugly_issue_details.json") files.push(path);
    }
  }
  try {
    await visit(resolve(root));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return files.sort();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  requireArgs(args, ["current", "history-root", "output"]);

  const currentPath = resolve(args.current);
  const outputPath = resolve(args.output);
  const current = recordsFrom(await readJson(currentPath), "current details");
  ensureUniqueIssueIds(current, "current details");

  const list = args.list
    ? recordsFrom(await readJson(resolve(args.list)), "issue list")
    : [];
  ensureUniqueIssueIds(list, "issue list");
  const listById = new Map(list.map((item) => [normalizeIssueId(item.issueId), item]));

  const historyById = new Map();
  const historyFiles = (await findHistoryFiles(args["history-root"])).filter(
    (path) => path !== currentPath && path !== outputPath
  );
  for (const historyPath of historyFiles) {
    let history;
    try {
      history = recordsFrom(await readJson(historyPath), historyPath);
    } catch (error) {
      throw new Error(`Failed to read history ${historyPath}: ${error.message}`);
    }
    for (const item of history) {
      const issueId = normalizeIssueId(item.issueId, `${historyPath}.issueId`);
      const occurrence = Number(item.occurrenceCount);
      const devices = Number(item.deviceCount);
      if (!Number.isInteger(occurrence) || occurrence < 0 || !Number.isInteger(devices) || devices < 0) {
        continue;
      }
      const existing = historyById.get(issueId) || {
        historicalMaxOccurrence: 0,
        historicalMaxDevice: 0,
        sourceFiles: [],
      };
      existing.historicalMaxOccurrence = Math.max(existing.historicalMaxOccurrence, occurrence);
      existing.historicalMaxDevice = Math.max(existing.historicalMaxDevice, devices);
      existing.sourceFiles.push(historyPath);
      historyById.set(issueId, existing);
    }
  }

  let manualReviewCount = 0;
  let listMismatchCount = 0;
  const enriched = current.map((item) => {
    const issueId = normalizeIssueId(item.issueId);
    const occurrenceCount = nonnegativeInteger(item.occurrenceCount, `#${issueId}.occurrenceCount`);
    const deviceCount = nonnegativeInteger(item.deviceCount, `#${issueId}.deviceCount`);
    const baseline = historyById.get(issueId);
    const listItem = listById.get(issueId);
    const listOccurrence = listItem ? Number(listItem.occurrenceCount) : null;
    const listDevices = listItem ? Number(listItem.deviceCount) : null;
    const listMismatch =
      listItem &&
      (listOccurrence !== occurrenceCount || listDevices !== deviceCount)
        ? {
            listOccurrence: Number.isFinite(listOccurrence) ? listOccurrence : null,
            listDevices: Number.isFinite(listDevices) ? listDevices : null,
            detailOccurrence: occurrenceCount,
            detailDevices: deviceCount,
          }
        : null;
    if (listMismatch) listMismatchCount += 1;

    let historicalMaxOccurrence = baseline?.historicalMaxOccurrence ?? 0;
    let historicalMaxDevice = baseline?.historicalMaxDevice ?? 0;
    let addOccurrence = 0;
    let addDevices = 0;
    let baselineStatus;
    let manualReviewReason = null;

    const detailStatus = item.detailStatus || "ok";
    if (detailStatus !== "ok") {
      baselineStatus = "detail-incomplete";
      manualReviewReason = `detailStatus=${detailStatus}`;
    } else if (baseline) {
      if (occurrenceCount < historicalMaxOccurrence || deviceCount < historicalMaxDevice) {
        baselineStatus = "counter-regressed";
        manualReviewReason =
          `Current counters ${occurrenceCount}/${deviceCount} are below history ` +
          `${historicalMaxOccurrence}/${historicalMaxDevice}`;
      } else {
        baselineStatus = "history-found";
        addOccurrence = occurrenceCount - historicalMaxOccurrence;
        addDevices = deviceCount - historicalMaxDevice;
      }
    } else if (item.alreadyTagged) {
      baselineStatus = "missing-history-tagged";
      manualReviewReason = "Issue is already tagged but no trusted local history baseline exists";
    } else {
      baselineStatus = "new-untagged";
      addOccurrence = occurrenceCount;
      addDevices = deviceCount;
    }

    if (manualReviewReason) manualReviewCount += 1;
    return {
      ...item,
      issueId,
      occurrenceCount,
      deviceCount,
      historicalMaxOccurrence,
      historicalMaxDevice,
      addOccurrence,
      addDevices,
      baselineStatus,
      listMismatch,
      manualReviewReason,
    };
  });

  await writeJson(outputPath, enriched);
  const summary = {
    currentIssues: enriched.length,
    historyFiles: historyFiles.length,
    historyMatchedIssues: enriched.filter((item) => item.baselineStatus === "history-found").length,
    newIssues: enriched.filter((item) => item.baselineStatus === "new-untagged").length,
    listMismatches: listMismatchCount,
    manualReview: manualReviewCount,
    addOccurrence: enriched.reduce((total, item) => total + item.addOccurrence, 0),
    addDevices: enriched.reduce((total, item) => total + item.addDevices, 0),
    output: outputPath,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (args.strict && manualReviewCount > 0) {
    throw new Error(`Strict mode blocked automatic sync: ${manualReviewCount} issue(s) need review`);
  }
}

main().catch(printErrorAndExit);
