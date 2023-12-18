from fastapi import WebSocket

from .web_socket_event import WebSocketEvent


class WebSocketManager:
    def __init__(self):
        self._clients: set[WebSocket] = set()

    async def accept(self, client: WebSocket):
        await client.accept()
        self.add(client)
        # TODO: Think through receiving end...
        try:
            while True:
                data = await client.receive_text()
                print(data)
        except Exception:
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
