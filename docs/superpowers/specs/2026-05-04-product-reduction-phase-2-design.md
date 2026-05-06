# Product Reduction Phase 2 Design

**Goal**

在不打断当前主闭环的前提下，把产品继续收敛到 `检测 / 改写 / 生成 / 误判样本 / 好样本 / 回填结果` 这条主路径。

**Current Problem**

当前系统虽然已经做过一轮信息架构收敛，但仍然保留了一批偏校准、偏运维、偏配置维护的能力。它们会继续占据代码体积、测试体积和认知负担，使主产品目标不够聚焦。

**Approved Reduction Boundary**

- 保留主闭环：
  - 内容检测
  - 合规改写
  - 生成新内容
  - 误判样本沉淀
  - 好样本沉淀
  - 平台结果回填
  - `note-records` 作为主样本存储
- 先删除低频工具和看板：
  - 基准评测
  - 模型表现看板
  - 独立风格画像工作台
  - 合集类型 / 标签配置工具
  - 旧兼容视图的显式入口
- 保留兼容 API：
  - 对外仍保留必要的兼容读写接口
  - 优先删除前端入口、主动运行能力和专属实现
  - 避免一次性打断主链路或现有数据

**Deletion Order**

1. 基准评测
2. 模型表现看板
3. 风格画像工作台
4. 合集类型 / 标签配置工具
5. 旧兼容视图的显式入口

**Phase 1 Design: Review Benchmark**

Phase 1 不再把“基准评测”视为产品能力，只保留最小兼容壳层。

- 删除内容：
  - `web/index.html` 中的 `review-benchmark-pane`
  - `web/app.js` 中的 benchmark 状态、渲染、事件、跳转、运行逻辑
  - `web/styles.css` 中 benchmark 专属样式
  - `POST /api/review-benchmark/run` 主动运行能力
  - `src/evals/review-benchmark-harness.js` 和 CLI 中对应入口
  - benchmark 专属前端 / harness 测试
- 暂时保留内容：
  - `GET /api/review-benchmark`
  - `POST /api/review-benchmark`
  - `DELETE /api/review-benchmark`
  - `data/evals/review-benchmark.json`
  - `src/review-benchmark.js` 中数据格式归一化逻辑

这样做的原因是：基准评测作为“工具”退出产品，但历史样本数据和最小兼容读写接口仍然存在，不会立即破坏外部使用和内部兼容逻辑。

**Error Handling**

- 对已经删除的 benchmark 运行能力，接口应明确返回移除状态，而不是悄悄失效。
- 如果仍有前端或测试误触发旧入口，应通过失败测试定位并清除调用点。

**Testing Strategy**

- 先改测试，证明：
  - 前端不再渲染 benchmark 面板
  - benchmark run 能力已移除
  - benchmark CRUD 兼容接口仍存在
- 再删除实现，直到相关测试通过

**Follow-up Phases**

- Phase 2: 删除模型表现看板，但保留模型调用内部记录所需的最小底层能力，直到确认生成 / 检测链路不再依赖
- Phase 3: 收掉独立风格画像工作台，把风格学习收回到“好样本驱动”
- Phase 4: 去掉合集类型 / 标签配置维护工具，退回到更轻的输入方式
- Phase 5: 收掉旧兼容视图的显式入口，只保留学习样本统一入口
