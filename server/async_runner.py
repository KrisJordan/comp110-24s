import asyncio

from fastapi import WebSocket
from .web_socket_event import WebSocketEvent


class AsyncRunner:
    def __init__(self, module: str, client: WebSocket):
        self._module = module
        self._client = client

    async def start(self) -> int:
        self._process = await asyncio.create_subprocess_exec(
            "python3",
            "-m",
            self._module,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        self._pipe_stdout_task = asyncio.create_task(self.pipe_stdout())
        self._pipe_stderr_task = asyncio.create_task(self.pipe_stderr())
        self._await_exit = asyncio.create_task(self.await_exit())
        return self._process.pid

    async def await_exit(self) -> None:
        while True:
            await self._process.wait()
            if self._process.returncode is not None:
                await self._client.send_text(
                    WebSocketEvent(
                        type="EXIT",
                        data={
                            "pid": self._process.pid,
                            "returncode": self._process.returncode,
                        },
                    ).model_dump_json()
                )
                break

    async def pipe_stderr(self) -> None:
        while True:
            if self._process.returncode is not None:
                break

            output = await self._process.stderr.readline()  # type: ignore

            if output == b"":
                break

            if output:
                await self._client.send_text(
                    WebSocketEvent(
                        type="STDERR", data={"pid": self._process.pid, "err": output}
                    ).model_dump_json()
                )

    async def pipe_stdout(self) -> None:
        while True:
            if self._process.returncode is not None:
                break

            output = await self._process.stdout.readline()  # type: ignore

            if output == b"":
                break

            if output:
                await self._client.send_text(
                    WebSocketEvent(
                        type="STDOUT", data={"pid": self._process.pid, "output": output}
                    ).model_dump_json()
                )
