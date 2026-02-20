# 移动端性能问题分析

## 问题概述

用户反馈在移动端存在以下问题：
1. **加载卡顿** - 初始加载时感觉迟缓
2. **滑动输入卡顿** - 触摸滑动时响应不流畅
3. **点选卡顿** - 点击单元格时有延迟
4. **画布布局超出边界** - 棋盘在某些情况下超出屏幕

---

## 问题分析

### 1. 加载卡顿

**可能原因：**
- CSS 动画在页面加载时触发（[`pageIn`](src/App.module.css:191)、[`boardIn`](src/App.module.css:202)）
- 大量 Cell 组件同时渲染（15×15 = 225 个 Cell + ClueRow）
- ResizeObserver 初始化和测量

**代码位置：**
- [`Board.tsx:33-45`](src/components/Board/Board.tsx:33) - ResizeObserver 设置
- [`App.module.css:10`](src/App.module.css:10) - `animation: pageIn 0.5s`
- [`App.module.css:94`](src/App.module.css:94) - `animation: boardIn 0.4s`

### 2. 滑动输入卡顿

**已有优化（做得不错）：**
- [`Board.tsx:56-104`](src/components/Board/Board.tsx:56) - 使用 DOM classList 直接操作而非 React state 来处理 hover 高亮
- [`Board.tsx:230-244`](src/components/Board/Board.tsx:230) - `handleTouchMove` 使用 `document.elementFromPoint` 获取触摸位置

**潜在问题：**
1. **`document.elementFromPoint` 性能** - 每次 touchmove 都调用，在低端设备上可能成为瓶颈
2. **`querySelectorAll` 频繁调用** - [`applyHoverDOM`](src/components/Board/Board.tsx:63) 中每次 hover 变化都执行多次 DOM 查询
3. **每个 Cell 都有独立的事件处理器** - 虽然使用了 `memo`，但 225 个 Cell 各自绑定 `onMouseDown`、`onMouseEnter`

**代码位置：**
- [`Cell.tsx:49-53`](src/components/Cell/Cell.tsx:49) - 每个 Cell 绑定事件
- [`Board.tsx:63-104`](src/components/Board/Board.tsx:63) - `applyHoverDOM` 使用 querySelectorAll

### 3. 点选卡顿

**潜在问题：**
1. **每次点击触发 reducer dispatch** - 导致整个 Board 重新渲染
2. **`useMemo` 计算量大** - [`rowClueCompletion`](src/components/Board/Board.tsx:278)、[`colClueCompletion`](src/components/Board/Board.tsx:283) 等在每次 board 变化时重新计算
3. **Cell 的 `hasError` 检查** - 使用 `Set.has()` 字符串拼接 `${r},${c}`

**代码位置：**
- [`useGame.ts:65-178`](src/hooks/useGame.ts:65) - reducer 每次返回新的 board 数组
- [`Board.tsx:278-308`](src/components/Board/Board.tsx:278) - 多个 useMemo 计算

### 4. 画布布局超出边界

**问题分析：**
- [`Board.tsx:47-51`](src/components/Board/Board.tsx:47) - `cellSize` 计算逻辑
- 计算公式：`fit = Math.floor((availableWidth - clueWidth) / cols)`
- 问题：**没有考虑列提示区域的高度和整体高度限制**

**具体问题：**
1. 只考虑了宽度适配，没有考虑高度
2. `maxColClueLen` 可能很大，导致顶部提示区域占用过多空间
3. 移动端横屏/竖屏切换时可能出现问题

**代码位置：**
- [`Board.module.css:10`](src/components/Board/Board.module.css:10) - `width: fit-content` 但没有 max-width
- [`App.module.css:89-96`](src/App.module.css:89) - `.boardWrapper` 设置了 `overflow: hidden` 但可能不够

---

## 关于「是否应该用 React」的问题

### 结论：React 可以用，但需要优化策略

**React 的优势（在这个项目中）：**
1. 组件化结构清晰，易于维护
2. Context + useReducer 的状态管理模式合理
3. `memo` 可以有效减少不必要的重渲染

**React 的劣势（在这个场景中）：**
1. **细粒度更新困难** - 每次状态变化都会触发组件树的 reconciliation
2. **事件委托不够彻底** - 每个 Cell 都有独立的事件处理器
3. **虚拟 DOM 开销** - 对于 225+ 个简单元素，虚拟 DOM diff 的开销可能超过直接 DOM 操作

### 替代方案对比

| 方案 | 优点 | 缺点 |
|------|------|------|
| **Canvas 2D** | 极高性能，单一绘制表面 | 失去 DOM 语义，需要自己处理点击检测 |
| **SVG** | 保留 DOM 语义，可 CSS 样式 | 大量元素时性能不如 Canvas |
| **原生 DOM + 事件委托** | 直接控制，无框架开销 | 状态管理复杂，代码组织困难 |
| **React + 优化** | 保持现有架构，渐进式改进 | 有性能上限 |

### 推荐方案

**保持 React，但进行以下优化：**

1. **事件委托** - 将 Cell 的事件处理移到 Board 层级，通过 `data-*` 属性识别目标
2. **减少重渲染** - 使用 `useSyncExternalStore` 或细粒度订阅
3. **Canvas 混合方案** - 将棋盘格子用 Canvas 渲染，UI 控件保持 React
4. **虚拟化** - 对于超大棋盘（如果未来支持），考虑只渲染可见区域

---

## 优化建议清单

### 高优先级（立即可做）

- [ ] **事件委托优化** - Board 层级统一处理 mouse/touch 事件
- [ ] **移除 Cell 级别的事件绑定** - 减少 225 个事件监听器
- [ ] **优化 `applyHoverDOM`** - 缓存 DOM 引用，避免重复 querySelectorAll
- [ ] **修复布局溢出** - 添加高度计算和 max-height 限制

### 中优先级（效果明显）

- [ ] **使用 CSS `contain` 属性** - 限制重绘范围
- [ ] **减少 CSS 动画** - 移动端禁用或简化入场动画
- [ ] **优化 clue 计算** - 增量更新而非全量重算
- [ ] **使用 `will-change`** - 提示浏览器优化特定属性

### 低优先级（长期改进）

- [ ] **Canvas 渲染棋盘** - 彻底解决大棋盘性能问题
- [ ] **Web Worker 计算** - 将 clue 计算移到 Worker
- [ ] **Service Worker 缓存** - 改善加载性能

---

## 总结

1. **问题是否清楚？** - 是的，主要问题集中在：
   - 事件处理粒度过细（每个 Cell 独立绑定）
   - DOM 查询过于频繁（hover 高亮）
   - 布局计算只考虑宽度未考虑高度
   - CSS 动画在移动端的开销

2. **是否应该用 React？** - **可以继续用 React**，但需要：
   - 采用事件委托模式
   - 减少不必要的重渲染
   - 考虑 Canvas 混合方案用于棋盘渲染
   - 这不是 React 本身的问题，而是使用方式的问题

当前代码已经做了一些优化（如 hover 的 DOM 直接操作），说明开发者意识到了性能问题。继续沿着这个方向优化是合理的选择。
