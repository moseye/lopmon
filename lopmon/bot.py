"""Discord bot class."""

from __future__ import annotations

import logging

import discord
from discord.ext import commands

from .config import Config


class LopmonBot(commands.Bot):
    """The main Lopmon Discord bot."""

    def __init__(self, config: Config) -> None:
        intents = discord.Intents.default()
        super().__init__(command_prefix="!", intents=intents)
        self.config = config
        self.logger = logging.getLogger(__name__)

    async def setup_hook(self) -> None:
        """Load cogs and sync slash commands."""
        await self.load_extension("lopmon.cogs.ping")

        if self.config.guild_id:
            guild = discord.Object(id=self.config.guild_id)
            self.tree.copy_global_to(guild=guild)
            await self.tree.sync(guild=guild)
            self.logger.info("Slash commands synced to guild %s", self.config.guild_id)
        else:
            await self.tree.sync()
            self.logger.info("Slash commands synced globally")

    async def on_ready(self) -> None:
        """Called when the bot is ready."""
        self.logger.info("Logged in as %s (ID: %s)", self.user, self.user.id)
