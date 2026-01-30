# DDL Optimizer 实例对比

本文档展示了不同格式的输出效果对比。

## 原始DDL

```sql
CREATE TABLE `users` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '用户名',
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '邮箱',
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '密码',
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '手机号',
  `avatar` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '头像URL',
  `status` tinyint(4) NOT NULL DEFAULT 1 COMMENT '状态 1:正常 0:禁用',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uk_username` (`username`) USING BTREE,
  UNIQUE KEY `uk_email` (`email`) USING BTREE,
  KEY `idx_phone` (`phone`) USING BTREE,
  KEY `idx_status` (`status`) USING BTREE,
  KEY `idx_created_at` (`created_at`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=10001 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='用户表';

CREATE TABLE `orders` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '订单ID',
  `order_no` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '订单号',
  `user_id` bigint(20) NOT NULL COMMENT '用户ID',
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '订单总金额',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'pending' COMMENT '订单状态',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uk_order_no` (`order_no`) USING BTREE,
  KEY `idx_user_id` (`user_id`) USING BTREE,
  KEY `idx_status` (`status`) USING BTREE,
  KEY `idx_created_at` (`created_at`) USING BTREE,
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='订单表';
```

**统计**: 约 1,200 tokens

---

## Format 1: Compact（紧凑格式）

```
users { -- 用户表
  id: bigint PK AI 用户ID
  username: varchar(50) UK NN 用户名
  email: varchar(100) UK NN 邮箱
  password: varchar(255) NN 密码
  phone: varchar(20) IDX 手机号
  avatar: varchar(255) 头像URL
  status: tinyint IDX NN 状态 1:正常 0:禁用
  created_at: timestamp IDX NN 创建时间
  updated_at: timestamp NN 更新时间
}

orders { -- 订单表
  id: bigint PK AI 订单ID
  order_no: varchar(32) UK NN 订单号
  user_id: bigint IDX NN FK→users 用户ID
  total_amount: decimal(10,2) NN 订单总金额
  status: varchar(20) IDX NN 订单状态
  created_at: timestamp IDX NN 创建时间
  updated_at: timestamp NN 更新时间

  FK: user_id → users(id)
}
```

**统计**: 约 350 tokens (减少 ~71%)

**优点**:
- 保留了所有关键信息
- 清晰的结构
- 注释完整
- 外键关系明确

---

## Format 2: JSON（JSON格式）

```json
{
  "users": {
    "comment": "用户表",
    "columns": {
      "id": "PK/AI/bigint/用户ID",
      "username": "UK/varchar(50)/用户名",
      "email": "UK/varchar(100)/邮箱",
      "password": "/varchar(255)/密码",
      "phone": "IDX/varchar(20)/手机号",
      "avatar": "/varchar(255)/头像URL",
      "status": "IDX/tinyint/状态 1:正常 0:禁用",
      "created_at": "IDX/timestamp/创建时间",
      "updated_at": "/timestamp/更新时间"
    },
    "relations": [],
    "referenced_by": ["orders.user_id"]
  },
  "orders": {
    "comment": "订单表",
    "columns": {
      "id": "PK/AI/bigint/订单ID",
      "order_no": "UK/varchar(32)/订单号",
      "user_id": "IDX/bigint/用户ID",
      "total_amount": "/decimal(10,2)/订单总金额",
      "status": "IDX/varchar(20)/订单状态",
      "created_at": "IDX/timestamp/创建时间",
      "updated_at": "/timestamp/更新时间"
    },
    "relations": ["users.id"],
    "referenced_by": []
  }
}
```

**统计**: 约 500 tokens (减少 ~58%)

**优点**:
- 结构化数据
- 易于程序处理
- 包含关系映射

---

## Format 3: Markdown（Markdown表格）

| 表名 | 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|------|
| users | id | bigint | PK, AI | 用户ID |
| users | username | varchar(50) | UK, NN | 用户名 |
| users | email | varchar(100) | UK, NN | 邮箱 |
| users | password | varchar(255) | NN | 密码 |
| users | phone | varchar(20) | IDX | 手机号 |
| users | avatar | varchar(255) | | 头像URL |
| users | status | tinyint | IDX, NN | 状态 1:正常 0:禁用 |
| users | created_at | timestamp | IDX, NN | 创建时间 |
| users | updated_at | timestamp | NN | 更新时间 |
| orders | id | bigint | PK, AI | 订单ID |
| orders | order_no | varchar(32) | UK, NN | 订单号 |
| orders | user_id | bigint | IDX, NN | 用户ID |
| orders | total_amount | decimal(10,2) | NN | 订单总金额 |
| orders | status | varchar(20) | IDX, NN | 订单状态 |
| orders | created_at | timestamp | IDX, NN | 创建时间 |
| orders | updated_at | timestamp | NN | 更新时间 |

## 表关系

- `orders.user_id` → `users.id`

**统计**: 约 600 tokens (减少 ~50%)

**优点**:
- 适合文档展示
- 易于阅读
- Markdown格式通用

---

## Format 4: Layered（分层格式）

```
=== 第一层：数据库表概览 ===

共 2 张表: users, orders

=== 第二层：核心表结构 ===

users { -- 用户表
  id: bigint PK
  username: varchar(50) UK
  email: varchar(100) UK
  phone: varchar(20) IDX
  status: tinyint IDX
  created_at: timestamp IDX
}

orders { -- 订单表
  id: bigint PK
  order_no: varchar(32) UK
  user_id: bigint IDX FK→users
  status: varchar(20) IDX
  created_at: timestamp IDX
}

=== 第三层：表关系详情 ===

orders:
  → users (user_id → id)
```

**统计**: 约 280 tokens (减少 ~77%)

**优点**:
- 分层展示，便于理解
- 首先展示概览
- 核心字段突出
- 适合大型数据库

---

## Format 5: ERD（实体关系图）

```
=== 实体关系描述 (ERD) ===

## 核心实体：

- **users**(id:bigint) [username, email, phone] - 用户表
- **orders**(id:bigint) [order_no, user_id, total_amount] - 订单表

## 关系映射：

- orders.user_id → users.id (1:N)

## 索引提示：

users:
  - uk_username: (username)
  - uk_email: (email)
  - idx_phone: (phone)
  - idx_status: (status)
  - idx_created_at: (created_at)

orders:
  - uk_order_no: (order_no)
  - idx_user_id: (user_id)
  - idx_status: (status)
  - idx_created_at: (created_at)
```

**统计**: 约 300 tokens (减少 ~75%)

**优点**:
- 业务关系清晰
- 适合LLM理解
- 突出核心字段和关系

---

## Format 6: Minimal（极简格式）

```
# 图例: * = PK, ! = UK, >table = FK, ← = 被引用

users(id*,username!,email!,password,phone,avatar,status,created_at,updated_at) ← orders # 用户表
orders(id*,order_no!,user_id>users,total_amount,status,created_at,updated_at) # 订单表
```

**统计**: 约 120 tokens (减少 ~90%)

**优点**:
- 极度紧凑
- 最小token使用
- 保留核心关系
- 适合token预算紧张的场景

---

## 格式对比总结

| 格式 | Token数 | 减少率 | 可读性 | 适用场景 |
|------|---------|--------|--------|----------|
| 原始DDL | 1,200 | 0% | ★★☆☆☆ | 数据库执行 |
| Compact | 350 | 71% | ★★★★★ | LLM分析，平衡 |
| JSON | 500 | 58% | ★★★☆☆ | 程序处理 |
| Markdown | 600 | 50% | ★★★★☆ | 文档展示 |
| Layered | 280 | 77% | ★★★★☆ | 大型数据库 |
| ERD | 300 | 75% | ★★★★★ | 业务理解 |
| Minimal | 120 | 90% | ★★★☆☆ | Token极限优化 |

## 推荐使用场景

### 1. 提供给Claude/GPT分析
**推荐**: Compact 或 ERD
```bash
python -m ddl_optimizer.cli database.sql -f compact
```

### 2. Token预算紧张
**推荐**: Minimal
```bash
python -m ddl_optimizer.cli database.sql -f minimal
```

### 3. 生成项目文档
**推荐**: Markdown
```bash
python -m ddl_optimizer.cli database.sql -f markdown -o DATABASE.md
```

### 4. 代码生成
**推荐**: JSON
```bash
python -m ddl_optimizer.cli database.sql -f json -o schema.json
```

### 5. 超大型数据库（100+表）
**推荐**: Layered
```bash
python -m ddl_optimizer.cli database.sql -f layered
```

---

**选择建议**: 如果不确定，默认使用 `compact` 格式，它提供了可读性和token节省的最佳平衡。
