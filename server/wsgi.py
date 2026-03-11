"""
wsgi.py
-------
Gunicorn entry point for production (Render).
Run locally:  gunicorn wsgi:app
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from src.app import create_app
app = create_app()
