# Guía de la Aplicación My Conta-AI

## Requisitos para Timbrar

Para poder timbrar una factura en My Conta-AI, el usuario DEBE tener:

1. **CSD Configurado**
   - Archivo `.cer` (certificado) cargado en Configuración
   - Archivo `.key` (llave privada) cargado en Configuración
   - Contraseña del CSD válida
   - El CSD debe estar vigente (no expirado)

2. **Datos del Receptor Completos**
   - RFC válido (12-13 caracteres)
   - Nombre completo o razón social
   - Régimen fiscal del receptor (catálogo SAT)
   - Código postal (5 dígitos)
   - Uso de CFDI (G01, G03, I01, etc.)

3. **Conceptos Válidos**
   - Al menos un concepto agregado
   - Clave de producto/servicio del SAT
   - Cantidad mayor a 0
   - Clave de unidad (H87 = Pieza, E48 = Servicio)
   - Valor unitario mayor a 0
   - Objeto de impuesto (01 = No objeto, 02 = Sí objeto)

## Botón de Timbrar Deshabilitado

Si el botón "Timbrar" aparece deshabilitado, verifica:

- [ ] ¿El RFC del receptor tiene 12-13 caracteres?
- [ ] ¿El código postal tiene 5 dígitos?
- [ ] ¿Hay al menos un concepto agregado?
- [ ] ¿El PAC está configurado? (ver Configuración → PAC)

## Flujo de Estados de una Factura

```
BORRADOR → GENERADA → FIRMADA → TIMBRANDO → TIMBRADA
                                      ↓
                                   ERROR (si falla)
```

- **BORRADOR**: Datos incompletos, se guarda en "Pendientes"
- **GENERADA**: Todos los datos completos, lista para firmar
- **FIRMADA**: Sello digital aplicado con CSD
- **TIMBRANDO**: Enviada al PAC (Solución Factible)
- **TIMBRADA**: UUID asignado, factura válida ante el SAT
- **ERROR**: Falló el timbrado (revisar mensaje de error)

## Navegación en la App

| Sección | Ruta | Descripción |
|---------|------|-------------|
| Dashboard | `/dashboard` | Panel principal con estadísticas |
| Facturas | `/facturas` | Listado de todas las facturas |
| Pendientes | `/pendientes` | Facturas por timbrar |
| Clientes | `/clientes` | Directorio de clientes |
| Configuración | `/configuracion` | Datos del emisor y CSD |

## Atajos del Asistente IA

El asistente puede navegar automáticamente con estos comandos:

- "Ir al dashboard" → `[NAV:dashboard]`
- "Ver facturas" → `[NAV:invoices]`
- "Nueva factura" → `[NAV:new-invoice]`
- "Ver clientes" → `[NAV:clients]`
- "Configuración" → `[NAV:settings]`
- "Pendientes" → `[NAV:pending]`

## Configuración del PAC (Proveedor de Timbrado)

Para configurar Solución Factible (sandbox):

1. Ve a Configuración → PAC
2. Proveedor: Solución Factible
3. Modo: Sandbox (pruebas)
4. Usuario: `testing@solucionfactible.com`
5. Contraseña: `timbrado.SF.16672`
6. RFC Emisor: Tu RFC (ej: `GUIM980220L20`)
7. Haz clic en "Probar Conexión"
8. Guarda la configuración

## Datos Demo del Dashboard

Valores por defecto para demostración:

- **Total Facturado**: $124,500.00
- **Facturas Emitidas**: 48
- **Clientes Activos**: 12
