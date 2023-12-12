import ast


class NameExtractor(ast.NodeVisitor):
    def __init__(self):
        self.functions: list[ast.FunctionDef] = []

    def visit_FunctionDef(self, node: ast.FunctionDef):
        self.functions.append(node)
        self.generic_visit(node)


def parse_function_defs_of_module(file_path: str) -> list[ast.FunctionDef]:
    with open(file_path, "r") as file:
        node = ast.parse(file.read(), file_path)

    extractor = NameExtractor()
    extractor.visit(node)

    return extractor.functions
