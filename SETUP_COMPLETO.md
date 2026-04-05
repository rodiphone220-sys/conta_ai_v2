# ⚙️ Configuración Completa - My Conta-AI Facturador

## 📋 **Setup del Backend con Sellado Automático**

### **1. Archivos de Configuración**

#### **.env** (Ya configurado)
```env
# CSD Configuration
CSD_CER_FILE="C:\\Users\\ramhe\\OneDrive\\Escritorio\\my-conta-ai-facturador-main_v1\\CERTIFICADO DE SELLO DIGITAL-my-conta-ai-facturador-main_v1\\00001000000518570370.cer"
CSD_KEY_FILE="C:\\Users\\ramhe\\OneDrive\\Escritorio\\my-conta-ai-facturador-main_v1\\CERTIFICADO DE SELLO DIGITAL-my-conta-ai-facturador-main_v1\\CSD_UNICA_GUIM980220L20_20230320_000716.key"
CSD_PASSWORD="Gunsnroses10"

# PAC Configuration
PAC_PROVIDER="solucionfactible"
PAC_MODE="sandbox"
PAC_USER="testing@solucionfactible.com"
PAC_PASSWORD="timbrado.SF.16672"
PAC_RFC_EMISOR="GUIM980220L20"
```

---

### **2. Endpoints del Backend**

#### **POST /api/pac/timbrar** (Con sellado automático)

**Request:**
```json
{
  "xmlBase64": "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4...",
  "autoSell": true
}
```

**Response (Éxito):**
```json
{
  "success": true,
  "uuid": "2572BD75-E586-4FA4-8841-BCE915829910",
  "xmlTimbrado": "PD94bWwgdmVyc2lvbj0iMS4wIi...",
  "fechaTimbrado": "2026-04-01T01:07:00",
  "status": "200",
  "mensaje": "Timbrado exitoso"
}
```

**Response (Error - CSD no configurado):**
```json
{
  "success": false,
  "mensaje": "CSD no configurado. Sube los archivos .cer y .key en Configuración.",
  "autoSell": false,
  "hint": "Puedes enviar autoSell=false para timbrar XML ya sellado"
}
```

---

#### **POST /api/csd/config** (Configurar CSD con rutas personalizadas)

**Request:**
```json
{
  "cerPath": "C:\\Users\\ramhe\\...\\00001000000518570370.cer",
  "keyPath": "C:\\Users\\ramhe\\...\\CSD_UNICA_GUIM980220L20_20230320_000716.key",
  "password": "Gunsnroses10"
}
```

**Response:**
```json
{
  "success": true,
  "message": "CSD configurado correctamente",
  "certificate": {
    "serialNumber": "00001000000518570370",
    "validUntil": "2027-03-20T06:10:14Z",
    "daysUntilExpiration": 354
  }
}
```

---

#### **POST /api/csd/test** (Probar sellado)

**Request:**
```json
{}
```

**Response:**
```json
{
  "success": true,
  "message": "Sellado de prueba exitoso",
  "noCertificado": "00001000000518570370",
  "selloLength": 344
}
```

---

### **3. Flujo de Timbrado en la App**

```
1. Usuario llena formulario de factura
   ↓
2. Frontend genera XML (sin sello)
   ↓
3. POST /api/pac/timbrar { xmlBase64, autoSell: true }
   ↓
4. Backend:
   a. Verifica CSD configurado
   b. Genera cadena original
   c. Firma con SHA-256 + RSA
   d. Inserta sello y certificado en XML
   e. Envía al PAC
   ↓
5. PAC responde con UUID
   ↓
6. Backend guarda factura timbrada
   ↓
7. Frontend muestra UUID y descarga PDF/XML
```

---

### **4. Comandos de Prueba**

#### **Verificar que el backend está corriendo:**
```powershell
curl http://localhost:3001/api/health
```

#### **Probar configuración del CSD:**
```powershell
curl -X POST http://localhost:3001/api/csd/test `
  -H "Content-Type: application/json" `
  -Body "{}"
```

#### **Probar timbrado con sellado automático:**
```powershell
# Generar XML de prueba
$xml = '<?xml version="1.0" encoding="UTF-8"?><cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" Serie="A" Folio="1" Fecha="2026-04-01T00:00:00" Sello="" FormaPago="01" NoCertificado="" Certificado="" SubTotal="100.00" Total="116.00" TipoDeComprobante="I" Exportacion="01" LugarExpedicion="79140" MetodoPago="PUE" Moneda="MXN"><cfdi:Emisor Rfc="GUIM980220L20" Nombre="MARIO ALBERTO GUERRERO IBARRA" RegimenFiscal="626"/><cfdi:Receptor Rfc="VIPE9401251Z5" Nombre="ESMERALDA VICENCIO PADRON" DomicilioFiscalReceptor="32320" RegimenFiscalReceptor="612" UsoCFDI="G03"/><cfdi:Conceptos><cfdi:Concepto ClaveProdServ="84111500" ClaveUnidad="E48" Cantidad="1" Descripcion="HONORARIOS CONTABLES" ValorUnitario="862.07" Importe="862.07" ObjetoImp="02"><cfdi:Impuestos><cfdi:Traslados><cfdi:Traslado Base="862.07" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="137.93"/></cfdi:Traslados></cfdi:Impuestos></cfdi:Concepto></cfdi:Conceptos><cfdi:Impuestos TotalImpuestosTrasladados="137.93"><cfdi:Traslados><cfdi:Traslado Base="862.07" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="137.93"/></cfdi:Traslados></cfdi:Impuestos></cfdi:Comprobante>'

# Convertir a Base64
$xmlBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($xml))

# Enviar al backend
curl -X POST http://localhost:3001/api/pac/timbrar `
  -H "Content-Type: application/json" `
  -Body "{`"xmlBase64`":`"$xmlBase64`",`"autoSell`":true}"
```

