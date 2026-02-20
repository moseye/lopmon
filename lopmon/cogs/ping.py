"""Ping slash command cog."""

from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands


class PingCog(commands.Cog, name="Ping"):
    """Cog containing the /ping command."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @app_commands.command(name="ping", description="Check bot latency")
    async def ping(self, interaction: discord.Interaction) -> None:
        """Respond with the current bot latency."""
        latency = round(self.bot.latency * 1000)
        await interaction.response.send_message(f"🏓 Pong! Latency: {latency}ms")


async def setup(bot: commands.Bot) -> None:
    """Add the PingCog to the bot."""
    await bot.add_cog(PingCog(bot))
