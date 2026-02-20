"""CLI entry point for Lopmon."""

from __future__ import annotations

import asyncio
import logging

import click

from .bot import LopmonBot
from .config import Config


@click.command()
@click.option(
    "--token",
    default=None,
    help="Discord bot token. Overrides LOPMON_TOKEN env var and config file.",
)
@click.option(
    "--guild-id",
    default=None,
    type=int,
    help="Guild ID for faster slash-command sync during development. "
    "Overrides LOPMON_GUILD_ID env var and config file.",
)
@click.option(
    "--log-level",
    default=None,
    type=click.Choice(["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"], case_sensitive=False),
    help="Logging verbosity. Overrides LOPMON_LOG_LEVEL env var and config file.",
)
@click.option(
    "--config",
    "config_path",
    default="config.toml",
    show_default=True,
    help="Path to the TOML configuration file.",
)
def main(
    token: str | None,
    guild_id: int | None,
    log_level: str | None,
    config_path: str,
) -> None:
    """Run the Lopmon Discord bot.

    Configuration priority: CLI flags > environment variables > config file.

    \b
    Environment variables:
      LOPMON_TOKEN      Discord bot token
      LOPMON_GUILD_ID   Development guild ID
      LOPMON_LOG_LEVEL  Logging verbosity
    """
    config = Config.load(
        config_path,
        cli_token=token,
        cli_guild_id=guild_id,
        cli_log_level=log_level,
    )

    logging.basicConfig(
        level=getattr(logging, config.log_level.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    if not config.token:
        raise click.UsageError(
            "A bot token is required. Provide it via --token, the LOPMON_TOKEN "
            "environment variable, or the 'token' key in your config.toml."
        )

    bot = LopmonBot(config)
    asyncio.run(bot.start(config.token))
