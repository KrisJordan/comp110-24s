import aiofiles.os
from fastapi import WebSocket
from server.web_socket_event import WebSocketEvent
from .async_python_subprocess import AsyncPythonSubprocess
from .models import NamespaceTree, Module, Package

subprocesses: dict[int, AsyncPythonSubprocess] = {}


async def web_socket_controller(client: WebSocket, event: WebSocketEvent):
    response: WebSocketEvent
    match event.type:
        case "LS":
            files = await list_files_async(".")
            response = WebSocketEvent(type="LS", data={"files": files})
        case "RUN":
            request_id = event.data["request_id"]
            subprocess = AsyncPythonSubprocess(event.data["module"], client)
            pid = await subprocess.start()
            subprocesses[pid] = subprocess
            response = WebSocketEvent(
                type="RUNNING", data={"pid": pid, "request_id": request_id}
            )
        case "KILL":
            pid = event.data["pid"]
            if pid in subprocesses:
                process = subprocesses[pid]
                if process:
                    process.kill()
            return
        case "STDIN":
            pid = event.data["pid"]
            if pid in subprocesses:
                process = subprocesses[pid]
                if process:
                    process.write(event.data["data"])
            return
        case _:
            response = WebSocketEvent(type="??", data={})

    await client.send_text(response.model_dump_json())


async def list_files_async(directory: str) -> NamespaceTree:
    packages: list[Package | Module] = []
    for entry in await aiofiles.os.scandir(directory):
        if entry.is_file() and entry.name.endswith(".py"):
            # If the entry is a .py file, create a Module object.
            module = Module(name=entry.name, full_path=entry.path)
            packages.append(module)
        elif entry.is_dir():
            if entry.name in (
                "node_modules",
                ".git",
                ".vscode",
                ".devcontainer",
                "__pycache__",
                ".pytest_cache",
                ".mypy_cache",
            ):
                continue
            tree = await list_files_async(entry.path)
            package = Package(
                children=tree.children, name=entry.name, full_path=entry.path
            )
            packages.append(package)
    packages.sort(key=lambda o: o.name)
    return NamespaceTree(children=packages)
