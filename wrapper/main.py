import asyncio
from .wrapper import Wrapper


async def main():
    wrapper = Wrapper()

    await wrapper.run_standard_module(
        input(
            "Enter the name of the module you'd like to run relative to /workspace: "
        ),
        None,
        None,
    )


if __name__ == "__main__":
    asyncio.run(main())
