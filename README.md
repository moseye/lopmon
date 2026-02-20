# lopmon

A Discord bot built with [discord.py](https://discordpy.readthedocs.io/), managed by [UV](https://docs.astral.sh/uv/) and [Hatch](https://hatch.pypa.io/).

## Requirements

- [UV](https://docs.astral.sh/uv/) – Python version & package manager (Python 3.14.3 is pinned via `.python-version`)
- A Discord bot token ([Discord Developer Portal](https://discord.com/developers/applications))

## Setup

```bash
# Install dependencies and create the virtual environment
uv sync
```

## Configuration

Configuration is resolved with **CLI > environment variable > `config.toml`** priority.

### Config file (`config.toml`)

Copy the defaults and fill in your token:

```toml
token    = "your-discord-bot-token-here"
# guild_id = 123456789   # Optional: speeds up slash-command sync during development
log_level = "INFO"
```

### Environment variables

| Variable          | Description                         |
|-------------------|-------------------------------------|
| `LOPMON_TOKEN`    | Discord bot token                   |
| `LOPMON_GUILD_ID` | Development guild ID (optional)     |
| `LOPMON_LOG_LEVEL`| Logging verbosity (default: `INFO`) |

### CLI flags

```
lopmon --help
```

```
Options:
  --token TEXT                  Discord bot token.
  --guild-id INTEGER            Guild ID for faster slash-command sync.
  --log-level [DEBUG|INFO|...]  Logging verbosity.
  --config TEXT                 Path to the TOML configuration file.  [default: config.toml]
```

## Running

```bash
# Using the installed script
uv run lopmon

# Or with an explicit token
uv run lopmon --token "your-token-here"

# Or via environment variable
LOPMON_TOKEN="your-token-here" uv run lopmon
```

## Commands

| Command | Description            |
|---------|------------------------|
| `/ping` | Replies with bot latency |

## Project structure

```
lopmon/
├── lopmon/
│   ├── __init__.py       Package metadata
│   ├── __main__.py       CLI entry point (click)
│   ├── bot.py            LopmonBot class
│   ├── config.py         Config loading (CLI > ENV > TOML)
│   └── cogs/
│       ├── __init__.py
│       └── ping.py       /ping slash command
├── config.toml           Default configuration
├── pyproject.toml        Project metadata (hatchling build system)
└── uv.lock               Locked dependency versions
```
