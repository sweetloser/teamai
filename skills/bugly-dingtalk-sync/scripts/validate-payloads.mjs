#!/usr/bin/env node

import { resolve } from "node:path";
import {
  calculateGroup,
  ensureUniqueIssueIds,
  normalizeIssueId,
  parseArgs,
  printErrorAndExit,
  readJson,
  recordsFrom,
  requireArgs,
  validatePlanCoverage,
} from "./common.mjs";

const defaultConfigPath = new URL("../references/default-config.json", import.meta.url);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertDescription(markdown, label) {
  assert(typeof markdown === "string" && markdown.length > 0, `${label} markdown is empty`);
  for (const heading of ["## 合并来源", "## 异常摘要", "## 调用栈"]) {
    assert(markdown.includes(heading), `${label} is missing ${heading}`);
  }
  assert(!markdown.includes("```"), `${label} must not contain fenced code blocks`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  requireArgs(args, ["details", "plan", "output-dir"]);

  const details = recordsFrom(await readJson(resolve(args.details)), "details");
  ensureUniqueIssueIds(details, "details");
  const detailsById = new Map(
    details.map((detail) => [normalizeIssueId(detail.issueId), detail])
  );
  const plan = await readJson(resolve(args.plan));
  plan.manualReview ||= [];
  validatePlanCoverage(details, plan);

  const config = await readJson(args.config ? resolve(args.config) : defaultConfigPath);
  const fields = config.dingtalk.fields;
  const outputDir = resolve(args["output-dir"]);
  const result = recordsFrom(
    await readJson(resolve(outputDir, "bugly_dedupe_result.json")),
    "dedupe result"
  );
  const updates = recordsFrom(
    await readJson(resolve(outputDir, "dingtalk_update_records.json")),
    "update payload"
  );
  const creates = recordsFrom(
    await readJson(resolve(outputDir, "dingtalk_create_records.json")),
    "create payload"
  );
  const manualReview = recordsFrom(
    await readJson(resolve(outputDir, "manual_review_items.json")),
    "manual review"
  );

  assert(result.length === plan.groups.length, "Dedupe result group count does not match plan");
  assert(
    updates.length === plan.groups.filter((group) => group.action === "update").length,
    "Update payload count does not match plan"
  );
  assert(
    creates.length === plan.groups.filter((group) => group.action === "create").length,
    "Create payload count does not match plan"
  );
  assert(manualReview.length === plan.manualReview.length, "Manual review count does not match plan");

  const resultByKey = new Map(
    result.map((item) => [`${item.action}:${item.recordId || item.title}`, item])
  );
  const updateByRecordId = new Map(updates.map((item) => [item.recordId, item]));
  assert(updateByRecordId.size === updates.length, "Update payload contains duplicate record IDs");
  const createByTitle = new Map(creates.map((item) => [item.cells[fields.title], item]));
  assert(createByTitle.size === creates.length, "Create payload contains duplicate titles");

  for (const [index, group] of plan.groups.entries()) {
    const calculated = calculateGroup(group, detailsById);
    const key = `${group.action}:${group.recordId || group.title}`;
    const item = resultByKey.get(key);
    assert(item, `Missing dedupe result for groups[${index}]`);
    assert(item.addOccurrence === calculated.addOccurrence, `${key} addOccurrence mismatch`);
    assert(item.addDevices === calculated.addDevices, `${key} addDevices mismatch`);
    assert(item.totalOccurrence === calculated.totalOccurrence, `${key} totalOccurrence mismatch`);
    assert(item.totalDevices === calculated.totalDevices, `${key} totalDevices mismatch`);
    assert(item.versions === calculated.versions, `${key} versions mismatch`);

    if (group.action === "noop") {
      assert(calculated.addOccurrence === 0 && calculated.addDevices === 0, `${key} noop has increments`);
      continue;
    }
    const payload =
      group.action === "update"
        ? updateByRecordId.get(group.recordId)
        : createByTitle.get(group.title);
    assert(payload, `Missing ${group.action} payload for ${key}`);
    const cells = payload.cells;
    assert(typeof cells[fields.occurrenceCount] === "number", `${key} occurrence count is not numeric`);
    assert(typeof cells[fields.deviceCount] === "number", `${key} device count is not numeric`);
    assert(cells[fields.occurrenceCount] === calculated.totalOccurrence, `${key} occurrence payload mismatch`);
    assert(cells[fields.deviceCount] === calculated.totalDevices, `${key} device payload mismatch`);
    assert(cells[fields.version] === calculated.versions, `${key} version payload mismatch`);
    assertDescription(cells[fields.description]?.markdown, key);
    for (const source of calculated.sources) {
      assert(
        cells[fields.description].markdown.includes(`#${source.issueId}`),
        `${key} description omits source #${source.issueId}`
      );
    }
    if (group.action === "create") {
      assert(cells[fields.app]?.id === config.app.optionId, `${key} App option mismatch`);
      assert(
        String(cells[fields.relatedLink]?.link || "").startsWith("https://bugly.qq.com/"),
        `${key} related link is invalid`
      );
    }
  }

  const summary = {
    status: "valid",
    issues: details.length,
    groups: result.length,
    updates: updates.length,
    creates: creates.length,
    noops: result.filter((item) => item.action === "noop").length,
    manualReview: manualReview.length,
  };
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(printErrorAndExit);
