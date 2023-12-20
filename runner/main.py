import asyncio
from .runner import Runner


async def main():
    runner = Runner()

    await runner.run_standard_module(
        input(
            "Enter the name of the module you'd like to run relative to /workspace: "
        ),
        None,
        None,
    )


if __name__ == "__main__":
    asyncio.run(main())
