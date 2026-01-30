# NL2SQL 快速上手指南

## 1. 设置API密钥

首先需要设置您的Anthropic API密钥：

```bash
# 编辑 .env 文件
cd /home/user/zdata
echo "ANTHROPIC_API_KEY=sk-ant-your-api-key-here" >> .env
```

或者复制 `.env.example` 并修改：
```bash
cp .env.example .env
# 然后编辑 .env 文件，添加真实的API密钥
```

## 2. 安装依赖（如果还没安装）

```bash
cd /home/user/zdata/tools/nl2sql
pip install -r requirements.txt
```

## 3. 基本使用

### 方式一：使用数据库配置

最简单的方式，使用已配置的数据库：

```bash
cd /home/user/zdata/tools
python -m nl2sql "查询所有用户" --db local
```

### 方式二：使用DDL文件

指定DDL文件路径：

```bash
python -m nl2sql "统计订单数量" --ddl /path/to/schema.sql
```

## 4. 实时思考过程

默认情况下，工具会显示Claude的思考过程：

```bash
python -m nl2sql "找出最近7天注册的活跃用户" --db local
```

输出示例：
```
Loading DDL from local (format: erd)...
Sending query to Claude (opus)...

💭 Claude is thinking...
首先需要理解schema结构。我看到有users表，需要检查是否有registration_date和status字段...

✓ Response:

```sql
SELECT * FROM users
WHERE registration_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
  AND status = 'active';
```

**说明**: 查询最近7天内注册且状态为活跃的所有用户。
```

## 5. 常用选项

### 使用更快的Sonnet模型

```bash
python -m nl2sql "简单查询" --db local --model sonnet
```

### 隐藏思考过程（但仍使用thinking模式）

```bash
python -m nl2sql "查询数据" --db local --hide-thinking
```

### 完全禁用thinking模式（最快）

```bash
python -m nl2sql "查询数据" --db local --no-thinking
```

### 保存SQL到文件

```bash
python -m nl2sql "查询用户订单" --db local --output query.sql
```

### JSON格式输出

```bash
python -m nl2sql "统计数据" --db local --format json
```

### 只输出SQL（无说明）

```bash
python -m nl2sql "查询" --db local --format sql-only
```

## 6. 查看可用数据库

```bash
python -m nl2sql --list-databases
```

## 7. 完整示例

### 示例1：分析订单数据

```bash
python -m nl2sql \
  "查询2024年每个月的订单总金额，按月份排序" \
  --db local \
  --output monthly_revenue.sql
```

### 示例2：复杂JOIN查询

```bash
python -m nl2sql \
  "查询购买金额超过10000元的客户，包括客户名称、邮箱和总购买金额" \
  --db local \
  --model opus
```

### 示例3：交互式使用

```bash
# 从文件读取查询
cat <<EOF | python -m nl2sql --db local
查询最近30天内：
1. 新注册用户数
2. 活跃用户数
3. 订单总数
4. 销售总额
EOF
```

### 示例4：批量处理

```bash
# 创建查询列表
cat > queries.txt <<EOF
查询所有产品分类
统计每个分类的产品数量
找出库存低于10的产品
EOF

# 逐行处理
while IFS= read -r query; do
  echo "Processing: $query"
  python -m nl2sql "$query" --db local --format sql-only
  echo "---"
done < queries.txt
```

## 8. 故障排除

### 问题1：找不到API密钥

```
Error: ANTHROPIC_API_KEY not found in environment
```

**解决**：确保 `.env` 文件中包含有效的API密钥。

### 问题2：找不到DDL文件

```
Error: DDL file not found
```

**解决**：
- 检查文件路径是否正确
- 或使用 `--db` 参数引用配置的数据库
- 运行 `python -m nl2sql --list-databases` 查看可用数据库

### 问题3：Python找不到模块

```
No module named 'nl2sql'
```

**解决**：确保在 `tools/` 目录下运行命令：
```bash
cd /home/user/zdata/tools
python -m nl2sql --help
```

## 9. 高级配置

编辑 `config/nl2sql.yaml` 可以修改默认设置：

```yaml
# 模型配置
model:
  default: opus  # 改为 sonnet 使用更快的模型

# DDL优化
ddl:
  default_format: erd  # erd | compact | minimal

# 输出配置
output:
  default_format: full  # sql-only | full | json

# Thinking显示
thinking:
  enabled: true
  show_by_default: true  # 改为 false 默认隐藏thinking
```

## 10. 性能参考

- **Opus模型**：3-8秒（包含thinking），最佳准确性
- **Sonnet模型**：1-3秒，适合简单查询
- **Token消耗**：约500-2000输入 + 200-500输出/查询
- **DDL优化**：自动减少60-80% tokens

## 11. 下一步

- 查看完整文档：`tools/nl2sql/README.md`
- 运行测试：`python nl2sql/test_basic.py`
- 集成到您的工作流中
- 根据需要调整 `config/nl2sql.yaml` 配置

## 需要帮助？

- 查看帮助：`python -m nl2sql --help`
- 查看示例：`tools/nl2sql/README.md`
- 启用调试：`python -m nl2sql "query" --db local --debug`
