# Flujo de Registro y Login - Vinculación con Google Sheets

## Resumen de Cambios Realizados

### ✅ Registro Normal (Email/Password)

**Endpoint:** `POST /api/auth/signup`

**Flujo:**
1. Usuario llena formulario: `name`, `email`, `password`
2. Se genera código de verificación de 6 dígitos
3. Se crea usuario en memoria con `verified: false`
4. **Google Sheets - createUser:**
   ```javascript
   {
     userId: USR-{timestamp},
     email: email,
     name: name,
     googleId: '',
     driveFolderId: '',
     driveFolderUrl: '',
     password: password  // ✅ AHORA SE GUARDA LA CONTRASEÑA
   }
   ```
5. **Google Drive - createUserFolder:**
   - Crea carpeta principal del usuario
   - Crea subcarpetas (Documentos OCR, etc.)
6. **Google Sheets - updateUser:**
   - Actualiza `driveFolderId` y `driveFolderUrl` después de crear la carpeta ✅
7. Envía código de verificación por email
8. Usuario verifica código → `POST /api/auth/verify`
9. **Google Sheets - updateUser:**
   - Marca usuario como `verified: true` ✅
   - Actualiza `driveFolderId` y `driveFolderUrl` si existen ✅
10. Usuario redirigido al Dashboard

---

### ✅ Login sin Registro Previo

**Endpoint:** `POST /api/auth/login`

**Flujo:**
1. Usuario ingresa `email` y `password` (sin estar registrado)
2. Sistema NO encuentra usuario en memoria ni Google Sheets
3. **Crea usuario automáticamente:**
   - Genera código de verificación
   - Crea usuario en memoria con `verified: false`
4. **Google Drive - createUserFolder:**
   - Crea carpeta principal del usuario
   - Crea subcarpetas
5. **Google Sheets - updateUser:**
   - Actualiza `driveFolderId` y `driveFolderUrl` después de crear la carpeta ✅
6. **Google Sheets - createUser:**
   ```javascript
   {
     userId: USR-{timestamp},
     email: email,
     name: email.split('@')[0],
     googleId: '',
     driveFolderId: '',
     driveFolderUrl: '',
     password: password  // ✅ SE GUARDA LA CONTRASEÑA
   }
   ```
7. Envía código de verificación por email
8. Devuelve `{ success: true, needsVerification: true, user: {...} }`
9. Frontend redirige a pantalla de verificación
10. Usuario verifica código → `POST /api/auth/verify`
11. **Google Sheets - updateUser:**
    - Marca usuario como `verified: true` ✅
    - Actualiza `driveFolderId` y `driveFolderUrl` ✅
12. Usuario redirigido al Dashboard

---

### ✅ Google Sign-Up

**Endpoint:** `POST /api/auth/google-signup`

**Flujo:**
1. Usuario autentica con Google (One Tap / OAuth)
2. Se obtiene `email` y `name` de Google
3. Se genera `autoPassword` automático
4. **Google Drive - createUserFolder:**
   - Crea carpeta principal del usuario
   - Crea subcarpetas
5. **Google Sheets - createUser:**
   ```javascript
   {
     userId: USR-{timestamp},
     email: email,
     name: name,
     googleId: `google_{timestamp}`,
     driveFolderId: folderData.userFolderId,
     driveFolderUrl: folderData.userFolderUrl,
     password: autoPassword  // ✅ SE GUARDA LA CONTRASEÑA AUTO-GENERADA
   }
   ```
6. Usuario marcado como `verified: true` (ya verificado por Google)
7. Usuario redirigido al Dashboard directamente

---

### ✅ Google Login (Usuario Existente)

**Endpoint:** `POST /api/auth/google-login`

**Flujo:**
1. Usuario autentica con Google
2. Sistema busca usuario en memoria → Si no encuentra, busca en Google Sheets
3. **Google Sheets - getUser:**
   ```javascript
   {
     UserID: '...',
     Nombre: '...',
     Email: '...',
     Password: '...',
     GoogleID: '...',
     DriveFolderID: '...',
     DriveFolderUrl: '...',
     FechaRegistro: '...'
   }
   ```
4. Si encuentra usuario → Login normal ✅
5. Si NO encuentra usuario → Crea usuario nuevo (mismo flujo que Google Sign-Up) ✅
6. Si usuario existe pero NO tiene `driveFolderId` → Crea carpeta y actualiza ✅

---

## Campos en Google Sheets

