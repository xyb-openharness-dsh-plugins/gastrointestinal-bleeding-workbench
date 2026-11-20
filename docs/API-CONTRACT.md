# API 合同

API 前缀：/api/<项目唯一slug>；鉴权由宿主 connection 合同处理，不因 loopback 就跳过。

| 方法/路径 | 意图 | 输入字段/类型/约束 | 成功响应 | 错误码 | 读写实体 | 幂等/事务 |
| --- | --- | --- | --- | --- | --- | --- |
| GET /health | 版本与能力 | 无 | version/apiVersion/capabilities | capability_unavailable | 无 | 只读 |

通用字段：subject/project ID、occurredAt 的时区、单位、revision、来源 ref、reviewState、request ID。列出空记录、非法输入、主体不存在、取消、并发覆盖、服务不可用的实际响应。

读模型样例和写命令样例各一份。前端未知字段如何兼容？修改何时使快照过期？本地与外部能力错误如何区分？

## 开发版 API（0.2.0-rc.1，2026-11-20）

宿主前缀：`/api/gastrointestinal-bleeding`；业务 API：`/api/gastrointestinal-bleeding/api/*`；界面：`/api/gastrointestinal-bleeding/ui/`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/health` | 版本 / apiVersion / capabilities |
| GET | `/api/bootstrap` | 版本、档案列表（含 isDemo）、dataRoot、试验快照摘要、today |
| GET/POST/DELETE | `/api/subjects` | 列表 / 新建（INSERT subjects, is_demo=0）/ 删除（demo 拒删） |
| GET | `/api/subjects/:key/records` | 整包读记录 |
| PUT | `/api/subjects/:key/records` | 整包保存（kind 必须属于八类） |
| POST | `/api/subjects/:key/entries` | 追加一条记录（返回 id） |
| GET/PUT | `/api/trial-profile?profileKey=` | 试验基础档案（只存已确认字段） |
| GET | `/api/trials?keyword=&status=&studyType=&relevantOnly=` | 快照检索（不含分数） |
| GET | `/api/trials/match?profileKey=&keyword=` | 登记字段符合度（pct / 分母 / 待确认 / 四档 / 证据链；带 honestyNote） |
| GET/POST/DELETE | `/api/saved-trials?profileKey=` | 收藏（只存登记元信息，零副作用） |
| GET/POST | `/api/root` | 当前资料目录 / 切换（客户端与服务端双重拒绝清单） |

错误一律 JSON：`{ error, detail? }`；不裸 throw 白屏。请求体上限 64KB（records 8MB 上限由服务层判）。
