"""
WebSocketManager is responsible for maintaining a set of connected clients.

It accepts new clients, notifying all clients of events, and removes clients
when they disconnect. It can be shutdown using `stop` to close all clients.
"""
__author__ = "Kris Jordan <kris@cs.unc.edu>"
__copyright__ = "Copyright 2023"
__license__ = "MIT"

from typing import Callable, Coroutine
from fastapi import WebSocket

from .web_socket_event import WebSocketEvent


class WebSocketManager:
    """
    WebSocketManager is responsible for maintaining a set of connected clients.

    It accepts new clients, notifying all clients of events, and removes clients
    when they disconnect. It can be shutdown using `stop` to close all clients.
    """

    def __init__(
        self,
        receive_handler: Callable[
            [WebSocket, WebSocketEvent], Coroutine[None, None, None]
        ],
    ):
        self._clients: set[WebSocket] = set()
        self._receive_handler = receive_handler

    async def accept(self, client: WebSocket) -> None:
        """
        Accept a new client and add it to the set of clients.

        Args:
            client: The fastapi.WebSocket client to accept.
        """
        await client.accept()
        self._clients.add(client)
        try:
            while True:
                data = await client.receive_text()
                event = WebSocketEvent.model_validate_json(data)
                await self._receive_handler(client, event)
        except Exception as e:
            print(e)
            pass
        finally:
            self._clients.remove(client)

    async def notify(self, event: WebSocketEvent) -> None:
        """
        Notify all clients of a new event.

        Args:
            event: The event to notify clients of.

        Returns:
            None
        """
        json = event.model_dump_json()
        for client in self._clients:
            await client.send_text(json)

    async def stop(self) -> None:
        """
        Close all clients.

        Args:
            None

        Returns:
            None"""
        for client in self._clients:
            try:
                await client.close()
            except Exception:
                ...
        self._clients.clear()
