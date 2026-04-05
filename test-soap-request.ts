/**
 * Script de prueba para generar y guardar request SOAP completo
 * para probar en SoapUI con Solución Factible
 * 
 * Uso: npx tsx test-soap-request.ts
 */

import fs from 'fs';
import path from 'path';

const SOAP_NAMESPACE = 'http://timbrado.ws.cfdi.solucionfactible.com';

// Credenciales de prueba (sandbox)
const USER = 'testing@solucionfactible.com';
const PASSWORD = 'timbrado.SF.16672';

// CFDI 4.0 de prueba (sin sellar) - Base64 limpio (sin saltos de línea)
// Encoding en MAYÚSCULAS: UTF-8 (no utf-8)
const CFDI_BASE64 = 'PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPGNmZGk6Q29tcHJvYmFudGUgeG1sbnM6Y2ZkaT0iaHR0cDovL3d3dy5zYXQuZ29iLm14L2NmZC80IiB4bWxuczp4c2k9Imh0dHA6Ly93d3cudzMub3JnLzIwMDEvWE1MU2NoZW1hLWluc3RhbmNlIiB4c2k6c2NoZW1hTG9jYXRpb249Imh0dHA6Ly93d3cuc2F0LmdvYi5teC9jZmQvNCBodHRwOi8vd3d3LnNhdC5nb2IubXgvc2l0aW9faW50ZXJuZXQvY2ZkLzQvY2ZkdjQwLnhzZCIgVmVyc2lvbj0iNC4wIiBTZXJpZT0iVEVTVCIgRm9saW89IjEiIEZlY2hhPSIyMDI0LTAxLTE1VDEyOjAwOjAwIiBTZWxsbz0iIiBGb3JtYVBhZ289IjAxIiBOb0NlcnRpZmljYWRvPSIiIENlcnRpZmljYWRvPSIiIFN1YlRvdGFsPSIxMDAuMDAiIFRvdGFsPSIxMTYuMDAiIFRpcG9EZUNvbXByb2JhbnRlPSJJIiBFeHBvcnRhY2lvbj0iMDEiIEx1Z2FyRXhwZWRpY2lvbj0iMDY2MDAiIE1ldG9kb1BhZ289IlBVRSIgVGlwb0NhbWJpbz0iMSIgTW9uZWRhPSJNWE4iPgogIDxjZmRpOkVtaXNvciBSZmM9IlhJUUI4OTExMTZRRTQiIE5vbWJyZT0iVGVzdGluZyBTb2x1Y2lvbiBGYWN0aWJsZSIgUmVnaW1lbkZpc2NhbD0iNjEyIi8+CiAgPGNmZGk6UmVjZXB0b3IgUmZjPSJYRVhYMDEwMTAxMDAwIiBOb21icmU9IlB1YmxpY28gZW4gR2VuZXJhbCIgRG9taWNpbGlvRmlzY2FsUmVjZXB0b3I9IjA2NjAwIiBSZWdpbWVuRmlzY2FsUmVjZXB0b3I9IjYxNiIgVXNvQ0ZEST0iRzAxIi8+CiAgPGNmZGk6Q29uY2VwdG9zPgogICAgPGNmZGk6Q29uY2VwdG8gQ2xhdmVQcm9kU2Vydj0iMDEwMTAxMDEiIENhbnRpZGFkPSIxIiBDbGF2ZVVuaWRhZD0iSDg3IiBVbmlkYWQ9IlBpZXphIiBEZXNjcmlwY2lvbj0iUHJvZHVjdG8gZGUgcHJ1ZWJhIiBWYWxvclVuaXRhcmlvPSIxMDAuMDAiIEltcG9ydGU9IjEwMC4wMCIgT2JqZXRvSW1wPSIwMiI+CiAgICAgIDxjZmRpOkltcHVlc3Rvcz4KICAgICAgICA8Y2ZkaTpUcmFzbGFkb3M+CiAgICAgICAgICA8Y2ZkaTpUcmFzbGFkbyBCYXNlPSIxMDAuMDAiIEltcHVlc3RvPSIwMDIiIFRpcG9GYWN0b3I9IlRhc2EiIFRhc2FPQ3VvdGE9IjAuMTYwMDAwIiBJbXBvcnRlPSIxNi4wMCIvPgogICAgICAgIDwvY2ZkaTpUcmFzbGFkb3M+CiAgICAgIDwvY2ZkaTpJbXB1ZXN0b3M+CiAgICA8L2NmZGk6Q29uY2VwdG8+CiAgPC9jZmRpOkNvbmNlcHRvcz4KICA8Y2ZkaTpJbXB1ZXN0b3MgVG90YWxJbXB1ZXN0b3NUcmFzbGFkYWRvcz0iMTYuMDAiPgogICAgPGNmZGk6VHJhc2xhZG9zPgogICAgICA8Y2ZkaTpUcmFzbGFkbyBCYXNlPSIxMDAuMDAiIEltcHVlc3RvPSIwMDIiIFRpcG9GYWN0b3I9IlRhc2EiIFRhc2FPQ3VvdGE9IjAuMTYwMDAwIiBJbXBvcnRlPSIxNi4wMCIvPgogICAgPC9jZmRpOlRyYXNsYWRvcz4KICA8L2NmZGk6SW1wdWVzdG9zPgo8L2NmZGk6Q29tcHJvYmFudGU+Cg==';

// Generar request SOAP con namespace EXACTO del WSDL
const soapRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="${SOAP_NAMESPACE}">
  <soapenv:Header/>
  <soapenv:Body>
    <ws:timbrar>
      <ws:usuario>${USER}</ws:usuario>
      <ws:password>${PASSWORD}</ws:password>
      <ws:cfdiBase64>${CFDI_BASE64}</ws:cfdiBase64>
    </ws:timbrar>
  </soapenv:Body>
</soapenv:Envelope>`;

// Guardar en archivo SIN BOM (UTF-8 puro)
const outputPath = path.join(process.cwd(), 'test-soap-request.xml');
fs.writeFileSync(outputPath, soapRequest, 'utf8');

console.log('✅ Request SOAP generado exitosamente');
console.log(`📁 Archivo guardado en: ${outputPath}`);
console.log('🔍 Archivo guardado SIN BOM (UTF-8 puro)');
console.log('🌐 Namespace:', SOAP_NAMESPACE);
console.log('📋 Instrucciones para SoapUI:');
console.log('');
console.log('1. Abre SoapUI');
console.log('2. En Request 1, ve a la pestaña "Headers" (abajo)');
console.log('3. Asegúrate que Content-Type sea: text/xml;charset=UTF-8');
console.log('4. Si dice "application/soap+xml", cámbialo a "text/xml"');
console.log('5. Pega el contenido de test-soap-request.xml en el request');
console.log('6. Ejecuta y verifica la respuesta');
console.log('');
console.log('🔗 Endpoint: https://testing.solucionfactible.com/ws/services/Timbrado');
console.log('📧 Si obtienes error "unknown", envía la respuesta a Leonardo (leo@solucionfactible.com)');
