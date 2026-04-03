# Supabase 接入说明

## 1) 环境变量
在项目根目录创建 `.env`：

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

## 2) 建表
在 Supabase SQL Editor 执行：

- `src/lib/schema.sql`
- `docs/supabase-rls.sql`

新增关键表：
- `retail_inventory`（门店账号维度库存）
- `account_program_settings`（门店账号维度程序设置）

## 3) 当前接入范围
- 零售 POS 库存：按 `account_id` 独立读写
- 零售 POS 设置：分类、支付方式、搜索词、语言，按 `account_id` 独立
- 若 Supabase 未配置或网络失败，会自动回退到 `localStorage`，不影响本地演示

## 4) 注意
- 启用 RLS 后，前端必须是“已登录用户”并携带可识别的账号 claim（推荐 `app_account_id`）。
