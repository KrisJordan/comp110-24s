import re
import asyncio
import cachetools
import time
from typing import Callable, Coroutine
from watchdog.observers import Observer
from watchdog.observers.api import BaseObserver
from watchdog.events import FileSystemEventHandler, FileSystemEvent
from .web_socket_event import WebSocketEvent

NotifierFn = Callable[[WebSocketEvent], Coroutine[None, None, None]]


def FileObserver(path: str, notifier: NotifierFn) -> BaseObserver:
    observer = Observer()
    event_handler = _FileChangeHandler(notifier, asyncio.get_running_loop())
    observer.schedule(event_handler, path, recursive=True)
    observer.start()
    return observer


class _FileChangeHandler(FileSystemEventHandler):
    def __init__(self, notifier: NotifierFn, loop: asyncio.AbstractEventLoop):
        self._notify_func = notifier
        self._loop = loop
        self._file_pattern = re.compile(r".*\.py$")
        self._directory_anti_pattern = re.compile(
            r".*(__pycache__|\.pytest_cache|\.git).*"
        )
        self._cache: cachetools.TTLCache[str, float] = cachetools.TTLCache(
            maxsize=1000, ttl=0.5
        )

    def _event_filter(self, event: FileSystemEvent):
        current_time = time.time()
        last_time: float | None = self._cache.get(event.src_path)
        if last_time is not None and current_time - last_time < self._cache.ttl:
            return False

        if self._file_pattern.match(event.src_path):
            self._cache[event.src_path] = current_time
            return True
        elif event.is_directory and not self._directory_anti_pattern.match(
            event.src_path
        ):
            self._cache[event.src_path] = current_time
            return True
        return False

    def on_created(self, event: FileSystemEvent):
        if self._event_filter(event):
            ws_event = WebSocketEvent(
                type="FILE_CREATED", data={"path": event.src_path}
            )
            asyncio.run_coroutine_threadsafe(self._notify_func(ws_event), self._loop)

    def on_modified(self, event: FileSystemEvent):
        if self._event_filter(event):
            ws_event = WebSocketEvent(
                type="FILE_MODIFIED", data={"path": event.src_path}
            )
            asyncio.run_coroutine_threadsafe(self._notify_func(ws_event), self._loop)

    def on_moved(self, event: FileSystemEvent):
        if self._event_filter(event):
            ws_event = WebSocketEvent(type="FILE_MOVED", data={"path": event.src_path})
            asyncio.run_coroutine_threadsafe(self._notify_func(ws_event), self._loop)

    def on_deleted(self, event: FileSystemEvent):
        if self._event_filter(event):
            ws_event = WebSocketEvent(
                type="FILE_DELETED", data={"path": event.src_path}
            )
            asyncio.run_coroutine_threadsafe(self._notify_func(ws_event), self._loop)
