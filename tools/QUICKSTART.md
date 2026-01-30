# DDL Optimizer 快速开始指南

## 5分钟上手

### 1. 基本使用（无需安装）

```bash
# 进入tools目录
cd tools

# 查看帮助
python -m ddl_optimizer.cli --help

# 基本转换 - 紧凑格式
python -m ddl_optimizer.cli ../ddl/foreign_trade.sql

# 保存到文件
python -m ddl_optimizer.cli ../ddl/foreign_trade.sql -o output.txt
```

### 2. 选择不同格式

```bash
# 极简格式（最省token，减少约87%）
python -m ddl_optimizer.cli ../ddl/foreign_trade.sql -f minimal

# 紧凑格式（平衡可读性，减少约54%）
python -m ddl_optimizer.cli ../ddl/foreign_trade.sql -f compact

# JSON格式（程序处理）
python -m ddl_optimizer.cli ../ddl/foreign_trade.sql -f json -o schema.json

# Markdown表格（文档展示）
python -m ddl_optimizer.cli ../ddl/foreign_trade.sql -f markdown -o schema.md

# ERD格式（业务理解）
python -m ddl_optimizer.cli ../ddl/foreign_trade.sql -f erd

# 分层格式（大型数据库）
python -m ddl_optimizer.cli ../ddl/foreign_trade.sql -f layered
```

### 3. 查看优化效果

```bash
# 显示统计信息和token比较
python -m ddl_optimizer.cli ../ddl/foreign_trade.sql --stats --compare
```

输出示例：
```
统计信息:
  总表数: 264
  总列数: 6740
  总索引数: 498
  总外键数: 51
  平均每表列数: 25.53

Token使用量比较:
  原始DDL: ~193,645 tokens
  优化后: ~88,435 tokens
  减少: ~54.3%
  节省: ~105,210 tokens
```

### 4. 过滤表

```bash
# 只处理指定的表
python -m ddl_optimizer.cli ../ddl/foreign_trade.sql \
  --include users,orders,products

# 排除某些表
python -m ddl_optimizer.cli ../ddl/foreign_trade.sql \
  --exclude temp_table,log_table
```

### 5. 在代码中使用

```python
from ddl_optimizer import DDLOptimizer

# 创建优化器
optimizer = DDLOptimizer()

# 优化DDL文件
result = optimizer.optimize_file('database.sql', format_type='compact')
print(result)

# 优化DDL文本
ddl_text = """
CREATE TABLE users (
  id bigint PRIMARY KEY AUTO_INCREMENT,
  username varchar(50) NOT NULL UNIQUE,
  email varchar(100) NOT NULL
);
"""
result = optimizer.optimize_text(ddl_text, format_type='minimal')
print(result)

# 获取统计
stats = optimizer.get_statistics()
print(f"总共 {stats['total_tables']} 张表")
```

## 实用场景

### 场景1: 为Claude/GPT提供数据库Schema

```bash
# 生成紧凑schema供LLM使用
python -m ddl_optimizer.cli database.sql -f compact -o schema_for_llm.txt --compare
```

然后在ChatGPT/Claude中：
```
这是我的数据库schema（已优化）：

[粘贴 schema_for_llm.txt 的内容]

请帮我写一个SQL查询...
```

### 场景2: 只关注核心业务表

```bash
# 提取核心业务表
python -m ddl_optimizer.cli database.sql \
  --include users,orders,products,customers \
  -f erd -o core_business.txt
```

### 场景3: 生成项目文档

```bash
# 生成Markdown数据库文档
python -m ddl_optimizer.cli database.sql -f markdown -o DATABASE.md
```

### 场景4: 代码生成准备

```python
from ddl_optimizer import DDLOptimizer

# 为ORM模型生成准备schema
optimizer = DDLOptimizer()
schema = optimizer.optimize_file('database.sql', format_type='json')

# 传给代码生成器
import json
schema_dict = json.loads(schema)

# 生成模型代码...
```

## 格式选择建议

| 使用场景 | 推荐格式 | Token减少 |
|---------|---------|----------|
| 提供给LLM分析数据库 | compact | ~54% |
| Token预算非常紧张 | minimal | ~88% |
| 需要理解业务关系 | erd | ~75% |
| 生成技术文档 | markdown | ~40% |
| 程序自动化处理 | json | ~50% |
| 超大型数据库 | layered | ~70% |

## 测试工具

```bash
# 运行测试
python test_simple.py

# 运行所有示例
python example_usage.py
```

## 常见问题

**Q: 工具需要安装依赖吗？**
A: 不需要，工具只使用Python标准库。

**Q: 支持其他数据库吗？**
A: 目前主要支持MySQL，未来计划支持PostgreSQL和Oracle。

**Q: 会丢失重要信息吗？**
A: 不会，工具保留所有业务相关信息（表结构、关系、注释），只移除技术性冗余。

**Q: 如何知道哪些表重要？**
A: 使用 `--stats` 查看整体情况，然后用 `--include` 只保留核心表。

## 快速参考

```bash
# 列出所有格式
python -m ddl_optimizer.cli --list-formats

# 完整命令示例
python -m ddl_optimizer.cli <输入文件> \
  -f <格式> \
  -o <输出文件> \
  --include <表名,表名> \
  --exclude <表名,表名> \
  --stats \
  --compare
```

---

更多详细信息请查看 [DDL_OPTIMIZER_README.md](DDL_OPTIMIZER_README.md)
