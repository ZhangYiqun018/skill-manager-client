# 二、Rust 后端与 Tauri 命令

## 总体评价

后端已完成从 God file 到模块化的重构：lib.rs 从 ~470 行缩减为 ~80 行入口，38 个命令分布在 6 个模块（adopt, custom_target, import, scan, skill, target）+ utils 模块。数据模型设计良好（571 行 models.rs），类型安全的枚举和序列化。**架构评分 9/10，但错误处理和安全性仍需改进。**

## 1. 模块组织 ✅ 优秀

- `lib.rs` (80行): 干净的入口，38 个命令通过 `generate_handler!` 宏注册
- `commands/mod.rs`: 6 个聚焦模块
  - `adopt.rs` (89行) — 技能采纳操作
  - `custom_target.rs` (70行) — 自定义安装目标 CRUD
  - `import.rs` (120行) — 注册表/Git 导入
  - `scan.rs` (61行) — 本地扫描与索引
  - `skill.rs` (349行) — 托管技能操作（最大的模块）
  - `target.rs` (62行) — 安装目标操作
- `utils.rs` (207行): 工具函数

**评价**: 现代化、可维护的 Rust 结构。每个命令模块单一职责。

## 2. 严重问题

### 2.1 启发式错误分类脆弱且不可靠

**严重性**: CRITICAL
**文件**: `utils.rs:162-180`

`error_chain()` 函数通过子字符串匹配对小写错误消息进行分类：

```rust
if lower.contains("network") || lower.contains("request") || lower.contains("http") {
    AppError::network(message)
} else if lower.contains("not found") || lower.contains("no such file") {
    AppError::not_found(message)
}
```

**问题**:
- 顺序依赖：消息 "Request timeout from network service" 会匹配 "request" 而非 "timeout"
- 库错误消息格式不统一（rusqlite vs std::io vs reqwest）
- 类型信息丢失：IndexError 的结构化变体（Sql/Io/Message）被降级为字符串
- 误报风险：技能名称包含关键词时可能触发错误分类

**建议**: 为 `IndexError` 实现 `From<IndexError> for AppError`，对 `std::io::Error` 直接检查 `kind()` 而非消息文本。

### 2.2 IndexError → AppError 转换丢失类型信息

**严重性**: CRITICAL
**影响范围**: scan.rs, adopt.rs, skill.rs, target.rs, custom_target.rs 中所有使用 `.map_err(error_chain)` 的地方（~40处）

`load_skill_index_core()` 返回 `Result<_, IndexError>`，但 `.map_err(error_chain)` 先调用 `Display` 转字符串，再启发式分类回 AppError。结构化的 Sql/Io/Message 变体在此过程中全部丢失。

**建议**: 在 core crate 中实现:
```rust
impl From<IndexError> for AppError {
    fn from(error: IndexError) -> Self {
        match error {
            IndexError::Sql(e) => AppError { kind: Unknown, message: format!("数据库错误: {}", e) },
            IndexError::Io(e) => match e.kind() {
                NotFound => AppError::not_found(e.to_string()),
                PermissionDenied => AppError::permission_denied(e.to_string()),
                _ => AppError::io(e.to_string()),
            },
            IndexError::Message(msg) => AppError::unknown(msg),
        }
    }
}
```

### 2.3 网络请求无响应大小限制

**严重性**: CRITICAL
**文件**: `import.rs:75-84`

`search_skills_registry()` 中 `response.json::<RegistrySearchResponse>()` 没有检查 Content-Length。恶意注册表端点可发送超大响应导致内存耗尽。

**建议**: 在解析前检查 `content_length()`，限制 10MB，并设置 30 秒超时。

## 3. 高优先级问题

### 3.1 hash_skill_directory 中 follow_links(true) 可能泄露系统文件

**严重性**: HIGH
**文件**: `scan.rs:189-191, 330`

`WalkDir::new(skill_dir).follow_links(true)` 会跟踪符号链接进入外部目录。如果技能目录包含指向 `/etc` 的符号链接，哈希将包含系统文件内容。

**建议**: 改为 `follow_links(false)`，对符号链接目标进行 `starts_with(skill_dir)` 验证。

### 3.2 命令处理器中缺少错误日志

**严重性**: HIGH
**影响范围**: 所有 ~30 个命令

大多数命令记录操作开始但不记录失败。错误仅返回给前端，不写入日志。生产环境无法排查问题。

**建议**: 创建 `log_and_map_error()` 辅助函数，在 `.map_err()` 中同时记录 `tracing::error!` 和转换错误。

## 4. 中等优先级问题

### 4.1 命令间路径验证不一致

**文件**: `custom_target.rs`

- `open_in_finder()`: 验证路径 ✓
- `list_custom_targets()`: 不验证 project_root（前缀 `_scan_options`）⚠️
- `add_custom_target()`: 不验证目标路径 ⚠️

**建议**: 统一验证策略，对不需要验证的情况添加文档注释说明安全模型。

### 4.2 CSP 已禁用

**文件**: `tauri.conf.json:24` — `"csp": null`

如果前端渲染用户生成的内容（如 SKILL.md 中的 HTML），可能成为 XSS 向量。

**建议**: 启用限制性 CSP: `"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"`。

### 4.3 无数据缓存

每次调用 `load_skill_index()` 都读取 SQLite 数据库。用户在页面间切换时可能每秒调用多次。

**建议**: 添加带 TTL 的内存缓存（`lazy_static` + `Mutex<Option<CachedData>>`），5 秒过期。

## 5. 低优先级问题

### 5.1 scan.rs:49 — load_runtime_settings 是同步的

与其他异步命令不一致。虽然目前只做纯计算，但如果未来需要 I/O 操作会阻塞主线程。

## 6. 模型设计 ✅ 良好

- `models.rs` (571行): 全面且结构良好
- 类型安全枚举: AgentKind, SkillScope, SkillSourceType, InstallMethod 都有 `as_key()`/`from_key()` 转换
- 健康状态枚举: InstallHealthState, InstallTargetHealthState 正确建模操作状态
- 版本支持: ManagedVariantHistory, RemoteUpdateCheck 处理技能变体

## 7. 总结

| 领域 | 评分 | 状态 |
|------|------|------|
| 模块组织 | 9/10 | ✅ 优秀 |
| 数据模型 | 9/10 | ✅ 优秀 |
| API 设计 | 8/10 | ✅ 良好 |
| 代码质量 | 8/10 | ✅ 良好 |
| 性能(异步) | 7/10 | ✅ 良好 |
| 错误处理 | 5/10 | ⚠️ 需改进 |
| 安全性 | 6/10 | ⚠️ 需改进 |
| 日志/可观测性 | 4/10 | ⚠️ 不足 |
| 缓存 | 3/10 | ⚠️ 未实现 |
