import os
import re

# Folders to skip from map output
SKIP_DIRS = {
    '.git', 'node_modules', '__pycache__', 'uploads', 'logs',
    'dist', 'build', '.vscode', 'venv'
}

# Keywords to detect self-invoking scripts
SELF_INVOCATION_PATTERNS = ['(async () =>', '();', '__main__']


def generate_project_map(root_dir='.'):
    output_lines = []

    def is_valid_export(token):
        return (
            token and
            ':' not in token and
            '[' not in token and
            ']' not in token and
            not token.startswith("'") and
            not token.startswith('"') and
            token.isidentifier()
        )

    for dirpath, dirnames, filenames in os.walk(root_dir):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]

        rel_path = os.path.relpath(dirpath, root_dir)
        prefix = '📁 ' + (rel_path if rel_path != '.' else '')
        output_lines.append(f'\n{prefix}/')

        for filename in filenames:
            if filename.endswith('.js') or filename.endswith('.ejs'):
                file_path = os.path.join(dirpath, filename)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.readlines()
                except Exception:
                    continue

                imports = [line.strip() for line in content if 'require(' in line or 'import ' in line]
                routes = [line.strip() for line in content 
                          if ('router.get(' in line or 'router.post(' in line or 
                              'app.get(' in line or 'app.post(' in line)]
                definitions = [line.strip() for line in content 
                               if ('function ' in line or 'class ' in line or 'exports.' in line)]
                includes = [line.strip() for line in content if 'include(' in line]

                exports = []
                in_exports = False
                for line in content:
                    line_strip = line.strip()
                    if line_strip.startswith('module.exports') and '{' in line_strip:
                        in_exports = True
                        brace_open = line_strip.find('{')
                        line_after_brace = line_strip[brace_open + 1:].strip()
                        if '}' in line_after_brace:
                            brace_close = line_after_brace.find('}')
                            exported = line_after_brace[:brace_close]
                            exports.extend([e.strip() for e in exported.split(',') if is_valid_export(e.strip())])
                            in_exports = False
                        else:
                            potential_exports = [e.strip().strip(',') for e in line_after_brace.split(',') if is_valid_export(e.strip())]
                            exports.extend(potential_exports)
                    elif in_exports:
                        if '}' in line_strip:
                            in_exports = False
                            line_strip = line_strip.split('}')[0]
                        potential_exports = [e.strip().strip(',') for e in line_strip.split(',') if is_valid_export(e.strip())]
                        exports.extend(potential_exports)

                has_exports = bool(
                    exports or
                    any('exports.' in line for line in content) or
                    any('module.exports = router' in line for line in content)
                )

                is_cli_script = (
                    (any(pat in line for pat in SELF_INVOCATION_PATTERNS for line in content) or
                     any('db.query' in line for line in content))
                    and not any('app.listen' in line for line in content)
                    and not has_exports
                )

                output_lines.append(f'📄 {filename}')
                if imports:
                    output_lines.append('  • Imports:')
                    output_lines.extend([f'    - {i}' for i in imports])
                if routes:
                    output_lines.append('  • Routes:')
                    output_lines.extend([f'    - {r}' for r in routes])
                if definitions:
                    output_lines.append('  • Definitions:')
                    output_lines.extend([f'    - {d}' for d in definitions])
                if includes:
                    output_lines.append('  • Includes:')
                    output_lines.extend([f'    - {inc}' for inc in includes])
                if exports:
                    output_lines.append('  • Exports:')
                    output_lines.extend([f'    - {e}' for e in exports])
                if is_cli_script:
                    output_lines.append('  • Type: CLI/Test Script')

                # Additional EJS analysis
                if filename.endswith('.ejs'):
                    logic_keywords = set()
                    used_vars = set()
                    for line in content:
                        if '<%' in line:
                            logic_keywords.update(kw for kw in ['if', 'forEach'] if kw in line)
                            vars_found = re.findall(r'<%=\s*([a-zA-Z0-9_\.]+)', line)
                            used_vars.update(v.split('.')[0] for v in vars_found)
                    if used_vars:
                        output_lines.append('  • Variables Used:')
                        output_lines.extend([f'    - {v}' for v in sorted(used_vars)])
                    if logic_keywords:
                        output_lines.append('  • Logic:')
                        output_lines.extend([f'    - {k}' for k in sorted(logic_keywords)])

    return '\n'.join(output_lines)


if __name__ == '__main__':
    project_map_content = generate_project_map('.')
    output_path = 'project_map.txt'
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(project_map_content)
    print(f'✅ Project map written to {output_path}')
