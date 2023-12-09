import asyncio
from fastapi import FastAPI, WebSocket
from starlette.websockets import WebSocketState

app = FastAPI()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    # Create the subprocess using asyncio's subprocess functions
    process = await asyncio.create_subprocess_exec(
        "python3",
        "-m",
        "hello",
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    async def read_stdout():
        while True:
            if websocket.client_state == WebSocketState.DISCONNECTED:
                process.terminate()
                break
            output = await process.stdout.readline()
            if process.returncode is not None:
                try:
                    await websocket.close()
                except RuntimeError:
                    pass
                break
            if output == b"":
                break
            if output:
                await websocket.send_text(output.decode().strip())

    async def read_stdin():
        while True:
            try:
                data = await websocket.receive_text()
                process.stdin.write(data.encode() + b"\n")
                await process.stdin.drain()
            except Exception:
                try:
                    process.terminate()
                except ProcessLookupError:
                    pass
                break

    stdout_task = asyncio.create_task(read_stdout())
    stdin_task = asyncio.create_task(read_stdin())

    await asyncio.gather(stdout_task, stdin_task)

    if process.returncode is None:
        process.terminate()

    await process.wait()
