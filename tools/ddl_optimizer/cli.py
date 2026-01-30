#!/usr/bin/env python3
"""
DDL Optimizer CLI - 命令行接口
"""

import argparse
import sys
from pathlib import Path
from .optimizer import DDLOptimizer


def calculate_token_estimate(text: str) -> int:
    """
    估算文本的token数量（粗略估计）
    中文：1个字符约等于1.5 tokens
    英文：1个单词约等于1.3 tokens
    """
    chinese_chars = len([c for c in text if '\u4e00' <= c <= '\u9fff'])
    other_chars = len(text) - chinese_chars

    # 粗略估算
    chinese_tokens = chinese_chars * 1.5
    other_tokens = other_chars / 4  # 假设平均4个字符一个单词

    return int(chinese_tokens + other_tokens)


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description='DDL优化工具 - 将冗长的DDL转换为紧凑格式，减少LLM Token使用量',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法:
  # 基本用法 - 生成紧凑格式
  python -m ddl_optimizer.cli input.sql -o output.txt

  # 生成JSON格式
  python -m ddl_optimizer.cli input.sql -f json -o output.json

  # 生成Markdown表格
  python -m ddl_optimizer.cli input.sql -f markdown -o output.md

  # 生成分层格式
  python -m ddl_optimizer.cli input.sql -f layered

  # 生成ERD文本描述
  python -m ddl_optimizer.cli input.sql -f erd

  # 生成极简格式（最小token）
  python -m ddl_optimizer.cli input.sql -f minimal

  # 只处理指定的表
  python -m ddl_optimizer.cli input.sql --include users,orders,products

  # 排除某些表
  python -m ddl_optimizer.cli input.sql --exclude temp_table,log_table

  # 显示统计信息
  python -m ddl_optimizer.cli input.sql --stats

  # 列出所有可用格式
  python -m ddl_optimizer.cli --list-formats

可用格式:
  compact   - 紧凑格式（默认）
  json      - JSON格式
  markdown  - Markdown表格
  layered   - 分层格式
  erd       - ERD文本描述
  minimal   - 极简格式
        """
    )

    parser.add_argument(
        'input',
        nargs='?',
        help='输入DDL文件路径'
    )

    parser.add_argument(
        '-f', '--format',
        choices=['compact', 'json', 'markdown', 'layered', 'erd', 'minimal'],
        default='compact',
        help='输出格式 (默认: compact)'
    )

    parser.add_argument(
        '-o', '--output',
        help='输出文件路径（不指定则输出到标准输出）'
    )

    parser.add_argument(
        '--include',
        help='只包含指定的表（逗号分隔），例如: users,orders,products'
    )

    parser.add_argument(
        '--exclude',
        help='排除指定的表（逗号分隔），例如: temp_table,log_table'
    )

    parser.add_argument(
        '--stats',
        action='store_true',
        help='显示DDL统计信息'
    )

    parser.add_argument(
        '--list-formats',
        action='store_true',
        help='列出所有可用的输出格式'
    )

    parser.add_argument(
        '--compare',
        action='store_true',
        help='比较优化前后的token数量'
    )

    args = parser.parse_args()

    # 列出格式
    if args.list_formats:
        print("\n可用的输出格式:\n")
        formats = DDLOptimizer.list_formats()
        for fmt, desc in formats.items():
            print(f"  {fmt:10s} - {desc}")
        print()
        return 0

    # 检查输入文件
    if not args.input:
        parser.print_help()
        return 1

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"错误: 文件不存在: {args.input}", file=sys.stderr)
        return 1

    try:
        # 创建优化器
        optimizer = DDLOptimizer()

        # 读取原始DDL
        original_ddl = input_path.read_text(encoding='utf-8')

        # 解析DDL
        print(f"正在解析 {args.input}...", file=sys.stderr)
        optimizer.optimize_text(original_ddl, args.format)

        # 过滤表
        if args.include:
            table_names = [t.strip() for t in args.include.split(',')]
            optimizer = optimizer.filter_tables(table_names)
            print(f"只包含表: {', '.join(table_names)}", file=sys.stderr)

        if args.exclude:
            table_names = [t.strip() for t in args.exclude.split(',')]
            optimizer = optimizer.exclude_tables(table_names)
            print(f"排除表: {', '.join(table_names)}", file=sys.stderr)

        # 显示统计信息
        if args.stats:
            stats = optimizer.get_statistics()
            print("\n统计信息:", file=sys.stderr)
            print(f"  总表数: {stats['total_tables']}", file=sys.stderr)
            print(f"  总列数: {stats['total_columns']}", file=sys.stderr)
            print(f"  总索引数: {stats['total_indexes']}", file=sys.stderr)
            print(f"  总外键数: {stats['total_foreign_keys']}", file=sys.stderr)
            print(f"  平均每表列数: {stats['avg_columns_per_table']}", file=sys.stderr)
            print()

        # 格式化输出
        print(f"使用 {args.format} 格式生成...", file=sys.stderr)
        optimized_ddl = optimizer.format(args.format)

        # Token比较
        if args.compare:
            original_tokens = calculate_token_estimate(original_ddl)
            optimized_tokens = calculate_token_estimate(optimized_ddl)
            reduction = (1 - optimized_tokens / original_tokens) * 100

            print("\nToken使用量比较:", file=sys.stderr)
            print(f"  原始DDL: ~{original_tokens:,} tokens", file=sys.stderr)
            print(f"  优化后: ~{optimized_tokens:,} tokens", file=sys.stderr)
            print(f"  减少: ~{reduction:.1f}%", file=sys.stderr)
            print(f"  节省: ~{original_tokens - optimized_tokens:,} tokens\n", file=sys.stderr)

        # 输出结果
        if args.output:
            output_path = Path(args.output)
            output_path.write_text(optimized_ddl, encoding='utf-8')
            print(f"已保存到: {args.output}", file=sys.stderr)
        else:
            print("\n" + "=" * 60)
            print(optimized_ddl)
            print("=" * 60)

        return 0

    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
