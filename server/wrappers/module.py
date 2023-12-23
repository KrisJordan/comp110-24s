import importlib
import sys
from typing import Any

if len(sys.argv) < 2:
    raise Exception("The module name must be passed as first argument to this wrapper.")

module_name = sys.argv[1]


def audit_hook(event: str, args: tuple[Any, ...]):
    if event == "builtins.input":
        sys.stdout.buffer.write(b"\xff\xff\xff\xff")
        sys.stdout.write(f"{len(args[0])}\n")


sys.addaudithook(audit_hook)

imported_module = importlib.import_module(module_name)
