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

### 7. Social Login (Google/Apple)
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

### 6. Información de Base de Datos
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

### 3. Actualizar Vehículo
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

### 4. Eliminar Vehículo (Lógico)
**Requiere Token (Rol: driver + Dueño)** | Desactiva un vehículo.

- **Método:** `DELETE`
- **Ruta:** `/vehicles/1`
- **Header:** `Authorization: Bearer <TOKEN>`

---

## 📋 Resumen de Requisitos

| Endpoint | Método | Autenticación | Rol Requerido |
| :--- | :--- | :--- | :--- |
| `/auth/register` | POST | 🔓 Público | N/A |
| `/auth/login` | POST | 🔓 Público | N/A |
| `/auth/social-login` | POST | 🔓 Público | N/A |
| `/auth/db-info` | GET | 🔓 Público | N/A |
| `/auth/users` | GET | 🔐 Bearer Token | N/A |
| `/auth/users/{id}` | GET | 🔐 Bearer Token | N/A |
| `/auth/users/{id}` | PUT | 🔐 Bearer Token | N/A |
| `/auth/users/{id}` | DELETE | 🔐 Bearer Token | `self`, `dev`, `admin` |
| `/vehicles/` | GET | 🔐 Bearer Token | N/A |
| `/vehicles/user/{id}` | GET | 🔐 Bearer Token | N/A |
| `/vehicles/` | POST | 🔐 Bearer Token | `driver` |
| `/vehicles/{id}` | PUT | 🔐 Bearer Token | `driver` |
| `/vehicles/{id}` | DELETE | 🔐 Bearer Token | `driver` |
