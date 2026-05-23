import sys
import os

# Add LicensePlates-ANPR to path
anpr_path = "/Users/indalecio/adm_proyetos/ParkFinder/LicensePlates-ANPR"
if anpr_path not in sys.path:
    sys.path.append(anpr_path)

print("Intentando importar dependencias de ANPR...")
try:
    import ultralytics
    print("ultralytics importado con éxito!")
except ImportError as e:
    print(f"Error al importar ultralytics: {e}")

try:
    import supervision as sv
    print("supervision importado con éxito!")
except ImportError as e:
    print(f"Error al importar supervision: {e}")

try:
    from fast_plate_ocr import ONNXPlateOCR
    print("fast_plate_ocr importado con éxito!")
except ImportError as e:
    print(f"Error al importar fast_plate_ocr: {e}")

try:
    from src.cli import DetectorType, get_processor
    print("src.cli (ANPR Core) importado con éxito!")
except ImportError as e:
    print(f"Error al importar src.cli: {e}")
