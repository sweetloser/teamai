import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

export function requireArgs(args, names) {
  const missing = names.filter((name) => !args[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required arguments: ${missing.map((name) => `--${name}`).join(", ")}`);
  }
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function recordsFrom(value, label) {
  if (Array.isArray(value)) return value;
  for (const key of ["records", "issues", "details", "data"]) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  throw new Error(`${label} must be an array or contain an array field`);
}

export function normalizeIssueId(value, label = "issueId") {
  const issueId = String(value ?? "").trim();
  if (!issueId) throw new Error(`${label} is required`);
  return issueId;
}

export function nonnegativeInteger(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`${label} must be a nonnegative integer, got ${JSON.stringify(value)}`);
  }
  return number;
}

export function ensureUniqueIssueIds(records, label) {
  const seen = new Set();
  for (const record of records) {
    const issueId = normalizeIssueId(record.issueId, `${label}.issueId`);
    if (seen.has(issueId)) throw new Error(`${label} contains duplicate issueId ${issueId}`);
    seen.add(issueId);
  }
}

export function mergeVersions(existingVersions, details) {
  const versions = [];
  const append = (value) => {
    String(value || "")
      .split(/\s*~\s*/)
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => {
        if (!versions.includes(item)) versions.push(item);
      });
  };
  append(existingVersions);
  for (const detail of details) append(detail.version || detail.applicationVersion);
  return versions.join(" ~ ");
}

export function escapeMarkdownInline(value) {
  return String(value ?? "-")
    .replaceAll("\\", "\\\\")
    .replaceAll("*", "\\*")
    .replaceAll("_", "\\_")
    .replaceAll("`", "'");
}

export function parseStack(rawStack) {
  const lines = String(rawStack || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const markerIndex = lines.indexOf("解析原始");
  const startIndex = markerIndex >= 0 ? markerIndex + 1 : 0;
  const frames = [];
  const trailing = [];

  for (let index = startIndex; index < lines.length; ) {
    if (/^\d+$/.test(lines[index]) && index + 2 < lines.length) {
      frames.push({
        index: lines[index],
        module: lines[index + 1],
        symbol: lines[index + 2],
      });
      index += 3;
    } else {
      trailing.push(lines[index]);
      index += 1;
    }
  }

  const rendered = frames.map(
    (frame) =>
      `- #${frame.index} **${escapeMarkdownInline(frame.module)}**：${escapeMarkdownInline(frame.symbol)}`
  );
  if (trailing.length > 0) {
    rendered.push(`- 备注：${trailing.map(escapeMarkdownInline).join(" ")}`);
  }
  return {
    frameCount: frames.length,
    markdown:
      rendered.join("\n") || "- 未解析到结构化栈帧；请打开 Bugly 原始链接查看。",
  };
}

export function calculateGroup(group, detailsById) {
  const sources = group.issueIds.map((value) => {
    const issueId = normalizeIssueId(value, "group.issueIds[]");
    const detail = detailsById.get(issueId);
    if (!detail) throw new Error(`Group ${group.title} references unknown issueId ${issueId}`);
    return detail;
  });
  const addOccurrence = sources.reduce(
    (total, source) =>
      total + nonnegativeInteger(source.addOccurrence, `#${source.issueId}.addOccurrence`),
    0
  );
  const addDevices = sources.reduce(
    (total, source) =>
      total + nonnegativeInteger(source.addDevices, `#${source.issueId}.addDevices`),
    0
  );
  const existingOccurrence = nonnegativeInteger(
    group.existingOccurrence ?? 0,
    `${group.title}.existingOccurrence`
  );
  const existingDevices = nonnegativeInteger(
    group.existingDevices ?? 0,
    `${group.title}.existingDevices`
  );
  return {
    sources,
    addOccurrence,
    addDevices,
    existingOccurrence,
    existingDevices,
    totalOccurrence: existingOccurrence + addOccurrence,
    totalDevices: existingDevices + addDevices,
    versions: mergeVersions(group.existingVersions, sources),
  };
}

export function validatePlanCoverage(details, plan) {
  const detailIds = new Set(details.map((detail) => normalizeIssueId(detail.issueId)));
  const coverage = new Map();
  const mark = (issueIdValue, location) => {
    const issueId = normalizeIssueId(issueIdValue, `${location}.issueId`);
    if (!detailIds.has(issueId)) throw new Error(`${location} references unknown issueId ${issueId}`);
    const locations = coverage.get(issueId) || [];
    locations.push(location);
    coverage.set(issueId, locations);
  };

  for (const [groupIndex, group] of (plan.groups || []).entries()) {
    if (!Array.isArray(group.issueIds) || group.issueIds.length === 0) {
      throw new Error(`groups[${groupIndex}].issueIds must be a nonempty array`);
    }
    for (const issueId of group.issueIds) mark(issueId, `groups[${groupIndex}]`);
  }
  for (const [reviewIndex, review] of (plan.manualReview || []).entries()) {
    if (!Array.isArray(review.issueIds) || review.issueIds.length === 0) {
      throw new Error(`manualReview[${reviewIndex}].issueIds must be a nonempty array`);
    }
    for (const issueId of review.issueIds) mark(issueId, `manualReview[${reviewIndex}]`);
  }

  const missing = [...detailIds].filter((issueId) => !coverage.has(issueId));
  const duplicates = [...coverage]
    .filter(([, locations]) => locations.length > 1)
    .map(([issueId, locations]) => `${issueId} (${locations.join(", ")})`);
  if (missing.length > 0 || duplicates.length > 0) {
    throw new Error(
      `Invalid plan coverage; missing=[${missing.join(", ")}], duplicates=[${duplicates.join(", ")}]`
    );
  }
  return { detailIds: [...detailIds], coverage };
}

export function printErrorAndExit(error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
