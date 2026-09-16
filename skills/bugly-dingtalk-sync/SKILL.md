---
name: bugly-dingtalk-sync
description: "自动统计 Bugly 异常并同步到钉钉 AI 表格：按时间范围和可选版本读取异常列表与详情，提取设备、系统版本和完整堆栈，计算跨次同步增量，合并同类问题，累加发生次数和设备数，回写钉钉，并给已纳入统计的问题添加‘已统计’标签。Use when the user asks to 执行 Bugly 钉钉同步工作流、统计/整理 Bugly 闪退、同步异常到 Bug记录表、合并 Bugly 同类问题，或给已统计的 Bugly Issue 打标签。"
---

# Bugly 异常同步钉钉

执行可审计、可重复运行的 Bugly 到钉钉 AI 表格同步。始终先生成本地中间产物，再修改钉钉和 Bugly。

## 解析输入

提取以下参数；未提供时使用 [references/default-config.json](references/default-config.json)：

- App：默认 `声学`
- Bugly 项目：默认 `UgreenAudio / iOS`
- 时间范围：默认 `近 7 天`
- 版本：可选；未提供表示全部版本，不要擅自沿用旧任务的版本
- 钉钉表：默认 `Bug记录`
- 标签：默认 `已统计`
- 模式：用户要求“同步/回写/执行工作流”时执行写入；仅要求“分析/预览”时停在 dry-run

将产物写入当前工作区的 `bugly/processed/YYYY-MM-DD/`。不存在 `bugly/` 时创建；不要覆盖其他日期目录。

## 前置检查

1. 在浏览器操作前加载并遵守 `browser-use:browser` Skill，使用 Codex 内置浏览器的现有登录会话。
2. 确认 Bugly 页面已登录且项目为目标项目。未登录时只要求用户登录，不继续猜取数据。
3. 发现并使用钉钉 AI 表格 MCP 的等价工具：`get_fields`、`query_records`、`update_records`、`create_records`。
4. 调用 `get_fields` 核对默认字段 ID、名称和类型。字段变化时按名称重新映射，并把实际映射记录到本次产物。
5. 不在 Skill 中保存 Bugly Cookie、钉钉 MCP key、账号或令牌。

## 执行流程

### 1. 读取 Bugly 列表

按用户指定的时间范围和可选版本设置页面筛选。读取全部分页，不能只处理当前页。

为每条 Issue 保存：

- `issueId`、`href`、异常标题、摘要、关键栈
- 应用版本、发生次数、设备数、最近上报时间
- 页面是否已有 `已统计` 标签

输出 `bugly_issue_list.json`。列表读取细节见 [references/browser-procedure.md](references/browser-procedure.md)。

### 2. 读取每条详情

逐条打开详情页，等待目标 Issue ID 出现在新页面后再提取，防止异步加载拿到上一条数据。

至少保存：

- 异常类型、核心原因、崩溃线程、完整可见堆栈
- 应用版本、设备机型、系统版本、CPU、前后台状态
- 上报 ID、发生时间、上报时间

先输出 `bugly_issue_details.raw.json`。详情不可用时记录 `detailStatus` 和原因，继续其他 Issue，不伪造堆栈。

### 3. 计算跨次同步增量

以历史 `bugly/processed/*/bugly_issue_details.json` 为基线，运行：

```bash
node "$HOME/.codex/skills/bugly-dingtalk-sync/scripts/calculate-increments.mjs" \
  --current bugly/processed/YYYY-MM-DD/bugly_issue_details.raw.json \
  --list bugly/processed/YYYY-MM-DD/bugly_issue_list.json \
  --history-root bugly/processed \
  --output bugly/processed/YYYY-MM-DD/bugly_issue_details.json \
  --strict
```

以详情页计数为权威值。列表与详情错位时记录 `listMismatch`，不得使用错位列表值累加。

增量公式：

```text
发生次数增量 = max(0, 当前详情发生次数 - 历史详情最大发生次数)
设备数增量   = max(0, 当前详情设备数 - 历史详情最大设备数)
```

禁止把近 7 天重叠窗口的当前总数再次全量相加。缺少可信历史、计数回退或字段异常时进入人工核对，不自动累加。

### 4. 读取钉钉现有记录

按 App 选项过滤并读取目标表全部现有记录。至少获取标题、相关链接、详细描述、版本、发生次数、设备数、系统版本和设备机型。

输出 `dingtalk_existing_records.json`。不要依赖旧任务中记住的计数；每次写入前都读取当前值。

