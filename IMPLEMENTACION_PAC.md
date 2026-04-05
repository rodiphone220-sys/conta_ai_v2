# 🔧 Implementación Técnica - Solución Factible

## Resumen Ejecutivo

Implementamos **3 enfoques** para la integración con Solución Factible:

---

## 1️⃣ Enfoque Principal: XML con Sello Propio

### Archivos Modificados/Creados:
- `server.ts` - Funciones de sellado con node-forge
- `src/lib/xml-generator.ts` - Generador de CFDI 4.0

### Flujo:
```
1. Frontend → POST /api/invoices (datos de factura)
2. Backend → generarCFDI() → XML sin sello
3. Backend → sellarCFDI() → XML sellado (SHA-256 + RSA)
4. Backend → timbrarConPAC() → SOAP con XML sellado
5. PAC → Valida sello + Timbra
6. PAC → Response con UUID
```

### Código de Sellado:
```typescript
// Generar hash SHA-256 de cadena original
const hash = crypto.createHash('sha256');
hash.update(cadenaOriginal);
const digest = hash.digest();

// Firmar con llave privada (RSA + SHA-256)
const sign = crypto.createSign('RSA-SHA256');
sign.update(cadenaOriginal);
sign.end();
const firma = sign.sign(keyPem, 'base64');
```

### Estado: ⚠️ Pendiente validar con PAC
- ✅ Generación de XML funciona
- ✅ Sellado con SHA-256 implementado
- ❌ PAC responde `unknown` (posible problema con cadena original)

---

## 2️⃣ Enfoque Alternativo: JSON → PAC

### Archivos Creados:
- `server.ts` - Endpoint `/api/pac/timbrar-json`
- `src/lib/xml-generator.ts` - Generador de XML

### Flujo:
```
1. Frontend → POST /api/pac/timbrar-json (JSON con datos)
2. Backend → generarCFDI() → XML sin sello
3. Backend → timbrarConPAC() → PAC recibe XML sin sello
4. PAC → Sella + Timbra (con su propio CSD o el nuestro)
5. PAC → Response con UUID
```

### Request JSON:
```json
{
  "rfcEmisor": "ABC123456T1",
  "nombreEmisor": "Mi Empresa SA de CV",
  "rfcReceptor": "XEXX010101000",
  "nombreReceptor": "Publico en General",
  "conceptos": [
    {
      "claveProdServ": "01010101",
      "cantidad": 1,
      "descripcion": "Producto de prueba",
      "valorUnitario": 100.00,
      "importe": 100.00
    }
  ],
  "formaPago": "01",
  "metodoPago": "PUE",
  "lugarExpedicion": "06600"
}
```

### Estado: ✅ Implementado, pendiente probar con PAC
- ✅ Endpoint creado
- ✅ Generador de XML funcional
- ❌ PAC necesita validar si acepta XML sin sello externo

---

## 3️⃣ Enfoque de Debug: SoapUI

### Archivos Creados:
- `test-soap-request.ts` - Genera request SOAP completo
- `test-soap-request.xml` - Request SOAP para pegar en SoapUI

### Instrucciones:
1. Ejecutar: `npx tsx test-soap-request.ts`
2. Abrir SoapUI
3. Crear proyecto con WSDL: `https://testing.solucionfactible.com/ws/services/Timbrado?wsdl`
4. Pegar contenido de `test-soap-request.xml`
5. Ejecutar y ver respuesta completa

### Estado: ✅ Listo para usar
- ✅ Script genera XML válido
- ✅ Instrucciones documentadas
- ⏳ Pendiente ejecutar en SoapUI

---

## 📊 Comparativa de Enfoques

| Enfoque | Ventaja | Desventaja | Recomendado |
|---------|---------|------------|-------------|
| **XML con Sello Propio** | Control total, más seguro | Complejo de implementar | ✅ Sí (producción) |
| **JSON → PAC** | Fácil de integrar | Menos control, posible costo extra | ⚠️ Temporal |
| **SoapUI** | Debug visual, rápido | Manual, no automatizable | ✅ Testing |

---

## 🎯 Próximos Pasos

### Inmediatos (Esta Semana):
1. **Enviar XML de prueba a Leonardo** (Solución Factible)
   - Adjuntar `test-soap-request.xml`
   - Preguntar si la cadena original está bien formada
   - Solicitar XML de ejemplo que SÍ funcione

2. **Probar en SoapUI**
   - Ejecutar script `test-soap-request.ts`
   - Probar diferentes variaciones del XML
   - Documentar errores exactos

3. **Validar CSD**
   - Verificar que el .cer y .key son válidos
   - Confirmar que la contraseña es correcta
   - Verificar vigencia del certificado

### Corto Plazo (Próximas 2 Semanas):
1. **Definir enfoque con Solución Factible**
   - ¿Aceptan XML sellado externamente?
   - ¿Requieren que el PAC haga el sellado?
   - ¿Hay costo adicional por sellado?

2. **Implementar enfoque seleccionado**
   - Completar función `generarCadenaOriginal()` según Anexo 20
   - Insertar sello y certificado en el XML correctamente
   - Manejar errores del PAC gracefulmente

3. **Pruebas End-to-End**
   - Timbrar factura real en sandbox
   - Validar UUID devuelto
   - Descargar XML timbrado
   - Verificar en portal del SAT

---

## 📁 Archivos Clave

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `server.ts` | Backend + sellado + endpoints | ✅ Completo |
| `src/lib/xml-generator.ts` | Generador CFDI 4.0 | ✅ Completo |
| `test-soap-request.ts` | Debug SoapUI | ✅ Listo |
| `test-soap-request.xml` | Request para SoapUI | ✅ Generado |
| `SOLUCION_FACTIBLE_STATUS.md` | Email para Leonardo | ✅ Listo |
| `IMPLEMENTACION_IA.md` | Documentación IA | ✅ Completo |

---

## 🔍 Errores Conocidos

### Error 1: `faultstring: unknown`
**Causa probable:** XML sin sello o cadena original mal formada

**Solución:**
1. Validar cadena original con Anexo 20
2. Asegurar que el sello se inserta correctamente en el XML
3. Verificar que el CSD está vigente

### Error 2: `CSD no configurado`
**Causa:** Faltan archivos .cer o .key en `/certs`

**Solución:**
1. Subir CSD en Configuración → CSD
2. Verificar que `process.env.CSD_PASSWORD` está seteada
3. Revisar logs del backend

---

## 💡 Recomendación Final

**Usar el Enfoque 1 (XML con Sello Propio) para producción** porque:
- ✅ Control total del proceso
- ✅ Más seguro (llaves nunca salen de tu servidor)
- ✅ Menor costo (no pagas sellado al PAC)
- ✅ Más profesional para tu producto

**Usar el Enfoque 2 (JSON → PAC) temporalmente** mientras:
- Depuras el sellado
- Validas con Solución Factible
- Tienes prisa por la demo

---

## 📞 Contacto Soporte

**Solución Factible:**
- Leonardo Madrigal: leo@solucionfactible.com
- WSDL: https://testing.solucionfactible.com/ws/services/Timbrado?wsdl

**Tu Equipo:**
- Rod Hernández: conceptosaimx@gmail.com
- Tel: 833-289-2730

---

**Fecha:** 2026-03-31  
**Versión:** 1.0  
**Estado:** Pendiente validación con PAC
