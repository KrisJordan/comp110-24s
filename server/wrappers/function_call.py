import runpy
import sys
import traceback
import json
import inspect
from typing import Any

if len(sys.argv) < 2:
    raise Exception("The module name must be passed as first argument to this wrapper.")

module_name = sys.argv[1]


def audit_hook(event: str, args: tuple[Any, ...]):
    if event == "builtins.input":
        sys.stdout.buffer.write(b"\xff\xff\xff\xff")
        sys.stdout.write(f"{len(args[0])}\n")


sys.addaudithook(audit_hook)

try:
    import importlib

    module = importlib.import_module(module_name)
    function_call = sys.argv[2]
    print(eval(f"module.{function_call}"))
except Exception as e:
    tb_info = traceback.extract_tb(e.__traceback__)
    frames = inspect.getinnerframes(e.__traceback__)  # type: ignore

    stack_trace: list[dict[str, Any]] = []

    info_frames = [frame for frame in tb_info]
    stack_frames = [frame for frame in frames]

    for i in range(len(info_frames)):
        frame = info_frames[i]
        stack_frame = stack_frames[i]

        if (
            frame.filename.startswith("/workspace/server")
            or frame.filename.startswith("/usr/lib")
            or frame.filename.startswith("<frozen importlib")
        ):
            continue

        arguments = inspect.getargvalues(stack_frame.frame)

        locals: dict[str, Any] = {}
        for local in stack_frame.frame.f_locals:
            value = stack_frame.frame.f_locals[local]
            try:
                json.dumps(value)
                locals[local] = value
                # except (TypeError, OverflowError):
                #     try:
                #         value_type = type(value)

                #             attributes = [
                #                 attr for attr in dir(value) if not attr.startswith("_")
                #             ]
                #             simple_object: dict[str, Any] = {}

                #             for attr in attributes:
                #                 simple_object[attr] = getattr(value, attr)

                #             locals[local] = {
                #                 "type": type(value).__name__,
                #                 "repr": attributes,
                #             }
                #         else:
                #             locals[local] = repr(value)
            except (TypeError, OverflowError):
                locals[local] = "[See value in Debugger]"
                continue

        stack_trace.append(
            {
                "filename": frame.filename.replace("/workspace/", ""),
                "lineno": frame.lineno,
                "name": frame.name,
                "line": "".join(stack_frame.code_context),  # type: ignore
                "end_lineno": frame.end_lineno,
                "colno": frame.colno,
                "end_colno": frame.end_colno,
                "locals": locals,
            }
        )

    error_info = {
        "type": type(e).__name__,
        "message": str(e),
        "stack_trace": stack_trace,
    }

    json_error_info = json.dumps(error_info)

    sys.stderr.write(f"{json_error_info}\n")
    sys.exit(1)
