# 📧 Email para Leonardo - Solución Factible

---

**Para:** leo@solucionfactible.com  
**Asunto:** Error "unknown" en timbrado SOAP - Necesito validación de XML CFDI 4.0

---

Hola Leonardo,

Espero estés teniendo un excelente día.

Te escribo para solicitarte apoyo con la integración de su WebService de timbrado en nuestra aplicación **My Conta-AI**.

## 🎯 Estado Actual

Ya logramos establecer conexión exitosa con su sandbox desde SoapUI 5.9.1, pero obtenemos un error consistente que necesitamos tu ayuda para interpretar.

## 📋 Datos de la Prueba

| Concepto | Valor |
|----------|-------|
| **Endpoint** | `https://testing.solucionfactible.com/ws/services/Timbrado` |
| **Usuario** | `testing@solucionfactible.com` |
| **Password** | `timbrado.SF.16672` |
| **Herramienta** | SoapUI 5.9.1 |
| **Fecha de prueba** | 31 de Marzo, 2026 |

## ❌ Error Obtenido

**Request SOAP enviado:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
                  xmlns:ws="http://timbrado.ws.cfdi.solucionfactible.com">
  <soapenv:Header/>
  <soapenv:Body>
    <ws:timbrar>
      <ws:usuario>testing@solucionfactible.com</ws:usuario>
      <ws:password>timbrado.SF.16672</ws:password>
      <ws:cfdiBase64>[BASE64_DEL_CFDI_4.0]</ws:cfdiBase64>
    </ws:timbrar>
  </soapenv:Body>
</soapenv:Envelope>
```

**Response recibido:**
```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <soapenv:Fault>
      <faultcode>soapenv:Server</faultcode>
      <faultstring>unknown</faultstring>
      <detail/>
    </soapenv:Fault>
  </soapenv:Body>
</soapenv:Envelope>
```

## 📊 Análisis Preliminar

El error `faultstring: unknown` indica que el servidor recibió el request pero no puede procesar el XML. Basado en nuestra investigación, las posibles causas son:

1. **El CFDI no tiene sello digital** - ¿Es requerido el sello para el sandbox?
2. **La cadena original está mal formada** - ¿Nos pueden proporcionar el formato exacto según Anexo 20?
3. **El RFC del emisor no está registrado** - ¿El RFC `XIQB891116QE4` es válido para pruebas?
4. **El CFDI 4.0 tiene errores de estructura** - ¿Nos pueden validar el XML?

## 📁 Archivos Adjuntos

1. **soapui-request.xml** - Request SOAP completo enviado
2. **soapui-response.xml** - Response con el error
3. **captura-pantalla.png** - Evidencia visual de la prueba en SoapUI
4. **cfdi-prueba.xml** - XML del CFDI 4.0 que estamos enviando (decodificado del Base64)

## 🙏 Solicitudes Específicas

Para poder avanzar con la integración, ¿podrías ayudarnos con lo siguiente?

### 1. Validación del XML
¿El CFDI 4.0 que estamos generando es válido? ¿Falta algún campo o atributo requerido?

### 2. Proceso de Sellado
¿El WebService acepta XML **sin sello** para pruebas en sandbox, o debemos sellarlo primero?

- **Si requiere sello:** ¿Pueden proporcionarnos un CSD de pruebas (.cer, .key y contraseña)?
- **Si el PAC hace el sellado:** ¿Debemos usar un endpoint diferente o enviar los datos en otro formato?

### 3. Cadena Original
¿Nos pueden proporcionar el formato exacto de la cadena original según Anexo 20 para CFDI 4.0?

### 4. XML de Ejemplo
¿Tienen un XML de prueba que **SÍ funcione** en su sandbox? Nos sería de gran ayuda para:
- Validar nuestra implementación SOAP
- Depurar la generación del CFDI
- Entender la estructura exacta que esperan

### 5. Documentación Actualizada
¿Tienen documentación técnica actualizada para la integración CFDI 4.0 con su WebService?

## 🚀 Contexto del Proyecto

**My Conta-AI** es una plataforma de facturación electrónica con IA integrada que:
- Asiste a usuarios en la creación de facturas CFDI 4.0
- Usa Llama 3.2 local para proporcionar ayuda contextual
- Tiene navegación automática guiada por voz/texto

**Volumen estimado:**
- Inicio: 500-2,000 facturas/mes
- Crecimiento proyectado: 20% mensual

**Nuestro objetivo:** Establecer una relación a largo plazo con Solución Factible como nuestro PAC proveedor. Una vez completada la integración en sandbox, procederemos inmediatamente con el contrato de producción.

## 📅 Disponibilidad

Quedo a tu entera disposición para:
- Una llamada técnica de 15-20 minutos para revisar los detalles
- Proporcionar cualquier información adicional que necesites
- Probar cualquier XML o credencial que nos proporciones

**Mi disponibilidad:** Esta semana y la próxima, cualquier día después de las 2:00 PM CST.

## 📞 Información de Contacto

**Rod Hernández**  
📧 conceptosaimx@gmail.com  
📱 833-289-2730  
📍 Monterrey, NL, México

---

## 🎯 Siguiente Paso Sugerido

¿Te parece si agendamos una breve llamada esta semana para:
1. Revisar el XML que estamos generando
2. Validar si necesitamos CSD de pruebas
3. Definir los siguientes pasos para la integración

Quedo atento a tus comentarios.

**¡Muchas gracias de antemano por tu apoyo!**

Saludos cordiales,

**Rod Hernández**  
Desarrollador Principal  
My Conta-AI

---

**Nota:** Este email fue generado automáticamente desde el sistema de integración de My Conta-AI. Los archivos adjuntos contienen la evidencia completa de las pruebas realizadas.
