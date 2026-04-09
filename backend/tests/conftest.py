import sys
import os

# Agrega el directorio raíz del backend al path de Python
# para que pytest pueda encontrar el módulo main.py
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))