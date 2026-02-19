# 数织 Nonogram

基于 React + TypeScript 的数织（Nonogram）逻辑拼图游戏。

## 预览

根据行列旁的数字提示，找出哪些格子需要填充，还原隐藏的图案。

## 功能

- 三种棋盘尺寸：5x5、10x10、15x15
- 16 个精心设计的预设谜题（爱心、小猫、蝴蝶、火箭等）
- 随机谜题生成（对称斑点、椭圆叠加、随机游走 + 细胞自动机平滑）
- 左键填充 / 右键标 X，支持拖拽批量操作
- 触屏支持：滑动操作、点击线索高亮行/列、粘性高亮
- 倒计时 + 错误扣时（5 秒/次）
- 生命值系统（5x5: 3 次, 10x10: 5 次, 15x15: 7 次）
- 逐条线索置灰（基于约束传播算法）
- 完成行/列自动标记空格
- 胜利弹窗展示染色图案动画
- 明暗主题切换（暖色石板 + 青绿色调）
- Web Audio API 音效（填充、标记、错误、完成行、胜利、失败）
- 棋盘尺寸持久化（localStorage）
- 首次访问引导教程
- 移动端响应式布局（动态格子尺寸）

## 技术栈

- [Vite](https://vite.dev/) 7 + [React](https://react.dev/) 19 + [TypeScript](https://www.typescriptlang.org/) 5.9
- CSS Modules（零运行时，Vite 原生支持）
- 无第三方 UI 库 / 状态管理库

## 开发

```bash
pnpm install
pnpm dev        # 启动开发服务器
pnpm build      # 构建生产版本
pnpm preview    # 预览生产构建
pnpm lint       # ESLint 检查
```

## 项目结构

```
src/
├── main.tsx                    # 入口
├── App.tsx / App.module.css    # 根组件 + 模式切换
├── index.css                   # 全局主题变量（明/暗）
├── types/index.ts              # 类型定义 + 常量
├── logic/
│   ├── clues.ts                # 线索计算 + 逐条完成检测
│   ├── check.ts                # 胜利检测
│   └── generate.ts             # 随机谜题生成
├── data/presets.ts             # 预设谜题数据
├── hooks/
│   ├── useGame.ts              # useReducer 游戏状态管理
│   ├── useTimer.ts             # 计时器
│   ├── useTheme.ts             # 明暗主题
│   └── useSoundEffects.ts      # 音效
├── context/GameContext.tsx      # React Context
├── utils/
│   ├── index.ts                # formatTime 等工具
│   └── sound.ts                # Web Audio API 音效
└── components/
    ├── Board/                  # CSS Grid 画板（线索 + 格子）
    ├── Cell/                   # 单格（填充/标X/高亮/错误动画）
    ├── ClueRow/                # 行/列线索数字
    ├── Toolbar/                # 谜题名 + 生命值 + 计时器
    ├── Timer/                  # mm:ss 计时器
    ├── PuzzleSelector/         # 尺寸 + 谜题选择
    ├── WinModal/               # 胜利弹窗 + 图案展示
    ├── GameOverModal/          # 失败弹窗（超时/错误耗尽）
    └── HelpGuide/              # 新手引导
```

## 架构要点

- **状态管理**：`useReducer` + React Context，单一 `GameState` 对象
- **线索完成检测**：约束传播算法 — 为每段连续填充区间计算可匹配的线索候选集，通过左右顺序约束迭代收敛
- **随机生成**：三种策略（对称斑点、椭圆叠加、随机游走）+ 细胞自动机平滑，按密度评分择优
- **错误处理**：填错自动标 X，标错自动填充，均扣时 + 扣命
- **响应式**：根据视口宽度动态计算格子尺寸（18px ~ 30px），确保 15x15 在手机上可玩
