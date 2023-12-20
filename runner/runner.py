import asyncio
from typing import Any


class Runner:
    _is_running: bool
    _last_input: str
    _input_server: asyncio.Server | None

    def __init__(self):
        self._is_running = False
        self._last_input = ""
        self._input_server = None

    async def stop(self):
        self._is_running = False
        if self._input_server is not None:
            self._input_server.close()
            await self._input_server.wait_closed()
        self._last_input = ""
        self._input_server = None

    async def run_standard_module(
        self,
        module: str,
        function: str | None,
        args: list[Any] | None,
        # input_callback: Callable[[str], Any],
        # output_callback: Callable[[str], Any],
        # error_callback: Callable[[str], Any],
    ):
        injected_code = f"import {module}\n"

        if function is not None:
            stringified_args = ""

            if args is not None and len(args) > 0:
                stringified_args = ", ".join(args)[:-2]

            injected_code += f"result = {module}.{function}({stringified_args})\n"

        with open("/workspace/runner/wrappers/standard.py") as template_file:
            template = template_file.read()

        template = template.replace("IMPORT_HERE", injected_code)

        process = await asyncio.create_subprocess_exec(
            "python3",
            "-Xfrozen_modules=off",
            "-m",
            "debugpy",
            "--listen",
            "localhost:5678",
            "-c",
            f"{template}",
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        self._is_running = True

        async def read_stdout():
            output_buffer = ""

            while True:
                if not self._is_running:
                    break

                output = await process.stdout.readline()
                if output != b"":
                    output = output_buffer + output.decode()

                    if output == self._last_input:
                        print(f"Handling input for prompt: '{output[:-1]}'")

                        # THESE TWO LINES ARE JUST FOR SIMULATING INPUT RIGHT NOW
                        process.stdin.write(b"mock input string\n")
                        await process.stdin.drain()

                        self._last_input = ""
                        output_buffer = ""
                    elif self._last_input.startswith(output):
                        output_buffer += output
                    else:
                        print(output[:-1])

        async def read_stderr():
            while True:
                if not self._is_running:
                    break

                output = await process.stderr.readline()
                if output != b"":
                    print(output.decode()[:-1])

        async def input_handler(
            reader: asyncio.StreamReader, writer: asyncio.StreamWriter
        ):
            # Messages are sent in the format: "<int length>;<message>"
            length_header = await reader.readuntil(b";")
            message_length = int(length_header.decode()[:-1])

            prompt = await reader.read(message_length)
            self._last_input = prompt.decode()

            writer.write(b"confirmed\n")
            await writer.drain()
            writer.close()
            await writer.wait_closed()

        async def input_monitor():
            server = await asyncio.start_server(input_handler, "127.0.0.1", 2999)

            async with server:
                self._input_server = server
                await server.serve_forever()

        stdout_task = asyncio.create_task(read_stdout())
        stderr_task = asyncio.create_task(read_stderr())
        input_task = asyncio.create_task(input_monitor())
        # stdin_task = asyncio.create_task(read_stdin())

        await asyncio.gather(stdout_task, stderr_task, input_task)

        print("Tasks done.")

        process.wait()
