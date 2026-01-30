#!/usr/bin/env python3
"""
Basic functionality test for nl2sql tool (without API calls)
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from nl2sql.config import Config
from nl2sql.ddl_manager import DDLManager
from nl2sql.prompts import build_system_prompt
from nl2sql.display import StreamDisplay

def test_config():
    """Test configuration loading"""
    print("Testing configuration...")
    try:
        config = Config()
        print(f"  ✓ Config loaded successfully")
        print(f"  - Default model: {config.get_model_id()}")
        print(f"  - Max tokens: {config.get_max_tokens()}")
        print(f"  - DDL format: {config.get_ddl_format()}")
        return True
    except Exception as e:
        print(f"  ✗ Config test failed: {e}")
        return False

def test_ddl_manager():
    """Test DDL manager"""
    print("\nTesting DDL manager...")
    try:
        manager = DDLManager()

        # Test database listing
        databases = manager.get_available_databases()
        print(f"  ✓ Found {len(databases)} databases: {', '.join(databases)}")

        # Test DDL loading from database config
        print("  Testing DDL load from database 'local'...")
        ddl = manager.load_ddl('local', 'db', format_type='erd')
        print(f"  ✓ DDL loaded, length: {len(ddl)} characters")
        print(f"  First 100 chars: {ddl[:100]}...")

        return True
    except Exception as e:
        print(f"  ✗ DDL manager test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_prompt_building():
    """Test prompt building"""
    print("\nTesting prompt building...")
    try:
        sample_ddl = "TABLE users (id INT, name VARCHAR(100))"
        prompt = build_system_prompt(sample_ddl)
        print(f"  ✓ Prompt built, length: {len(prompt)} characters")
        assert "users" in prompt
        assert "Database Schema" in prompt
        print("  ✓ Prompt contains expected content")
        return True
    except Exception as e:
        print(f"  ✗ Prompt building test failed: {e}")
        return False

def test_display():
    """Test display handler"""
    print("\nTesting display handler...")
    try:
        display = StreamDisplay(show_thinking=False)

        # Test SQL extraction
        sample_response = """```sql
SELECT * FROM users WHERE id = 1;
```
**Explanation**: Gets user by ID."""

        sql = display.extract_sql(sample_response)
        print(f"  ✓ SQL extracted: {sql}")
        assert "SELECT" in sql
        assert "users" in sql
        return True
    except Exception as e:
        print(f"  ✗ Display test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("NL2SQL Basic Functionality Tests")
    print("=" * 60)

    tests = [
        test_config,
        test_ddl_manager,
        test_prompt_building,
        test_display
    ]

    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"\n✗ Test crashed: {e}")
            results.append(False)

    print("\n" + "=" * 60)
    passed = sum(results)
    total = len(results)
    print(f"Results: {passed}/{total} tests passed")
    print("=" * 60)

    if passed == total:
        print("\n✓ All tests passed!")
        return 0
    else:
        print(f"\n✗ {total - passed} test(s) failed")
        return 1

if __name__ == '__main__':
    sys.exit(main())
