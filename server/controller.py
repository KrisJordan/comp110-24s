import aiofiles.os
from fastapi import WebSocket
from server.web_socket_event import WebSocketEvent
from .async_python_subprocess import AsyncPythonSubprocess

subprocesses: dict[int, AsyncPythonSubprocess] = {}


async def web_socket_controller(client: WebSocket, event: WebSocketEvent):
    response: WebSocketEvent
    print(event.model_dump_json())
    match event.type:
        case "LS":
            files = await list_files_async(".")
            response = WebSocketEvent(type="LS", data={"files": files})
        case "RUN":
            subprocess = AsyncPythonSubprocess(event.data["module"], client)
            pid = await subprocess.start()
            subprocesses[pid] = subprocess
            response = WebSocketEvent(type="RUNNING", data={"pid": pid})
        case "STDIN":
            pid = event.data["pid"]
            if pid in subprocesses:
                process = subprocesses[pid]
                if process and not process.subprocess_exited():
                    process._process.stdin.write(event.data["data"] + "\n")
                    process._process.stdin.flush()
            return
        case _:
            response = WebSocketEvent(type="??", data={})

    await client.send_text(response.model_dump_json())


async def list_files_async(directory: str):
    files: list[str] = []
    for entry in await aiofiles.os.scandir(directory):
        if entry.is_file():
            files.append(entry.name)
    return files
