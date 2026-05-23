import cv2
import time

print("\n📸 Iniciando prueba de cámara para solicitar permisos a macOS...")
print("Por favor, si aparece una ventana emergente pidiendo acceso a la cámara, haz clic en 'OK' o 'Permitir'.\n")

# Intentamos abrir la cámara en el hilo principal para que macOS muestre el popup de permisos
cap = cv2.VideoCapture(0)

# Le damos un segundo a la cámara para inicializar
time.sleep(1)

ret, frame = cap.read()

if ret:
    print("✅ ¡ÉXITO! La cámara se leyó correctamente. Los permisos están configurados.")
else:
    print("❌ ERROR: No se pudo leer la cámara.")
    print("👉 Esto significa que macOS está bloqueando el video.")
    print("👉 Ve a Ajustes del Sistema -> Privacidad y Seguridad -> Cámara.")
    print("👉 Busca 'Terminal' (o la app de consola que uses) y actívala.")

cap.release()
print("\nFinalizado.")
