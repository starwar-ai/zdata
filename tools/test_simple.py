#!/usr/bin/env python3
"""
简单测试脚本 - 验证DDL Optimizer工具的基本功能
"""

from ddl_optimizer import DDLOptimizer


def test_simple_ddl():
    """测试简单的DDL"""
    print("测试1: 简单DDL解析")
    print("-" * 40)

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
    """

    optimizer = DDLOptimizer()
    result = optimizer.optimize_text(ddl_text, format_type='compact')

    print(result)
    print("\n✓ 测试通过\n")


def test_foreign_key():
    """测试外键关系"""
    print("测试2: 外键关系")
    print("-" * 40)

    ddl_text = """
    CREATE TABLE users (
      id bigint NOT NULL AUTO_INCREMENT,
      username varchar(50) NOT NULL,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB;

    CREATE TABLE orders (
      id bigint NOT NULL AUTO_INCREMENT,
      user_id bigint NOT NULL,
      total_amount decimal(10,2) NOT NULL,
      PRIMARY KEY (id),
      KEY idx_user_id (user_id),
      CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id)
    ) ENGINE=InnoDB;
    """

    optimizer = DDLOptimizer()
    result = optimizer.optimize_text(ddl_text, format_type='compact')

    print(result)
    print("\n✓ 测试通过\n")


def test_all_formats():
    """测试所有格式"""
    print("测试3: 所有输出格式")
    print("-" * 40)

    ddl_text = """
    CREATE TABLE products (
      id bigint NOT NULL AUTO_INCREMENT COMMENT '产品ID',
      name varchar(100) NOT NULL COMMENT '产品名称',
      price decimal(10,2) NOT NULL COMMENT '价格',
      stock int NOT NULL DEFAULT 0 COMMENT '库存',
      PRIMARY KEY (id),
      KEY idx_name (name)
    ) ENGINE=InnoDB COMMENT='产品表';
    """

    optimizer = DDLOptimizer()
    formats = ['compact', 'json', 'markdown', 'layered', 'erd', 'minimal']

    for fmt in formats:
        print(f"\n格式: {fmt}")
        print("~" * 40)
        result = optimizer.optimize_text(ddl_text, format_type=fmt)
        print(result[:200])  # 只显示前200个字符
        print("..." if len(result) > 200 else "")

    print("\n✓ 测试通过\n")


def test_statistics():
    """测试统计功能"""
    print("测试4: 统计信息")
    print("-" * 40)

    ddl_text = """
    CREATE TABLE users (
      id bigint NOT NULL AUTO_INCREMENT,
      username varchar(50) NOT NULL,
      email varchar(100) NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uk_username (username),
      KEY idx_email (email)
    );

    CREATE TABLE orders (
      id bigint NOT NULL AUTO_INCREMENT,
      user_id bigint NOT NULL,
      amount decimal(10,2) NOT NULL,
      PRIMARY KEY (id),
      CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users (id)
    );
    """

    optimizer = DDLOptimizer()
    optimizer.optimize_text(ddl_text)

    stats = optimizer.get_statistics()

    print("统计信息:")
    for key, value in stats.items():
        print(f"  {key}: {value}")

    assert stats['total_tables'] == 2
    assert stats['total_columns'] == 6
    assert stats['total_foreign_keys'] == 1

    print("\n✓ 测试通过\n")


def test_filter():
    """测试表过滤"""
    print("测试5: 表过滤")
    print("-" * 40)

    ddl_text = """
    CREATE TABLE users (id bigint PRIMARY KEY);
    CREATE TABLE orders (id bigint PRIMARY KEY);
    CREATE TABLE products (id bigint PRIMARY KEY);
    """

    optimizer = DDLOptimizer()
    optimizer.optimize_text(ddl_text)

    # 测试包含
    filtered = optimizer.filter_tables(['users', 'orders'])
    assert filtered.get_table_count() == 2
    print(f"过滤后保留2张表: {filtered.get_table_names()}")

    # 测试排除
    excluded = optimizer.exclude_tables(['products'])
    assert excluded.get_table_count() == 2
    print(f"排除后保留2张表: {excluded.get_table_names()}")

    print("\n✓ 测试通过\n")


def main():
    """运行所有测试"""
    print("\n" + "=" * 60)
    print("DDL Optimizer 测试套件")
    print("=" * 60 + "\n")

    tests = [
        test_simple_ddl,
        test_foreign_key,
        test_all_formats,
        test_statistics,
        test_filter
    ]

    passed = 0
    failed = 0

    for test_func in tests:
        try:
            test_func()
            passed += 1
        except Exception as e:
            print(f"\n✗ 测试失败: {e}\n")
            import traceback
            traceback.print_exc()
            failed += 1

    print("=" * 60)
    print(f"测试结果: {passed} 通过, {failed} 失败")
    print("=" * 60 + "\n")

    return 0 if failed == 0 else 1


if __name__ == '__main__':
    import sys
    sys.exit(main())
