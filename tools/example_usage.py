#!/usr/bin/env python3
"""
DDL Optimizer使用示例
"""

from ddl_optimizer import DDLOptimizer


def example_basic_usage():
    """基本使用示例"""
    print("=" * 60)
    print("示例1: 基本使用 - 紧凑格式")
    print("=" * 60)

    optimizer = DDLOptimizer()

    # 从文件加载
    result = optimizer.optimize_file('../ddl/foreign_trade.sql', format_type='compact')

    # 只显示前500个字符
    print(result[:500])
    print("\n... (已截断)")
    print(f"\n总共解析了 {optimizer.get_table_count()} 张表")
    print()


def example_json_format():
    """JSON格式示例"""
    print("=" * 60)
    print("示例2: JSON格式输出")
    print("=" * 60)

    optimizer = DDLOptimizer()
    result = optimizer.optimize_file('../ddl/foreign_trade.sql', format_type='json')

    # 只显示前500个字符
    print(result[:500])
    print("\n... (已截断)")
    print()


def example_markdown_format():
    """Markdown格式示例"""
    print("=" * 60)
    print("示例3: Markdown表格格式")
    print("=" * 60)

    optimizer = DDLOptimizer()
    result = optimizer.optimize_file('../ddl/foreign_trade.sql', format_type='markdown')

    # 只显示前800个字符
    print(result[:800])
    print("\n... (已截断)")
    print()


def example_minimal_format():
    """极简格式示例"""
    print("=" * 60)
    print("示例4: 极简格式（最小token）")
    print("=" * 60)

    optimizer = DDLOptimizer()
    result = optimizer.optimize_file('../ddl/foreign_trade.sql', format_type='minimal')

    # 只显示前800个字符
    print(result[:800])
    print("\n... (已截断)")
    print()


def example_filter_tables():
    """过滤表示例"""
    print("=" * 60)
    print("示例5: 只保留指定的表")
    print("=" * 60)

    optimizer = DDLOptimizer()
    optimizer.optimize_file('../ddl/foreign_trade.sql')

    # 获取前3个表名
    table_names = optimizer.get_table_names()[:3]
    print(f"选择的表: {', '.join(table_names)}\n")

    # 只保留这些表
    filtered = optimizer.filter_tables(table_names)
    result = filtered.format('compact')

    print(result)
    print()


def example_statistics():
    """统计信息示例"""
    print("=" * 60)
    print("示例6: 获取统计信息")
    print("=" * 60)

    optimizer = DDLOptimizer()
    optimizer.optimize_file('../ddl/foreign_trade.sql')

    stats = optimizer.get_statistics()

    print("DDL统计信息:")
    print(f"  总表数: {stats['total_tables']}")
    print(f"  总列数: {stats['total_columns']}")
    print(f"  总索引数: {stats['total_indexes']}")
    print(f"  总外键数: {stats['total_foreign_keys']}")
    print(f"  平均每表列数: {stats['avg_columns_per_table']}")
    print()


def example_layered_format():
    """分层格式示例"""
    print("=" * 60)
    print("示例7: 分层格式")
    print("=" * 60)

    optimizer = DDLOptimizer()
    optimizer.optimize_file('../ddl/foreign_trade.sql')

    # 只取前3个表做演示
    table_names = optimizer.get_table_names()[:3]
    filtered = optimizer.filter_tables(table_names)

    result = filtered.format('layered')
    print(result)
    print()


def example_erd_format():
    """ERD格式示例"""
    print("=" * 60)
    print("示例8: ERD文本格式")
    print("=" * 60)

    optimizer = DDLOptimizer()
    optimizer.optimize_file('../ddl/foreign_trade.sql')

    # 只取前5个表做演示
    table_names = optimizer.get_table_names()[:5]
    filtered = optimizer.filter_tables(table_names)

    result = filtered.format('erd')
    print(result)
    print()


def example_programmatic_usage():
    """编程方式使用示例"""
    print("=" * 60)
    print("示例9: 编程方式使用")
    print("=" * 60)

    # 直接使用DDL文本
    ddl_text = """
    CREATE TABLE users (
      id bigint NOT NULL AUTO_INCREMENT COMMENT '用户ID',
      username varchar(50) NOT NULL COMMENT '用户名',
      email varchar(100) NOT NULL COMMENT '邮箱',
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_username (username),
      KEY idx_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

    CREATE TABLE orders (
      id bigint NOT NULL AUTO_INCREMENT COMMENT '订单ID',
      user_id bigint NOT NULL COMMENT '用户ID',
      total_amount decimal(10,2) NOT NULL COMMENT '总金额',
      status varchar(20) NOT NULL COMMENT '状态',
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_user_id (user_id),
      CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';
    """

    optimizer = DDLOptimizer()
    result = optimizer.optimize_text(ddl_text, format_type='compact')

    print(result)
    print()


def main():
    """运行所有示例"""
    examples = [
        example_basic_usage,
        example_json_format,
        example_markdown_format,
        example_minimal_format,
        example_filter_tables,
        example_statistics,
        example_layered_format,
        example_erd_format,
        example_programmatic_usage
    ]

    for i, example_func in enumerate(examples, 1):
        try:
            example_func()
        except Exception as e:
            print(f"示例{i}执行出错: {e}")
            import traceback
            traceback.print_exc()
            print()

    print("=" * 60)
    print("所有示例运行完成！")
    print("=" * 60)


if __name__ == '__main__':
    main()
