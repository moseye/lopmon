"""Configuration loading with CLI > ENV > Config file hierarchy."""

from __future__ import annotations

import os
import tomllib
from dataclasses import dataclass
from pathlib import Path


@dataclass
class Config:
    """Runtime configuration for Lopmon."""

    token: str = ""
    guild_id: int | None = None
    log_level: str = "INFO"

    @classmethod
    def load(
        cls,
        config_path: Path | str = "config.toml",
        *,
        cli_token: str | None = None,
        cli_guild_id: int | None = None,
        cli_log_level: str | None = None,
    ) -> "Config":
        """Load configuration using CLI > ENV > Config file priority.

        Args:
            config_path: Path to the TOML config file.
            cli_token: Token supplied via CLI (highest priority).
            cli_guild_id: Guild ID supplied via CLI (highest priority).
            cli_log_level: Log level supplied via CLI (highest priority).

        Returns:
            A populated :class:`Config` instance.
        """
        cfg = cls()

        # 1. Config file (lowest priority)
        config_file = Path(config_path)
        if config_file.exists():
            with open(config_file, "rb") as fh:
                data = tomllib.load(fh)
            if "token" in data:
                cfg.token = data["token"]
            if "guild_id" in data:
                cfg.guild_id = int(data["guild_id"])
            if "log_level" in data:
                cfg.log_level = data["log_level"]

        # 2. Environment variables (override config file)
        if env_token := os.environ.get("LOPMON_TOKEN"):
            cfg.token = env_token
        if env_guild_id := os.environ.get("LOPMON_GUILD_ID"):
            cfg.guild_id = int(env_guild_id)
        if env_log_level := os.environ.get("LOPMON_LOG_LEVEL"):
            cfg.log_level = env_log_level

        # 3. CLI arguments (highest priority)
        if cli_token is not None:
            cfg.token = cli_token
        if cli_guild_id is not None:
            cfg.guild_id = cli_guild_id
        if cli_log_level is not None:
            cfg.log_level = cli_log_level

        return cfg
