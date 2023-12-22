import asyncio
import sys
import subprocess
from subprocess import Popen
from starlette.websockets import WebSocketState
from asyncio import StreamReader

from fastapi import WebSocket

from server.web_socket_event import WebSocketEvent


class AsyncPythonSubprocess:
    def __init__(self, module: str, client: WebSocket):
        self._module = module
        self._client = client
        self._process = None

    async def start(self):
        self._process = self._open_child_process()

        stdout_reader, stderr_reader = await self._connect_output_pipes(self._process)
        self._stdout_pipe_task = asyncio.create_task(self._stdout_pipe(stdout_reader))
        self._stderr_pipe_task = asyncio.create_task(self._stderr_pipe(stderr_reader))
        # self._stdin_pipe_task = asyncio.create_task(self._stdin_pipe())
        self._exit_task = asyncio.create_task(self._exit())

        return self._process.pid

    async def await_end(self):
        if not self._process:
            raise Exception("Process not started...")
        await asyncio.gather(self._exit_task)
        return self._process.returncode

    def subprocess_exited(self):
        return self._process and self._process.poll() is not None

    def client_connected(self):
        return self._client.client_state == WebSocketState.CONNECTED

    def _open_child_process(self) -> Popen[str]:
        """Open the child process with flags for debugging."""
        return subprocess.Popen(
            ["python3", "-Xfrozen_modules=off", "-m", self._module],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            stdin=subprocess.PIPE,
            text=True,
            bufsize=0,  # Unbuffered
        )

    async def _connect_output_pipes(
        self, process: Popen[str]
    ) -> tuple[StreamReader, StreamReader]:
        """Establish non-blocking readers on the subprocess' output and error sreams."""
        # Create StreamReader objects for stdout and stderr
        loop = asyncio.get_event_loop()
        stdout_reader = asyncio.StreamReader()
        stderr_reader = asyncio.StreamReader()

        # Create protocol-pipe pairs
        stdout_protocol = asyncio.StreamReaderProtocol(stdout_reader)
        stderr_protocol = asyncio.StreamReaderProtocol(stderr_reader)

        # Associate pipes with StreamReader via transport
        await loop.connect_read_pipe(lambda: stdout_protocol, process.stdout)
        await loop.connect_read_pipe(lambda: stderr_protocol, process.stderr)
        return (stdout_reader, stderr_reader)

    # async def _stdin_pipe(self):
    #     try:
    #         while not self.subprocess_exited() and self.client_connected():
    #             try:
    #                 # Avoid waiting on input that isn't coming when process may end...
    #                 data = await asyncio.wait_for(self._client.receive_text(), 1)
    #                 if self._process and self._process.stdin:
    #                     self._process.stdin.write(data + "\n")
    #                     self._process.stdin.flush()
    #             except TimeoutError:
    #                 ...
    #     except asyncio.CancelledError:
    #         print("_stdin_pipe Cancelled error...", sys.stderr)
    #     except Exception as e:
    #         print(e, sys.stderr)
    #         return

    async def _stdout_pipe(self, stdout: StreamReader):
        while True:
            try:
                output = (await stdout.readline()).decode()
                if (
                    output == "" and self.subprocess_exited()
                ) or not self.client_connected():
                    break

                if output and self._process:
                    await self._client.send_text(
                        WebSocketEvent(
                            type="STDOUT",
                            data={"pid": self._process.pid, "data": output},
                        ).model_dump_json()
                    )
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(e, sys.stderr)

    async def _stderr_pipe(self, stderr: StreamReader):
        while True:
            try:
                output = (await stderr.readline()).decode()
                if (
                    output == "" and self.subprocess_exited()
                ) or not self.client_connected():
                    break

                if output and self._process:
                    await self._client.send_text(
                        WebSocketEvent(
                            type="STDERR",
                            data={"pid": self._process.pid, "data": output},
                        ).model_dump_json()
                    )
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(e, sys.stderr)

    async def _exit(self):
        while True:
            if not self._process:
                break

            if not self.client_connected():
                self._process.kill()

            if self.subprocess_exited():
                # Let the pipes clear...
                await asyncio.gather(
                    # self._stdin_pipe_task,
                    self._stdout_pipe_task,
                    self._stderr_pipe_task,
                )
                if self.client_connected():
                    await self._client.send_text(f"Exit: {self._process.returncode}")
                break

            await asyncio.sleep(1)