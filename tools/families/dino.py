"""Adapter exposing the original dino family (defined in tools/species.py) through the same names as other family modules."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from species import SPECIES, EVO, BABIES, LINE, FAMILY  # noqa: E402,F401

NAME = 'Dinos'
IS_FREE = True
FOOD_LABELS = {'meat': 'Meat', 'veggie': 'Veggies', 'pasta': 'Pasta'}
