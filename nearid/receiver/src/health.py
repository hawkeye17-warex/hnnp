import os

from aiohttp import web

from sender import get_queue_size


async def handle_health(_request: web.Request) -> web.Response:
    """
    Simple health/status endpoint for the receiver.

    Returns JSON:
      - status: "ok"
      - queue_size: current number of queued presence reports
    """
    data = {
        "status": "ok",
        "queue_size": get_queue_size(),
    }
    return web.json_response(data)


async def run_health_server() -> None:
    """
    Start a lightweight HTTP server exposing /health for monitoring.

    Configuration (optional):
      - HNNP_HEALTH_HOST (default "0.0.0.0")
      - HNNP_HEALTH_PORT (default "8081")
    """
    host = os.environ.get("HNNP_HEALTH_HOST", "0.0.0.0")
    port = int(os.environ.get("HNNP_HEALTH_PORT", "8081"))

    app = web.Application()
    app.router.add_get("/health", handle_health)

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, host, port)
    await site.start()

