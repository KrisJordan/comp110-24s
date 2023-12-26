from fastapi import FastAPI
import uvicorn
import inspect
from . import demo

app = FastAPI()


for name, obj in inspect.getmembers(demo):
    if inspect.isfunction(obj):
        app.add_api_route(f"/{name}", obj, methods=["POST"])


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)  # type: ignore
