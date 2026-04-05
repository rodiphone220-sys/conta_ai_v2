/**
 * Script de prueba para generar CFDI 4.0 SELLADO
 * para probar en SoapUI con Solución Factible
 * 
 * Uso: npx tsx test-csdi-sellado.ts
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import * as forge from 'node-forge';

// ============ CONFIGURACIÓN ============
const CER_PATH = 'C:\\Users\\ramhe\\OneDrive\\Escritorio\\my-conta-ai-facturador-main_v1\\CERTIFICADO DE SELLO DIGITAL-my-conta-ai-facturador-main_v1\\00001000000518570370.cer';
const KEY_PATH = 'C:\\Users\\ramhe\\OneDrive\\Escritorio\\my-conta-ai-facturador-main_v1\\CERTIFICADO DE SELLO DIGITAL-my-conta-ai-facturador-main_v1\\CSD_UNICA_GUIM980220L20_20230320_000716.key';
const CSD_PASSWORD = 'Gunsnroses10';

// Credenciales de prueba (sandbox)
const USER = 'testing@solucionfactible.com';
const PASSWORD = 'timbrado.SF.16672';

const SOAP_NAMESPACE = 'http://timbrado.ws.cfdi.solucionfactible.com';

// ============ GENERAR CFDI 4.0 ============
function generarCFDI(): string {
  const fecha = new Date().toISOString().slice(0, 19);
  const folio = Date.now().toString().slice(-6);

  return `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante 
  xmlns:cfdi="http://www.sat.gob.mx/cfd/4" 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
  xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd" 
  Version="4.0" 
  Serie="TEST" 
  Folio="${folio}" 
  Fecha="${fecha}" 
  Sello="" 
  FormaPago="01" 
  NoCertificado="" 
  Certificado="" 
  SubTotal="100.00" 
  Total="116.00" 
  TipoDeComprobante="I" 
  Exportacion="01" 
  LugarExpedicion="06600" 
  MetodoPago="PUE" 
  TipoCambio="1" 
  Moneda="MXN">
  
  <cfdi:Emisor 
    Rfc="XIQB891116QE4" 
    Nombre="Testing Solucion Factible" 
    RegimenFiscal="612"/>
  
  <cfdi:Receptor 
    Rfc="XEXX010101000" 
    Nombre="Publico en General" 
    DomicilioFiscalReceptor="06600" 
    RegimenFiscalReceptor="616" 
    UsoCFDI="G01"/>
  
  <cfdi:Conceptos>
    <cfdi:Concepto 
      ClaveProdServ="01010101" 
      Cantidad="1" 
      ClaveUnidad="H87" 
      Unidad="Pieza" 
      Descripcion="Producto de prueba" 
      ValorUnitario="100.00" 
      Importe="100.00" 
      ObjetoImp="02"/>
  </cfdi:Conceptos>
  
  <cfdi:Impuestos TotalImpuestosTrasladados="16.00">
    <cfdi:Traslados>
      <cfdi:Traslado 
        Base="100.00" 
        Impuesto="002" 
        TipoFactor="Tasa" 
        TasaOCuota="0.160000" 
        Importe="16.00"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
</cfdi:Comprobante>`;
}

// ============ GENERAR CADENA ORIGINAL ============
function generarCadenaOriginal(xmlString: string): string {
  const comprobanteMatch = xmlString.match(/<cfdi:Comprobante([^>]+)>/);
  if (!comprobanteMatch) {
    throw new Error('No se encontró el nodo Comprobante');
  }

  const atributosString = comprobanteMatch[1];

  const atributosOrden = [
    'Version', 'Serie', 'Folio', 'Fecha', 'Sello', 'FormaPago', 'NoCertificado',
    'Certificado', 'CondicionesDePago', 'SubTotal', 'Total', 'TipoDeComprobante',
    'Exportacion', 'MetodoPago', 'LugarExpedicion'
  ];

  const valores: string[] = [];

  for (const atributo of atributosOrden) {
    const match = atributosString.match(new RegExp(`${atributo}="([^"]*)"`, 'i'));
    valores.push(match ? match[1] : '');
  }

  return `||${valores.join('|')}|`;
}

// ============ SELLAR CFDI ============
async function sellarCFDI(): Promise<{ success: boolean; xmlSellado?: string; error?: string }> {
  try {
    console.log('🔐 [Sellado CFDI] Iniciando proceso...');
    console.log('📁 CerPath:', CER_PATH);
    console.log('🔑 KeyPath:', KEY_PATH);

    // Verificar que existen los archivos
    if (!fs.existsSync(CER_PATH)) {
      return { success: false, error: `Archivo .cer no encontrado: ${CER_PATH}` };
    }
    if (!fs.existsSync(KEY_PATH)) {
      return { success: false, error: `Archivo .key no encontrado: ${KEY_PATH}` };
    }

    // Generar CFDI
    const xmlString = generarCFDI();
    console.log('📄 [Sellado CFDI] CFDI generado, length:', xmlString.length);

    // Generar cadena original
    const cadenaOriginal = generarCadenaOriginal(xmlString);
    console.log('🔗 [Sellado CFDI] Cadena original:', cadenaOriginal);

    // Leer llave privada
    const keyPem = fs.readFileSync(KEY_PATH, 'utf-8');

    // Firmar con llave privada (RSA + SHA-256)
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(cadenaOriginal);
    sign.end();

    const sello = sign.sign(keyPem, 'base64');
    console.log('✍️ [Sellado CFDI] Sello generado, length:', sello.length);

    // Leer certificado y obtener en base64
    const certDer = fs.readFileSync(CER_PATH);
    const certificadoBase64 = certDer.toString('base64');
    console.log('📜 [Sellado CFDI] Certificado leído, length:', certificadoBase64.length);

    // Extraer número de certificado
    const certPem = fs.readFileSync(CER_PATH, 'utf-8');
    let noCertificado = '';
    try {
      const forgeCert = forge.pki.certificateFromPem(certPem);
      noCertificado = forgeCert.serialNumber;
      console.log('🔢 [Sellado CFDI] No. Certificado:', noCertificado);
    } catch (e) {
      console.warn('⚠️ [Sellado CFDI] No se pudo extraer No. Certificado, usando default');
      noCertificado = '00001000000518570370';
    }

    // Insertar sello, certificado y noCertificado en el XML
    let xmlSellado = xmlString;
    xmlSellado = xmlSellado.replace(/Sello=""/g, `Sello="${sello}"`);
    xmlSellado = xmlSellado.replace(/NoCertificado=""/g, `NoCertificado="${noCertificado}"`);
    xmlSellado = xmlSellado.replace(/Certificado=""/g, `Certificado="${certificadoBase64}"`);

    console.log('✅ [Sellado CFDI] XML sellado exitosamente');

    // Guardar XML sellado para verificación
    const xmlPath = path.join(process.cwd(), 'cfdi-sellado.xml');
    fs.writeFileSync(xmlPath, xmlSellado, 'utf-8');
    console.log('💾 [Sellado CFDI] XML sellado guardado en:', xmlPath);

    // Convertir a base64 (sin saltos de línea)
    const xmlSelladoBase64 = Buffer.from(xmlSellado, 'utf-8').toString('base64').replace(/\r?\n|\r/g, '');

    return {
      success: true,
      xmlSellado: xmlSelladoBase64,
      sello,
      noCertificado,
      cadenaOriginal
    };

  } catch (error: any) {
    console.error('❌ [Sellado CFDI] Error:', error);
    return {
      success: false,
      error: error.message || 'Error al sellar CFDI'
    };
  }
}

// ============ GENERAR REQUEST SOAP ============
function generarSoapRequest(cfdiBase64: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="${SOAP_NAMESPACE}">
  <soapenv:Header/>
  <soapenv:Body>
    <ws:timbrar>
      <ws:usuario>${USER}</ws:usuario>
      <ws:password>${PASSWORD}</ws:password>
      <ws:cfdiBase64>${cfdiBase64}</ws:cfdiBase64>
    </ws:timbrar>
  </soapenv:Body>
</soapenv:Envelope>`;
}

// ============ EJECUCIÓN PRINCIPAL ============
async function main() {
  console.log('🚀 [Test CSD] Iniciando prueba de sellado...\n');

  // Sellar CFDI
  const resultado = await sellarCFDI();

  if (!resultado.success) {
    console.error('❌ Error:', resultado.error);
    console.log('\n💡 Verifica:');
    console.log('   1. Que el archivo .key existe en la ruta especificada');
    console.log('   2. Que la contraseña es correcta');
    console.log('   3. Que el CSD está vigente (no expirado)');
    return;
  }

  console.log('\n✅ [Test CSD] CFDI sellado exitosamente!\n');
  console.log('📊 Resumen:');
  console.log('   - No. Certificado:', resultado.noCertificado);
  console.log('   - Sello length:', resultado.sello?.length);
  console.log('   - XML Base64 length:', resultado.xmlSellado?.length);

  // Generar request SOAP
  const soapRequest = generarSoapRequest(resultado.xmlSellado!);

  // Guardar request SOAP
  const soapPath = path.join(process.cwd(), 'test-soap-request-sellado.xml');
  fs.writeFileSync(soapPath, soapRequest, 'utf8');
  console.log('\n💾 [Test CSD] Request SOAP guardado en:', soapPath);

  console.log('\n✅ [Test CSD] ¡Listo para probar en SoapUI!');
  console.log('\n📋 Instrucciones:');
  console.log('   1. Abre SoapUI');
  console.log('   2. En Request 1, ve a la pestaña "Headers"');
  console.log('   3. Asegúrate que Content-Type sea: text/xml;charset=UTF-8');
  console.log('   4. Copia el contenido de test-soap-request-sellado.xml');
  console.log('   5. Pega en el request de SoapUI');
  console.log('   6. Ejecuta y verifica la respuesta');
  console.log('\n🔗 Endpoint: https://testing.solucionfactible.com/ws/services/Timbrado');
}

main();
