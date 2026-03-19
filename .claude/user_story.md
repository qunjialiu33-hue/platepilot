# Minimum Controllable Story (MVS)

## Story Theme
从"面对美食的犹豫与焦虑"到"一眼看清真相并获得掌控感"

## Core Sequence
1. Perception: 打开App直接是全屏相机界面，无登录无欢迎页
2. Action: 只有一个"审计"按钮，一键拍照
3. Feedback: 
   - 大号评分（65分，黄色警告）
   - 原图叠加AR标记（红框=超标，绿框=完美）
   - 行动指令（移走1/3米饭约3勺）
4. Meaning Closure: 用户执行建议，焦虑消除，安心进食

## Tech Specs
- Frontend: Next.js 15 (App Router), Tailwind CSS (Mobile First)
- AI Vision: Claude 3.5 Sonnet (Vision)
- Database: Neon (Serverless Postgres) - 仅存储hash后脱敏数据
- Deployment: Vercel

## Pricing
- Free: 3次/天
- Pro: $9.9/月，无限分析 + 历史记录 + 趋势报告
