#!/usr/bin/env node

import { resolve } from "node:path";
import {
  calculateGroup,
  ensureUniqueIssueIds,
  escapeMarkdownInline,
  nonnegativeInteger,
  normalizeIssueId,
  parseArgs,
  parseStack,
  printErrorAndExit,
  readJson,
  recordsFrom,
  requireArgs,
  validatePlanCoverage,
  writeJson,
} from "./common.mjs";

const defaultConfigPath = new URL("../references/default-config.json", import.meta.url);

function requireText(value, label) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} is required`);
  return text;
}

function validateGroups(groups, detailsById) {
  const updateRecordIds = new Set();
  for (const [index, group] of groups.entries()) {
    const prefix = `groups[${index}]`;
    group.title = requireText(group.title, `${prefix}.title`);
    group.reason = requireText(group.reason, `${prefix}.reason`);
    if (!["update", "create", "noop"].includes(group.action)) {
      throw new Error(`${prefix}.action must be update, create, or noop`);
    }
    if (group.action === "update" || group.action === "noop") {
      group.recordId = requireText(group.recordId, `${prefix}.recordId`);
    }
    if (group.action === "create" && group.recordId) {
      throw new Error(`${prefix}.recordId must be omitted for create`);
    }

    const calculated = calculateGroup(group, detailsById);
    for (const detail of calculated.sources) {
      if (detail.manualReviewReason) {
        throw new Error(
          `${prefix} contains #${detail.issueId}, which needs review: ${detail.manualReviewReason}`
        );
      }
    }
    if (group.action === "create" && (calculated.existingOccurrence !== 0 || calculated.existingDevices !== 0)) {
      throw new Error(`${prefix} create group must have zero existing counters`);
    }
    if (group.action === "noop" && (calculated.addOccurrence !== 0 || calculated.addDevices !== 0)) {
      throw new Error(`${prefix} noop group contains nonzero increments`);
    }
    if (group.action === "update" && calculated.addOccurrence === 0 && calculated.addDevices === 0) {
      throw new Error(`${prefix} has zero increments; use noop to avoid an unnecessary write`);
    }
    if (group.action === "update") {
      if (updateRecordIds.has(group.recordId)) {
        throw new Error(`${prefix} duplicates update recordId ${group.recordId}; merge these groups first`);
      }
      updateRecordIds.add(group.recordId);
    }
  }
}

function buildDescription(group, calculated) {
  const sourceLines = calculated.sources
    .map(
      (source) =>
        `- [#${source.issueId} ${escapeMarkdownInline(source.title)}](${source.href})：` +
        `当前 ${source.occurrenceCount} 次 / ${source.deviceCount} 台；` +
        `历史基线 ${source.historicalMaxOccurrence} / ${source.historicalMaxDevice}；` +
        `本次增量 +${source.addOccurrence} / +${source.addDevices}；` +
        `App ${escapeMarkdownInline(source.version || source.applicationVersion)}；` +
        `设备 ${escapeMarkdownInline(source.deviceModel)}；` +
        `系统 ${escapeMarkdownInline(source.systemVersion)}`
    )
    .join("\n");
  const summaries = calculated.sources
    .map(
      (source) =>
        `### #${source.issueId}\n` +
        `- 异常类型：${escapeMarkdownInline(source.title)}\n` +
        `- 异常原因：${escapeMarkdownInline(source.summary || source.exceptionMessage)}\n` +
        `- 崩溃线程：${escapeMarkdownInline(String(source.stackText || "").split("\n")[0] || "-")}\n` +
        `- 关键栈：${escapeMarkdownInline(source.keyStack)}`
    )
    .join("\n\n");
  const stacks = calculated.sources
    .map((source) => {
      const parsed = parseStack(source.stackText);
      return `### #${source.issueId}（${parsed.frameCount} 帧）\n${parsed.markdown}`;
    })
    .join("\n\n");

  return (
    `**${group.title}**\n\n` +
    `同步时间：${new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" })}\n\n` +
    `回写方式：${group.action === "update" ? "合并到已有行并按增量累加" : "新增同类问题行"}\n\n` +
    `本次新增发生次数：${calculated.addOccurrence}\n\n` +
    `本次新增影响设备数：${calculated.addDevices}\n\n` +
    `合并后发生次数：${calculated.totalOccurrence}\n\n` +
    `合并后影响设备数：${calculated.totalDevices}\n\n` +
    `## 合并来源\n\n${sourceLines}\n\n` +
    `## 异常摘要\n\n${summaries}\n\n` +
    `- 合并依据：${escapeMarkdownInline(group.reason)}\n\n` +
    `## 调用栈\n\n${stacks}`
  );
}

