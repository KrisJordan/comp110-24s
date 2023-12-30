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

    def write(self, data: str) -> None:
        if self._process and self._process.stdin and not self.subprocess_exited():
            if not data.endswith("\n"):
                data += "\n"
            self._process.stdin.write(data)
            self._process.stdin.flush()

    def kill(self) -> None:
        if self._process and not self.subprocess_exited():
            self._process.kill()

    def _open_child_process(self) -> Popen[str]:
        """Open the child process with flags for debugging."""
        return subprocess.Popen(
            [
                "python3",
                "-u",
                "-Xfrozen_modules=off",
                "-m",
                "server.wrappers.module",
                self._module,
            ],
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

    async def _read_stdout(self, stdout: StreamReader):
        output = await stdout.readline()
        is_prompt = False

        if output[0:4] == b"\xff\xff\xff\xff":
            length = int(output[4:].decode())
            output = await stdout.read(length)
            is_prompt = True

        return (output.decode(), is_prompt)

    async def _stdout_pipe(self, stdout: StreamReader):
        while True:
            try:
                output, is_prompt = await self._read_stdout(stdout)
                if (
                    output == "" and self.subprocess_exited()
                ) or not self.client_connected():
                    break
                if output and self._process:
                    await self._client.send_text(
                        WebSocketEvent(
                            type="STDOUT",
                            data={
                                "pid": self._process.pid,
                                "data": output,
                                "is_input_prompt": is_prompt,
                            },
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
                    self._stdout_pipe_task,
                    self._stderr_pipe_task,
                )
                if self.client_connected():
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

            await asyncio.sleep(0.1)
