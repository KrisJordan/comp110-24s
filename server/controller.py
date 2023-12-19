import aiofiles.os
from fastapi import WebSocket
from server.web_socket_event import WebSocketEvent


async def web_socket_controller(client: WebSocket, event: WebSocketEvent):
    print(event)
    match event.type:
        case "LS":
            # Use async file system command to get list of files in cwd

            files = await list_files_async(".")
            await client.send_text(
                WebSocketEvent(type="LS", data={"files": files}).model_dump_json()
            )

        case default:
            print(default)


async def list_files_async(directory: str):
    files: list[str] = []
    for entry in await aiofiles.os.scandir(directory):
        if entry.is_file():
            files.append(entry.name)
    return files
