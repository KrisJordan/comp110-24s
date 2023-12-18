from typing import Callable, Coroutine
from fastapi import WebSocket

from .web_socket_event import WebSocketEvent


class WebSocketManager:
    def __init__(
        self,
        receive_handler: Callable[
            [WebSocket, WebSocketEvent], Coroutine[None, None, None]
        ],
    ):
        self._clients: set[WebSocket] = set()
        self._receive_handler = receive_handler

    async def accept(self, client: WebSocket):
        await client.accept()
        self.add(client)
        try:
            while True:
                data = await client.receive_text()
                event = WebSocketEvent.model_validate_json(data)
                await self._receive_handler(client, event)
        except Exception as e:
            print(e)
            pass
        finally:
            self.remove(client)

    def add(self, client: WebSocket):
        self._clients.add(client)

    async def notify(self, event: WebSocketEvent) -> None:
        json = event.model_dump_json()
        for client in self._clients:
            await client.send_text(json)

    def remove(self, client: WebSocket):
        self._clients.remove(client)

    async def stop(self):
        for client in self._clients:
            try:
                await client.close()
            except Exception:
                ...
        self._clients.clear()
