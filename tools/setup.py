"""
Setup script for DDL Optimizer
"""

from setuptools import setup, find_packages

with open('DDL_OPTIMIZER_README.md', 'r', encoding='utf-8') as f:
    long_description = f.read()

setup(
    name='ddl-optimizer',
    version='1.0.0',
    description='优化数据库DDL结构，减少LLM Token使用量',
    long_description=long_description,
    long_description_content_type='text/markdown',
    author='Your Name',
    author_email='your.email@example.com',
    url='https://github.com/yourusername/ddl-optimizer',
    packages=find_packages(),
    python_requires='>=3.7',
    entry_points={
        'console_scripts': [
            'ddl-optimizer=ddl_optimizer.cli:main',
        ],
    },
    classifiers=[
        'Development Status :: 4 - Beta',
        'Intended Audience :: Developers',
        'Topic :: Software Development :: Libraries :: Python Modules',
        'Topic :: Database',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.7',
        'Programming Language :: Python :: 3.8',
        'Programming Language :: Python :: 3.9',
        'Programming Language :: Python :: 3.10',
        'Programming Language :: Python :: 3.11',
    ],
    keywords='ddl database optimization llm token mysql schema',
)
