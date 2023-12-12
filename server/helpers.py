from typing import Union
import os


class Module:
    def __init__(self, name: str, path: str):
        self.name: str = name
        self.path: str = path

    def tree_str(self, indent: int = 0) -> str:
        return indent * " " + self.name + ":" + self.path + "\n"


class Package:
    def __init__(self, name: str):
        self.name: str = name
        self.children: list[Union["Package", Module]] = []

    def add_child(self, child: Union["Package", Module]) -> None:
        self.children.append(child)

    def __str__(self) -> str:
        return self.tree_str()

    def tree_str(self, indent: int = 0) -> str:
        result: str = indent * " " + self.name + "\n"
        child_indent: int = indent + 2
        for child in self.children:
            if isinstance(child, Module):
                result += child.tree_str(child_indent)
            else:
                result += child.tree_str(child_indent)
        return result


def build_module_tree(path: str) -> Package | Module:
    """
    Builds a tree of Package and Module instances representing the Python modules and
    packages in the given directory path.
    """
    if path.endswith(".py"):
        module_name = os.path.splitext(path)[0]
        return Module(module_name, path)

    root_package = Package(os.path.basename(path))
    for root, _dirs, files in os.walk(path):
        # Determine the current package based on the root
        current_package = root_package
        relative_path = os.path.relpath(root, path)
        print(relative_path)
        if relative_path != ".":
            for part in relative_path.split(os.sep):
                # Find or create the nested package
                found = False
                for child in current_package.children:
                    if isinstance(child, Package) and child.name == part:
                        current_package = child
                        found = True
                        break
                if not found:
                    new_package = Package(part)
                    current_package.add_child(new_package)
                    current_package = new_package

        # Add modules to the current package
        for file in files:
            if file.endswith(".py"):
                module_name = os.path.splitext(file)[0]
                current_package.add_child(Module(module_name, f"{root}/{file}"))

    return root_package


# Example usage
module_tree = build_module_tree("comp110")
print(module_tree)
