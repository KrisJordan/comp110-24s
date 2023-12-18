from fastapi import FastAPI, WebSocket
from fastapi.concurrency import asynccontextmanager
from fastapi.staticfiles import StaticFiles

from server.web_socket_event import WebSocketEvent

from .web_socket_manager import WebSocketManager
from .file_observer import FileObserver

import aiofiles.os


async def list_files_async(directory: str):
    files: list[str] = []
    for entry in await aiofiles.os.scandir(directory):
        if entry.is_file():
            files.append(entry.name)
    return files


async def web_socket_receive_handler(client: WebSocket, event: WebSocketEvent):
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


web_socket_manager = WebSocketManager(web_socket_receive_handler)


@asynccontextmanager
async def lifespan(app: FastAPI):
    file_observer = FileObserver(".", web_socket_manager.notify)
    yield
    file_observer.stop()
    await web_socket_manager.stop()


app = FastAPI(lifespan=lifespan)


@app.websocket("/ws")
async def websocket_endpoint(client: WebSocket):
    await web_socket_manager.accept(client)


app.mount("/", StaticFiles(directory="server/static", html=True))
