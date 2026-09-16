# Bugly 浏览器操作

## 目录

- 会话与页面确认
- 列表读取
- 详情读取
- 标签写入
- 最终验证

## 会话与页面确认

加载 `browser-use:browser` Skill 并使用内置浏览器。优先复用用户已登录的 Bugly 标签页。每次导航后用新的 DOM snapshot 确认项目名和目标 Issue ID；页面异步更新时至少等到目标内容稳定，不能从上一页残留内容取数。

不要用大范围 `body.innerText()` 探索页面。先用一次 DOM snapshot 定位列表、分页、筛选器或详情区域，再缩小读取范围。点击、输入和按键前确认 locator 唯一。

## 列表读取

1. 打开配置中的 `listUrl`。
2. 通过页面可见筛选器设置时间范围；用户提供版本时再设置版本，未提供则保持全部版本。
3. 读取当前页每条 Issue 容器，保持字段来自同一个容器，避免计数与相邻行错位。
4. 保存 Issue ID、链接、标题、摘要、关键栈、版本、设备数、发生次数、最近上报和标签。
5. 读取分页按钮并逐页处理，页面切换后重新 snapshot。
6. 检查 Issue ID 唯一性和总页数，将原始结果写入 `bugly_issue_list.json`。

如果列表计数与详情计数不一致，详情页计数优先；在最终详情中记录 `listMismatch`。

## 详情读取

逐个使用 `detailUrlTemplate` 导航：

1. 等待标题中出现目标 `#issueId`。
2. 读取发生次数和影响设备数。
3. 读取最近一次上报的应用版本、设备机型、系统版本、CPU、前后台状态、时间和上报 ID。
4. 读取异常类型、异常原因和崩溃线程。
5. 读取“出错堆栈”中全部可见栈帧；保留原始顺序，不只保存首帧。
6. 读取标签区是否存在精确文本 `已统计`。

推荐详情对象字段：

```json
{
  "issueId": "50007",
  "href": "https://bugly.qq.com/.../50007?pid=2",
  "title": "SIGTRAP",
  "summary": "-",
  "keyStack": "iot_audio -[FitCloudGCDTimer start]",
  "occurrenceCount": 2,
  "deviceCount": 2,
  "applicationVersion": "2.4.8.904",
  "deviceModel": "iPhone 14 Pro Max",
  "systemVersion": "26.5.2 (23F84)",
  "stackText": "#10 Thread\nSIGTRAP\n解析原始\n0\n...",
  "alreadyTagged": false,
  "detailStatus": "ok"
}
```

详情不存在或字段缺失时设置 `detailStatus` 为 `not_found`、`overview_only` 或 `partial`，并写明 `detailError`。

## 标签写入

只处理已成功写入或已确认纳入钉钉累计的 Issue：

1. 打开详情并确认目标 Issue ID。
2. 如果精确文本 `已统计` 已存在，记录 `already-tagged` 并跳过。
3. 点击唯一的“添加标签”。
4. 新 snapshot 确认标签输入框出现。
5. 填入 `已统计`，等待候选刷新。
6. 使用候选选择或 `ArrowDown` + `Enter` 提交。
7. 等待回显；未立即出现时重新打开同一详情复查一次，再决定是否重试。

不要在钉钉写入失败、人工核对未完成或 Issue 未纳入任何行时打标签。

## 最终验证

返回列表第一页并遍历全部分页。对每个本次范围内的 Issue，从其自身容器中检查 `已统计`。输出：

- 初始已有标签数
- 本次新增标签数
- 最终已标记数
- 未标记 Issue ID 和原因

最终保留列表第一页作为 deliverable 标签页。