---

### **5. Configuración del Frontend**

#### **Componente: InvoiceForm.tsx**

El frontend ya está configurado para usar el endpoint `/api/pac/timbrar` con `autoSell: true` por defecto.

**Función de timbrado:**
```typescript
const handleTimbrar = async () => {
  setTimbrando(true);
  
  try {
    // Generar XML
    const xmlSinSello = generarCFDI(formData);
    const xmlBase64 = btoa(xmlSinSello);
    
    // Enviar al backend con autoSell: true
    const response = await fetch(`${API_URL}/api/pac/timbrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        xmlBase64, 
        autoSell: true  // ← El backend sella automáticamente
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      toast.success('¡Factura timbrada!', {
        description: `UUID: ${result.uuid}`
      });
      setInvoiceStatus('TIMBRADA');
      setUuid(result.uuid);
    } else {
      toast.error('Error al timbrar', {
        description: result.mensaje
      });
    }
  } catch (error) {
    toast.error('Error de conexión', {
      description: 'No se pudo conectar con el servidor'
    });
  } finally {
    setTimbrando(false);
  }
};
```

---

### **6. Estados de la Factura**

| Estado | Descripción | Acciones Disponibles |
|--------|-------------|---------------------|
| **BORRADOR** | Datos incompletos | Editar, Guardar como Pendiente |
| **GENERADA** | XML generado (sin sello) | Timbrar, Editar |
| **FIRMADA** | XML sellado con CSD | Timbrar, Ver XML |
| **TIMBRANDO** | Enviada al PAC | Esperar |
| **TIMBRADA** | UUID obtenido | Descargar PDF/XML, Cancelar |
| **ERROR** | Error en timbrado | Reintentar, Ver error |
| **CANCELADA** | Factura cancelada | Ver XML de cancelación |

---

### **7. Variables de Entorno**

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `CSD_CER_FILE` | Ruta al .cer | Certificado de Sello Digital |
| `CSD_KEY_FILE` | Ruta al .key | Llave privada del CSD |
| `CSD_PASSWORD` | Contraseña | Password del CSD |
| `PAC_PROVIDER` | `solucionfactible` | Proveedor de timbrado |
| `PAC_MODE` | `sandbox` | Ambiente (sandbox/production) |
| `PAC_USER` | Email | Usuario del PAC |
| `PAC_PASSWORD` | Password | Contraseña del PAC |
| `PAC_RFC_EMISOR` | RFC | RFC del emisor |

---

### **8. Troubleshooting**

#### **Error: "CSD no configurado"**

**Causa:** Los archivos .cer o .key no existen en las rutas especificadas.

**Solución:**
```powershell
# Verificar rutas
Test-Path "C:\Users\ramhe\OneDrive\Escritorio\my-conta-ai-facturador-main_v1\CERTIFICADO DE SELLO DIGITAL-my-conta-ai-facturador-main_v1\00001000000518570370.cer"
Test-Path "C:\Users\ramhe\OneDrive\Escritorio\my-conta-ai-facturador-main_v1\CERTIFICADO DE SELLO DIGITAL-my-conta-ai-facturador-main_v1\CSD_UNICA_GUIM980220L20_20230320_000716.key"
```

#### **Error: "Contraseña incorrecta"**

**Causa:** La contraseña del CSD es incorrecta.

**Solución:** Verificar en el archivo `.env` que `CSD_PASSWORD` sea correcta.

#### **Error: "unknown" del PAC**

**Causa:** El CSD no está autorizado en el sandbox del PAC.

**Solución:** Enviar email a Leonardo (leo@solucionfactible.com) con:
- UUID de un timbrado exitoso previo
- No. de certificado
- RFC del emisor

---

### **9. Próximos Pasos**

1. ✅ **Backend configurado** - Sellado automático listo
2. ⏳ **Esperar respuesta de Leonardo** - Para activar CSD en sandbox
3. ⏳ **Probar timbrado real** - Cuando Leonardo active el CSD
4. ⏳ **Integrar con frontend** - Conectar InvoiceForm con el backend
5. ⏳ **Pruebas end-to-end** - Flujo completo desde la UI

---

## 📞 **Soporte**

**Solución Factible:**
- Email: leo@solucionfactible.com
- WSDL: https://testing.solucionfactible.com/ws/services/Timbrado?wsdl

**Tu Equipo:**
- Rod Hernández: conceptosaimx@gmail.com
- Tel: 833-289-2730

---

**Última actualización:** 2026-04-01  
**Versión:** 1.0.0
