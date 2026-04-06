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
- `retail_inventory`（门店账号维度库存，历史方案）
- `account_program_settings`（门店账号维度程序设置，历史方案）
- `app_shared_state`（全站共享状态表：小票、员工、POS 交班日结、商品、货架布局、抓拍设置等）

## 3) 当前接入范围
- 零售 POS 库存、程序设置
- 小票记录、抓拍设置、退款快照
- 员工账号
- POS 班次/交班/日结/月结
- 后台商品资料
- 货架绘图布局
- 若 Supabase 未配置或网络失败，会自动回退到 `localStorage` 缓存，不影响本地演示

## 4) 本次需要执行的 SQL
在 Supabase SQL Editor 依次执行：
- `src/lib/schema.sql`
- `docs/supabase-rls.sql`
- `docs/supabase-shared-state.sql`

## 5) 注意
- `app_shared_state` 这张表当前采用原型策略：按逻辑 `account_id` 共享，便于电脑/手机跨设备同步。
- 如果后续要上生产级权限隔离，建议改成真实员工登录，再把 `account_id` 写入 JWT claim 做精细 RLS。