function representativeSource(sources) {
  return [...sources].sort(
    (left, right) =>
      nonnegativeInteger(right.addOccurrence, `#${right.issueId}.addOccurrence`) -
        nonnegativeInteger(left.addOccurrence, `#${left.issueId}.addOccurrence`) ||
      nonnegativeInteger(right.addDevices, `#${right.issueId}.addDevices`) -
        nonnegativeInteger(left.addDevices, `#${left.issueId}.addDevices`) ||
      nonnegativeInteger(right.occurrenceCount, `#${right.issueId}.occurrenceCount`) -
        nonnegativeInteger(left.occurrenceCount, `#${left.issueId}.occurrenceCount`)
  )[0];
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
  if (!Array.isArray(plan.groups)) throw new Error("plan.groups must be an array");
  if (plan.manualReview != null && !Array.isArray(plan.manualReview)) {
    throw new Error("plan.manualReview must be an array when present");
  }
  plan.manualReview ||= [];
  validatePlanCoverage(details, plan);
  validateGroups(plan.groups, detailsById);

  const config = await readJson(args.config ? resolve(args.config) : defaultConfigPath);
  const fields = config.dingtalk?.fields;
  if (!fields) throw new Error("Config is missing dingtalk.fields");
  const app = config.app;
  if (!app?.name || !app?.optionId) throw new Error("Config is missing app name/optionId");

  const result = [];
  const updateRecords = [];
  const createRecords = [];
  for (const group of plan.groups) {
    const calculated = calculateGroup(group, detailsById);
    const item = {
      action: group.action,
      ...(group.recordId ? { recordId: group.recordId } : {}),
      title: group.title,
      issueIds: group.issueIds.map((value) => normalizeIssueId(value)),
      addOccurrence: calculated.addOccurrence,
      addDevices: calculated.addDevices,
      totalOccurrence: calculated.totalOccurrence,
      totalDevices: calculated.totalDevices,
      versions: calculated.versions,
      reason: group.reason,
    };
    result.push(item);
    if (group.action === "noop") continue;

    const representative = representativeSource(calculated.sources);
    const cells = {
      [fields.title]: group.title,
      [fields.description]: { markdown: buildDescription(group, calculated) },
      [fields.version]: calculated.versions,
      [fields.occurrenceCount]: calculated.totalOccurrence,
      [fields.deviceCount]: calculated.totalDevices,
      [fields.systemVersion]: representative.systemVersion || "-",
      [fields.deviceModel]: representative.deviceModel || "-",
    };
    if (group.action === "update") {
      updateRecords.push({ recordId: group.recordId, cells });
    } else {
      cells[fields.app] = { id: app.optionId, name: app.name };
      cells[fields.relatedLink] = {
        text: `#${representative.issueId} ${representative.title}`,
        link: requireText(representative.href, `#${representative.issueId}.href`),
      };
      createRecords.push({ cells });
    }
  }

  const outputDir = resolve(args["output-dir"]);
  await writeJson(resolve(outputDir, "bugly_dedupe_result.json"), result);
  await writeJson(resolve(outputDir, "dingtalk_update_records.json"), updateRecords);
  await writeJson(resolve(outputDir, "dingtalk_create_records.json"), createRecords);
  await writeJson(resolve(outputDir, "manual_review_items.json"), plan.manualReview);

  console.log(
    JSON.stringify(
      {
        issues: details.length,
        groups: plan.groups.length,
        updates: updateRecords.length,
        creates: createRecords.length,
        noops: result.filter((item) => item.action === "noop").length,
        manualReview: plan.manualReview.length,
        addOccurrence: result.reduce((total, item) => total + item.addOccurrence, 0),
        addDevices: result.reduce((total, item) => total + item.addDevices, 0),
        outputDir,
      },
      null,
      2
    )
  );
}

main().catch(printErrorAndExit);
