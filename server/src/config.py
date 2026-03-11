"""
config.py
---------
Single place for all configuration values.

SOLID – Single Responsibility:
  This module only holds configuration. Nothing else imports its own paths or
  constants; they all read from here. When we later switch to a database, only
  this file (and the repositories) need to change.
"""

import os

# Absolute path to THIS file so we can compute sibling paths reliably,
# regardless of where the server process is started from.
_HERE = os.path.dirname(os.path.abspath(__file__))

# Root of the server package (one level up from src/)
SERVER_ROOT = os.path.dirname(_HERE)

# Where the plain-text JSON "database" lives (local dev fallback).
DATABASE_PATH = os.path.join(SERVER_ROOT, "data", "database.json")

# MongoDB connection string — set this env var on Render (production).
# Format: mongodb+srv://user:pass@cluster.mongodb.net/wishlist?retryWrites=true&w=majority
# Leave unset locally to keep using the JSON file.
MONGO_URI = os.environ.get("MONGO_URI", None)

# Host and port — Render injects PORT automatically.
SERVER_HOST = os.environ.get("HOST", "127.0.0.1")
SERVER_PORT = int(os.environ.get("PORT", 5000))

# Length (in bytes) of the random auth tokens we hand out on login.
# 32 bytes → 64 hex chars, practically unguessable.
TOKEN_BYTE_LENGTH = 32
