# ParkFinder API Guide

Esta guía detalla cómo interactuar con los endpoints de la API de ParkFinder, especificando los requisitos de autenticación y ejemplos de uso.

## Base URL
`http://localhost:8000/api/v1`

---

## 🔐 Autenticación

La API utiliza **JSON Web Tokens (JWT)**. 
- Los endpoints protegidos requieren el encabezado: `Authorization: Bearer <TOKEN>`
- El token se obtiene a través del endpoint de `/auth/login`.

---

## 🛠 Endpoints de Autenticación (`/auth`)

### 1. Registro de Usuario
**Público** | Crea una nueva cuenta.

- **Método:** `POST`
- **Ruta:** `/auth/register`
- **Ejemplo de Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "auth_provider": "local",
  "role": "driver",
  "first_name": "Juan",
  "last_name": "Pérez"
}
```

### 2. Login (Obtener Token)
**Público** | Intercambia credenciales por un token de acceso.

- **Método:** `POST`
- **Ruta:** `/auth/login`
- **Body (form-data):**
  - `username`: `user@example.com`
  - `password`: `securepassword123`
- **Respuesta:**
```json
{
  "access_token": "eyJhbG...",
  "token_type": "bearer"
}
```

### 3. Listar Usuarios
**Requiere Token** | Obtiene la lista de todos los usuarios registrados.

- **Método:** `GET`
- **Ruta:** `/auth/users`
- **Header:** `Authorization: Bearer <TOKEN>`

### 4. Obtener Usuario por ID
**Requiere Token** | Obtiene detalles de un usuario específico.

- **Método:** `GET`
- **Ruta:** `/auth/users/1`
- **Header:** `Authorization: Bearer <TOKEN>`
- **Respuesta:**
```json
{
  "id_user_auth": 1,
  "email": "juan@example.com",
  "is_active": true,
  "role": "admin",
  "profile": {
    "id_profile": 1,
    "first_name": "Juan",
    "last_name": "Pérez",
    "phone": null
  }
}
```

### 5. Actualizar Usuario
**Requiere Token** | Modifica los datos de un usuario y su perfil.

- **Método:** `PUT`
- **Ruta:** `/auth/users/1`
- **Header:** `Authorization: Bearer <TOKEN>`
- **Ejemplo de Body:**
```json
{
  "profile": {
    "first_name": "Juan Carlos",
    "last_name": "Pérez Modificado",
    "phone": "123456789"
  },
  "role": "admin",
  "is_active": true
}
```
- **Respuesta:** Objeto de usuario completo actualizado (incluyendo perfil).

### 6. Eliminar Usuario (Lógico)
**Requiere Token (Mismo usuario, dev o admin)** | Desactiva una cuenta de usuario.

- **Método:** `DELETE`
- **Ruta:** `/auth/users/1`
- **Header:** `Authorization: Bearer <TOKEN>`

### 7. Obtener mi Perfil (/me)
**Requiere Token** | Obtiene los detalles del usuario actualmente autenticado.

- **Método:** `GET`
- **Ruta:** `/auth/me`
- **Header:** `Authorization: Bearer <TOKEN>`

### 8. Social Login (Google/Apple)
**Público** | Autenticación mediante proveedores externos.

- **Método:** `POST`
- **Ruta:** `/auth/social-login`
- **Ejemplo de Body:**
```json
{
  "email": "user@google.com",
  "auth_provider": "google",
  "role": "driver",
  "provider_id": "123456789",
  "first_name": "Juan",
  "last_name": "Pérez"
}
```

### 9. Información de Base de Datos
**Público** | Verifica el host de la base de datos activa.

- **Método:** `GET`
- **Ruta:** `/auth/db-info`

---

## 🚗 Endpoints de Vehículos (`/vehicles`)

### 1. Listar mis Vehículos
**Requiere Token** | Obtiene los vehículos asociados al perfil del usuario autenticado.

- **Método:** `GET`
- **Ruta:** `/vehicles/`
- **Header:** `Authorization: Bearer <TOKEN>`

### 2. Listar Vehículos por Usuario (ID Perfil)
**Requiere Token** | Obtiene los vehículos de un perfil específico.

- **Método:** `GET`
- **Ruta:** `/vehicles/user/{id_profile}`
- **Header:** `Authorization: Bearer <TOKEN>`

### 3. Registrar Vehículo
**Requiere Token (Rol: driver)** | Registra un nuevo vehículo para el conductor.

- **Método:** `POST`
- **Ruta:** `/vehicles/`
- **Header:** `Authorization: Bearer <TOKEN>`
- **Ejemplo de Body:**
```json
{
  "license_plate": "ABC-1234",
  "model": "Toyota Corolla 2023"
}
```

### 4. Actualizar Vehículo
**Requiere Token (Rol: driver + Dueño)** | Modifica los datos de un vehículo existente.

- **Método:** `PUT`
- **Ruta:** `/vehicles/1`
- **Header:** `Authorization: Bearer <TOKEN>`
- **Ejemplo de Body:**
```json
{
  "license_plate": "XYZ-9876",
  "model": "Toyota Corolla 2024",
  "is_active": false
}
```

### 5. Eliminar Vehículo (Lógico)
**Requiere Token (Rol: driver + Dueño)** | Desactiva un vehículo.

- **Método:** `DELETE`
- **Ruta:** `/vehicles/1`
- **Header:** `Authorization: Bearer <TOKEN>`

---

## 🅿️ Endpoints de Estacionamientos (`/parkings`)

### 1. Listar mis Estacionamientos
**Requiere Token** | Obtiene los estacionamientos asociados al perfil del usuario autenticado.

- **Método:** `GET`
- **Ruta:** `/parkings/`
- **Header:** `Authorization: Bearer <TOKEN>`

### 2. Listar Estacionamientos por Usuario (ID Perfil)
**Requiere Token** | Obtiene los estacionamientos de un perfil específico.

- **Método:** `GET`
- **Ruta:** `/parkings/user/{id_profile}`
- **Header:** `Authorization: Bearer <TOKEN>`

### 3. Registrar Estacionamiento
**Requiere Token (Rol: park)** | Registra una nueva playa de estacionamiento.

- **Método:** `POST`
- **Ruta:** `/parkings/`
- **Header:** `Authorization: Bearer <TOKEN>`
- **Ejemplo de Body:**
```json
{
  "name": "Central Park",
  "base_hourly_rate": 500.00
}
```

### 4. Actualizar Estacionamiento
**Requiere Token (Rol: park + Dueño)** | Modifica los datos de un estacionamiento.

- **Método:** `PUT`
- **Ruta:** `/parkings/1`
- **Header:** `Authorization: Bearer <TOKEN>`
- **Ejemplo de Body:**
```json
{
  "name": "Central Park Modificado",
  "base_hourly_rate": 600.00,
  "is_active": true
}
```

### 5. Eliminar Estacionamiento (Lógico)
**Requiere Token (Rol: park + Dueño)** | Desactiva un estacionamiento.

- **Método:** `DELETE`
- **Ruta:** `/parkings/1`
- **Header:** `Authorization: Bearer <TOKEN>`

### 6. Ver Disponibilidad (Por Playa)
**Requiere Token** | Obtiene el conteo en tiempo real de espacios totales, ocupados y disponibles.

- **Método:** `GET`
- **Ruta:** `/parkings/{id_parking}/availability`
- **Header:** `Authorization: Bearer <TOKEN>`
- **Respuesta:**
```json
{
  "id_parking": 1,
  "total_capacity": 50,
  "total_occupied": 10,
  "total_available": 40,
  "categories": [
    {
      "id_category": 1,
      "name": "Auto",
      "max_capacity": 40,
      "occupied": 8,
      "available": 32,
      "price_multiplier": 1.0
    }
  ]
}
```

### 7. Ver Disponibilidad Global
**Requiere Token** | Obtiene un resumen de disponibilidad de todos los estacionamientos activos.

- **Método:** `GET`
- **Ruta:** `/parkings/availability/all`
- **Header:** `Authorization: Bearer <TOKEN>`

---

## 🗂 Endpoints de Categorías de Espacio (`/parkings/{id}/categories`)

### 1. Listar Categorías
**Requiere Token** | Obtiene las categorías de un estacionamiento (Auto, Moto, etc.).

- **Método:** `GET`
- **Ruta:** `/parkings/1/categories/`
- **Header:** `Authorization: Bearer <TOKEN>`

### 2. Registrar Categoría
**Requiere Token (Rol: park + Dueño)** | Crea una nueva categoría con su capacidad y multiplicador.

- **Método:** `POST`
- **Ruta:** `/parkings/1/categories/`
- **Header:** `Authorization: Bearer <TOKEN>`
- **Ejemplo de Body:**
```json
{
  "name": "Moto",
  "max_capacity": 10,
  "price_multiplier": 0.5
}
```

### 3. Actualizar Categoría
**Requiere Token (Rol: park + Dueño)** | Modifica datos de una categoría.

- **Método:** `PUT`
- **Ruta:** `/parkings/1/categories/1`
- **Header:** `Authorization: Bearer <TOKEN>`

### 4. Eliminar Categoría (Lógico)
**Requiere Token (Rol: park + Dueño)** | Desactiva una categoría.

- **Método:** `DELETE`
- **Ruta:** `/parkings/1/categories/1`
- **Header:** `Authorization: Bearer <TOKEN>`

---

## 📅 Endpoints de Reservas (`/bookings`)

### 1. Crear Reserva
**Requiere Token (Rol: driver)** | Realiza una reserva en un estacionamiento. Registra el método de pago en Mercado Pago (Tokenización) y crea una factura inicial. Verifica disponibilidad concurrente.

- **Método:** `POST`
- **Ruta:** `/bookings/`
- **Header:** `Authorization: Bearer <TOKEN>`
- **Ejemplo de Body:**
```json
{
  "id_vehicle": 1,
  "id_parking": 1,
  "id_category": 1,
  "expected_start_time": "2026-05-10T10:00:00Z",
  "expected_end_time": "2026-05-10T12:00:00Z",
  "card_token": "92a2a0753066d9ab...",
  "payment_method_id": "visa"
}
```

### 2. Control de Barrera (Check-in / Check-out con Mercado Pago)
**Público (Simulador/ANPR)** | Procesa el ingreso o egreso de vehículos por patente. Al egresar (Check-out), calcula la estadía en horas (redondeando hacia arriba), cobra automáticamente usando la tarjeta tokenizada en Mercado Pago (Checkout API / Test Accounts), actualiza la factura y guarda la transacción.

- **Método:** `POST`
- **Ruta:** `/bookings/barrier/check`
- **Ejemplo de Body:**
```json
{
  "id_parking": 1,
  "license_plate": "ABC-1234"
}
```
- **Respuesta de Egreso (Check-out Exitoso):**
```json
{
  "status": "allowed",
  "action": "check-out",
  "message": "Salida autorizada para Toyota Corolla 2023 (ABC-1234). ¡Gracias por elegirnos! Total cobrado: $550.00",
  "booking_id": 1,
  "vehicle_model": "Toyota Corolla 2023",
  "total_charged": 550.0,
  "payment_status": "paid"
}
```

- **Respuesta de Egreso (Check-out Fallido - Pago Rechazado):**
```json
{
  "status": "denied",
  "action": "none",
  "message": "Acceso denegado. El cobro automático de $550.00 fue rechazado por Mercado Pago. Verifique su medio de pago.",
  "booking_id": 1,
  "total_charged": 550.0,
  "payment_status": "failed"
}
```

### 2. Listar mis Reservas
**Requiere Token** | Obtiene el historial de reservas del usuario autenticado.

- **Método:** `GET`
- **Ruta:** `/bookings/me`
- **Header:** `Authorization: Bearer <TOKEN>`

### 3. Actualizar Estado de Reserva
**Requiere Token** | Cambia el estado de una reserva (ej: `active`, `completed`, `cancelled`). Registra el cambio en el historial.

- **Método:** `PUT`
- **Ruta:** `/bookings/{id_booking}/status?new_status=active`
- **Header:** `Authorization: Bearer <TOKEN>`

### 4. Listar Reservas de un Estacionamiento (Owner)
**Requiere Token (Rol: park + Dueño)** | Obtiene todas las reservas de un estacionamiento específico.

- **Método:** `GET`
- **Ruta:** `/bookings/parking/{id_parking}`
- **Header:** `Authorization: Bearer <TOKEN>`
- **Respuesta (200 OK):**
```json
[
  {
    "id_booking": 10,
    "id_profile": 2,
    "id_vehicle": 5,
    "id_parking": 1,
    "id_category": 1,
    "expected_start_time": "2026-05-01T20:00:00-03:00",
    "expected_end_time": "2026-05-01T22:00:00-03:00",
    "applied_rate": 1500.0,
    "current_status": "pending"
  }
]
```

---

## 📋 Resumen de Requisitos (Actualizado)

| Endpoint | Método | Autenticación | Rol Requerido |
| :--- | :--- | :--- | :--- |
| `/auth/register` | POST | 🔓 Público | N/A |
| `/auth/login` | POST | 🔓 Público | N/A |
| `/auth/social-login` | POST | 🔓 Público | N/A |
| `/auth/db-info` | GET | 🔓 Público | N/A |
| `/auth/me` | GET | 🔐 Bearer Token | N/A |
| `/auth/users` | GET | 🔐 Bearer Token | N/A |
| `/auth/users/{id}` | GET | 🔐 Bearer Token | N/A |
| `/auth/users/{id}` | PUT | 🔐 Bearer Token | N/A |
| `/auth/users/{id}` | DELETE | 🔐 Bearer Token | `self`, `dev`, `admin` |
| `/vehicles/` | GET | 🔐 Bearer Token | N/A |
| `/vehicles/user/{id}` | GET | 🔐 Bearer Token | N/A |
| `/vehicles/` | POST | 🔐 Bearer Token | `driver` |
| `/vehicles/{id}` | PUT | 🔐 Bearer Token | `driver` |
| `/vehicles/{id}` | DELETE | 🔐 Bearer Token | `driver` |
| `/parkings/` | GET | 🔐 Bearer Token | N/A |
| `/parkings/user/{id}` | GET | 🔐 Bearer Token | N/A |
| `/parkings/` | POST | 🔐 Bearer Token | `park` |
| `/parkings/{id}` | PUT | 🔐 Bearer Token | `park` |
| `/parkings/{id}` | DELETE | 🔐 Bearer Token | `park` |
| `/parkings/{id}/availability` | GET | 🔐 Bearer Token | N/A |
| `/parkings/availability/all` | GET | 🔐 Bearer Token | N/A |
| `/parkings/{id}/categories/` | GET | 🔐 Bearer Token | N/A |
| `/parkings/{id}/categories/` | POST | 🔐 Bearer Token | `park` |
| `/parkings/{id}/categories/{id}` | PUT | 🔐 Bearer Token | `park` |
| `/parkings/{id}/categories/{id}` | DELETE | 🔐 Bearer Token | `park` |
| `/bookings/` | POST | 🔐 Bearer Token | `driver` |
| `/bookings/me` | GET | 🔐 Bearer Token | N/A |
| `/bookings/parking/{id}` | GET | 🔐 Bearer Token | `park` |
| `/bookings/{id}/status` | PUT | 🔐 Bearer Token | N/A |