La hoja de cálculo de Google Sheets debe tener estas columnas (orden no importante):

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `UserID` | String | ID único del usuario (USR-{timestamp}) |
| `Nombre` | String | Nombre completo del usuario |
| `Email` | String | Email del usuario (clave única) |
| `Password` | String | Contraseña (en texto plano para desarrollo) |
| `GoogleID` | String | ID de Google (google_{timestamp} o vacío) |
| `DriveFolderID` | String | ID de la carpeta principal en Google Drive |
| `DriveFolderUrl` | String | URL de la carpeta principal en Google Drive |
| `FechaRegistro` | String | Fecha de registro (ISO 8601) |
| `Verificado` | String | "true" o "false" |

---

## Verificación de Datos

### Al hacer Login después de Registro:

1. ✅ Sistema busca usuario en memoria primero
2. ✅ Si no encuentra, busca en Google Sheets con `getUser({ email })`
3. ✅ Google Sheets devuelve TODOS los campos del usuario
4. ✅ Sistema reconstruye el objeto user con los campos correctos:
   ```javascript
   user = {
     id: d.UserID || d.userId,
     name: d.Nombre || d.nombre,
     email: d.Email || d.email,
     password: d.Password || d.password,
     verified: true,
     googleId: d.GoogleID || d.googleId,
     driveFolderId: d.DriveFolderID || d.driveFolderId,
     driveFolderUrl: d.DriveFolderUrl || d.driveFolderUrl,
     createdAt: d.FechaRegistro || d.fechaAlta
   }
   ```
5. ✅ Usuario hace login exitosamente con sus credenciales almacenadas

---

## Correcciones Aplicadas

| Archivo | Corrección |
|---------|-----------|
| `server.ts` | ✅ `/api/auth/signup` ahora envía `password` a Google Sheets |
| `server.ts` | ✅ `/api/auth/signup` actualiza `driveFolderId` después de crear carpeta |
| `server.ts` | ✅ `/api/auth/verify` ahora actualiza usuario como `verified: true` en Google Sheets |
| `server.ts` | ✅ `/api/auth/verify` actualiza `driveFolderId` y `driveFolderUrl` en Google Sheets |
| `server.ts` | ✅ `/api/auth/login` (auto-creación) actualiza `driveFolderId` después de crear carpeta |
| `server.ts` | ✅ Todos los flujos guardan correctamente la contraseña en Google Sheets |

---

## Pruebas Recomendadas

### Prueba 1: Registro Normal
1. Llenar formulario de registro con email, password, nombre
2. Verificar que se cree usuario en Google Sheets con TODOS los campos
3. Verificar que se cree carpeta en Google Drive
4. Verificar que Google Sheets tenga `DriveFolderID` y `DriveFolderUrl` actualizados
5. Verificar código de verificación
6. Hacer logout
7. Hacer login con las mismas credenciales
8. ✅ Debe funcionar correctamente

### Prueba 2: Login sin Registro
1. Ir directamente a login con email/password que NO existe
2. Verificar que se cree usuario automáticamente en Google Sheets
3. Verificar que se cree carpeta en Google Drive
4. Verificar código de verificación
5. Hacer logout
6. Hacer login con las mismas credenciales
7. ✅ Debe funcionar correctamente

### Prueba 3: Google Sign-Up
1. Hacer sign-up con Google
2. Verificar que se cree usuario en Google Sheets con `GoogleID` y `Password` auto-generado
3. Verificar que se cree carpeta en Google Drive
4. ✅ Debe entrar directamente al dashboard

### Prueba 4: Google Login (Usuario Existente)
1. Hacer login con Google (usuario que ya existe)
2. ✅ Debe entrar directamente sin crear nada nuevo

---

## Notas Importantes

⚠️ **Seguridad:** Las contraseñas se guardan en texto plano en Google Sheets. Para producción, se debe implementar hash de contraseñas con bcrypt o similar.

⚠️ **Google Apps Script:** Asegúrate de que tu Google Apps Script tenga las funciones:
- `createUser({ userId, email, name, googleId, driveFolderId, driveFolderUrl, password })`
- `getUser({ email })`
- `updateUser({ email, driveFolderId, driveFolderUrl, verified, googleId, nombre, password })`
- `createUserFolder({ userId, userName, email })`

⚠️ **Campos en Google Sheets:** Los nombres de las columnas deben coincidir exactamente con los esperados por el código (puede ser `UserID` o `userId`, `Nombre` o `nombre`, etc.)
