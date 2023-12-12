from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from .helpers import build_module_tree, Module, Package
from .function_defs import parse_function_defs_of_module

app = FastAPI()
templates = Jinja2Templates(directory="server/templates")


@app.get("{path:path}", response_class=HTMLResponse)
async def read_item(request: Request, path: str = ""):
    # Create the module tree (replace with your path)

    try:
        module_tree: Module | Package = build_module_tree(f"comp110/{path}")
        if isinstance(module_tree, Package):
            return templates.TemplateResponse(
                "index.html", {"request": request, "package": module_tree}
            )
        else:
            function_defs = parse_function_defs_of_module(f"comp110/{path}")
            return templates.TemplateResponse(
                "functions.html",
                {
                    "request": request,
                    "function_defs": function_defs,
                    "module": module_tree,
                },
            )
    except Exception:
        return "Not found :("