对 `baselineStatus=new-untagged` 的 Issue，额外搜索钉钉的相关链接和详细描述。若同一 Issue ID 已出现，说明可能是历史产物丢失或标签失败；不要把当前总数作为新增量，转入人工核对，除非能恢复可信历史基线。

### 5. 判断同类问题

读取 [references/classification.md](references/classification.md)，根据完整详情生成根因指纹。优先级：

1. SDK/业务模块 + 崩溃函数或首个业务栈
2. 异常类型 + 核心错误信息
3. RN/Hermes 的稳定错误核心
4. 现有钉钉行的标题、相关链接和描述中的历史来源

跨版本允许合并，但只在根因指纹一致时合并。仅同为 `SIGSEGV`、`SIGABRT` 或 `SIGTRAP` 不构成同类。

在创建计划前，把“已在钉钉出现但本地无历史基线”的 Issue 放入 `manualReview`；它不能进入 update/create 组。

创建 `dedupe_plan.json`，数据契约见 [references/data-contracts.md](references/data-contracts.md)。无法确定时放入 `manualReview`，不要硬并。

### 6. 生成 dry-run 载荷

运行：

```bash
node "$HOME/.codex/skills/bugly-dingtalk-sync/scripts/build-payloads.mjs" \
  --details bugly/processed/YYYY-MM-DD/bugly_issue_details.json \
  --plan bugly/processed/YYYY-MM-DD/dedupe_plan.json \
  --output-dir bugly/processed/YYYY-MM-DD
```

脚本生成：

- `bugly_dedupe_result.json`
- `dingtalk_update_records.json`
- `dingtalk_create_records.json`
- `manual_review_items.json`

再运行：

```bash
node "$HOME/.codex/skills/bugly-dingtalk-sync/scripts/validate-payloads.mjs" \
  --details bugly/processed/YYYY-MM-DD/bugly_issue_details.json \
  --plan bugly/processed/YYYY-MM-DD/dedupe_plan.json \
  --output-dir bugly/processed/YYYY-MM-DD
```

只有校验通过才能写入。特别检查每个 Issue 恰好出现一次、累计值等于旧值加增量、富文本包含“合并来源 / 异常摘要 / 调用栈”。

### 7. 回写钉钉

若为 dry-run，到此停止并报告预览结果。

实际同步时：

1. 使用 `update_records` 更新已有根因行；长富文本按每批最多 5 行提交。
2. 使用 `create_records` 新增不存在的根因行。
3. 任一批失败时停止后续写入，保留已成功批次和待处理载荷，不声称全部成功。
4. 写入后按返回的 record ID 精确反查所有涉及行。
5. 校验标题、发生次数、设备数、版本以及富文本三个章节；发现偏差时先修正钉钉，再进行标签操作。

不要自动删除已有钉钉行。发现历史重复行时选定 canonical 行并放入人工核对；只有用户明确要求删除时才执行删除。

### 8. 添加 Bugly 标签

仅在对应问题已成功写入或确认早已纳入钉钉累计后添加 `已统计`。钉钉写入失败或问题仍在人工核对时不得添加标签。

逐条跳过已有标签；对未标记项执行“添加标签 → 输入 `已统计` → 选择并提交”。标签可能延迟回显，先重新打开详情复查，再决定是否重试。

最后重新读取所有列表分页，验证本次已纳入统计的 Issue 全部显示标签。输出 `bugly_tag_results.json`。

### 9. 输出与收尾

生成 `sync_summary.md`，包含：

- 输入范围和可选版本
- Issue 数、根因组数、更新行数、新增行数、人工核对数
- 本次发生次数和设备数增量
- 新增根因及主要合并结果
- 钉钉反查结果、标签覆盖结果和任何异常数据说明

输出 `dingtalk_update_result.json` 与 `dingtalk_create_result.json`。校验所有 JSON 可解析。浏览器最终保留在 Bugly 列表第一页。

## 完成标准

仅在以下条件全部满足时报告同步完成：

- 用户指定范围内的全部列表分页和详情已读取，或失败原因已逐条记录
- 每个 Issue 恰好属于一个合并组或人工核对项
- 钉钉写入结果已按 record ID 反查，计数无偏差
- 已成功统计的 Bugly Issue 标签无遗漏
- 本地 dry-run、结果 JSON 和摘要均已保存并通过校验

任何一步未满足时明确报告部分完成和剩余项，不用“已完成”掩盖缺口。
