from fastapi import FastAPI, WebSocket
from fastapi.concurrency import asynccontextmanager
from fastapi.staticfiles import StaticFiles

from .web_socket_manager import WebSocketManager
from .file_observer import FileObserver


web_socket_manager = WebSocketManager()


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
