# 数据契约

## 目录

- 增量详情
- 去重计划
- 生成产物
- 钉钉字段值

## 增量详情

`calculate-increments.mjs` 在原始详情字段上增加：

```json
{
  "historicalMaxOccurrence": 53,
  "historicalMaxDevice": 48,
  "addOccurrence": 1,
  "addDevices": 1,
  "baselineStatus": "history-found",
  "listMismatch": null,
  "manualReviewReason": null
}
```

`baselineStatus` 取值：

- `history-found`：找到可信历史详情
- `new-untagged`：无历史且当前未标记；仅在钉钉也不存在该 Issue ID 时，才可作为新 Issue 使用当前总数
- `missing-history-tagged`：已标记但无历史，不能自动推导增量
- `counter-regressed`：当前计数小于历史最大值

## 去重计划

创建 `dedupe_plan.json`：

```json
{
  "groups": [
    {
      "action": "update",
      "recordId": "record-id",
      "title": "SparkChain SDK崩溃",
      "issueIds": ["34043", "39002"],
      "existingOccurrence": 79,
      "existingDevices": 22,
      "existingVersions": "2.4.8.904 ~ 2.4.7.881",
      "reason": "同一 SDK 退出析构生命周期"
    },
    {
      "action": "create",
      "title": "新根因",
      "issueIds": ["50007"],
      "existingOccurrence": 0,
      "existingDevices": 0,
      "existingVersions": "",
      "reason": "稳定根因指纹"
    },
    {
      "action": "noop",
      "recordId": "record-id",
      "title": "已统计且零增量的问题",
      "issueIds": ["45009"],
      "existingOccurrence": 27,
      "existingDevices": 26,
      "existingVersions": "2.4.8.904",
      "reason": "当前累计未超过历史快照"
    }
  ],
  "manualReview": [
    {
      "issueIds": ["51099"],
      "reason": "详情缺失，无法确认根因"
    }
  ]
}
```

规则：

- `action` 只能是 `update`、`create` 或 `noop`。
- `update` 必须有 `recordId` 和钉钉当前累计值。
- `create` 的旧累计必须为 0。
- `noop` 表示已被某个现有行覆盖但没有要写入的增量。
- 每个详情 Issue 必须且只能出现在一个 group 或一个 manualReview 项中。

## 生成产物

`build-payloads.mjs` 生成：

- `bugly_dedupe_result.json`：每组动作、增量、最终累计和版本
- `dingtalk_update_records.json`：可直接传给 `update_records` 的 records
- `dingtalk_create_records.json`：可直接传给 `create_records` 的 records
- `manual_review_items.json`：禁止自动写入或打标签的项

详细描述使用 richText markdown，固定包含：

```markdown
## 合并来源
## 异常摘要
## 调用栈
```

不使用 fenced code block，避免钉钉富文本转换影响可读性。

## 钉钉字段值

- text：字符串
- number：JSON 数字，不传数字字符串
- richText：`{"markdown":"..."}`
- url：`{"text":"#50007 SIGTRAP","link":"https://..."}`
- singleSelect：`{"id":"a5fAUeTCCz","name":"声学"}`
