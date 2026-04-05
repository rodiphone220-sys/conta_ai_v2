/**
 * Script de prueba para generar CFDI 4.0 SELLADO
 * basado en el PDF de ejemplo: F0000000001 - Panuco Joven Show
 * 
 * Uso: npx tsx test-panuco-joven.ts
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ============ CONFIGURACIÓN ============
// CSDs OFICIALES DE PRUEBA DEL SAT (descargados de developers.sw.com.mx)
// Contraseña: 12345678a
const CER_PATH = 'C:\\rod_apps\\my-conta-ai-facturador-main_v1\\Certificados_Pruebas\\Certificados_Pruebas\\Personas Morales\\EKU9003173C9_20230517223532\\eku9003173c9.cer';
const KEY_PATH = 'C:\\rod_apps\\my-conta-ai-facturador-main_v1\\Certificados_Pruebas\\Certificados_Pruebas\\Personas Morales\\EKU9003173C9_20230517223532\\Claveprivada_FIEL_EKU9003173C9_20230517_223532.key';
const CSD_PASSWORD = '12345678a';

// Credenciales de prueba (sandbox)
const USER = 'testing@solucionfactible.com';
const PASSWORD = 'timbrado.SF.16672';

const SOAP_NAMESPACE = 'http://timbrado.ws.cfdi.solucionfactible.com';

// ============ DATOS DEL PDF DE EJEMPLO ============
const DATOS_FACTURA = {
  serie: 'F',
  folio: '0000000001',
  fecha: '2026-04-01T12:30:00',
  
  emisor: {
    rfc: 'EKU9003173C9',  // RFC del CSD de prueba del SAT
    nombre: 'ESCUELA KEMPER URGATE',
    regimenFiscal: '601',
    lugarExpedicion: '42501',
    calle: 'Calle Ejemplo',
    numeroExt: '123',
    colonia: 'Colonia Ejemplo',
    ciudad: 'Ciudad de Mexico',
    estado: 'CDMX',
    cp: '42501'
  },
  
  receptor: {
    rfc: 'RGO810620KC3',
    nombre: 'RODOLFO GARCIA ORTIZ',
    usoCFDI: 'G03',
    calle: 'Callejon Rio Purificacion',
    numeroExt: 'SN',
    colonia: 'Purisima de Aconchi',
    ciudad: 'Hermosillo',
    estado: 'SONORA',
    cp: '83150'
  },
  
  conceptos: [
    {
      claveProdServ: '84111500',
      claveUnidad: 'E48',
      cantidad: '1',
      unidad: 'SERVICIO',
      descripcion: 'Servicio de ambientación musical',
      valorUnitario: '3500.00',
      importe: '3500.00'
    }
  ],
  
  subtotal: 3500.00,
  tasaIVA: 0.16,
  iva: 560.00,
  total: 4060.00,
  
  formaPago: '03',
  metodoPago: 'PUE',
  moneda: 'MXN'
};

// ============ GENERAR CFDI 4.0 ============
function generarCFDI(): string {
  const fecha = DATOS_FACTURA.fecha;
  const folio = DATOS_FACTURA.folio;
  const serie = DATOS_FACTURA.serie;

  // Generar conceptos XML
  const conceptosXml = DATOS_FACTURA.conceptos.map(c => `
    <cfdi:Concepto 
      ClaveProdServ="${c.claveProdServ}" 
      ClaveUnidad="${c.claveUnidad}" 
      Cantidad="${c.cantidad}" 
      Unidad="${c.unidad}" 
      Descripcion="${c.descripcion}" 
      ValorUnitario="${c.valorUnitario}" 
      Importe="${c.importe}"
      ObjetoImp="02">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado 
            Base="${c.importe}" 
            Impuesto="002" 
            TipoFactor="Tasa" 
            TasaOCuota="0.160000" 
            Importe="${(parseFloat(c.importe) * DATOS_FACTURA.tasaIVA).toFixed(2)}"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante 
  xmlns:cfdi="http://www.sat.gob.mx/cfd/4" 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
  xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd" 
  Version="4.0" 
  Serie="${serie}" 
  Folio="${folio}" 
  Fecha="${fecha}" 
  Sello="" 
  FormaPago="${DATOS_FACTURA.formaPago}" 
  NoCertificado="" 
  Certificado="" 
  SubTotal="${DATOS_FACTURA.subtotal}" 
  Total="${DATOS_FACTURA.total}" 
  TipoDeComprobante="I" 
  Exportacion="01" 
  LugarExpedicion="${DATOS_FACTURA.emisor.cp}" 
  MetodoPago="${DATOS_FACTURA.metodoPago}" 
  Moneda="${DATOS_FACTURA.moneda}">
  
  <cfdi:Emisor 
    Rfc="${DATOS_FACTURA.emisor.rfc}" 
    Nombre="${DATOS_FACTURA.emisor.nombre}" 
    RegimenFiscal="${DATOS_FACTURA.emisor.regimenFiscal}">
    <cfdi:DomicilioFiscal 
      Calle="${DATOS_FACTURA.emisor.calle}" 
      NumeroExterior="${DATOS_FACTURA.emisor.numeroExt}" 
      Colonia="${DATOS_FACTURA.emisor.colonia}" 
      Ciudad="${DATOS_FACTURA.emisor.ciudad}" 
      Estado="${DATOS_FACTURA.emisor.estado}" 
      Pais="México" 
      CodigoPostal="${DATOS_FACTURA.emisor.cp}"/>
  </cfdi:Emisor>
  
  <cfdi:Receptor 
    Rfc="${DATOS_FACTURA.receptor.rfc}" 
    Nombre="${DATOS_FACTURA.receptor.nombre}" 
    UsoCFDI="${DATOS_FACTURA.receptor.usoCFDI}">
    <cfdi:Domicilio 
      Calle="${DATOS_FACTURA.receptor.calle}" 
      NumeroExterior="${DATOS_FACTURA.receptor.numeroExt}" 
      Colonia="${DATOS_FACTURA.receptor.colonia}" 
      Ciudad="${DATOS_FACTURA.receptor.ciudad}" 
      Estado="${DATOS_FACTURA.receptor.estado}" 
      Pais="México" 
      CodigoPostal="${DATOS_FACTURA.receptor.cp}"/>
  </cfdi:Receptor>
  
  <cfdi:Conceptos>
    ${conceptosXml}
  </cfdi:Conceptos>
  
  <cfdi:Impuestos TotalImpuestosTrasladados="${DATOS_FACTURA.iva}">
    <cfdi:Traslados>
      <cfdi:Traslado 
        Base="${DATOS_FACTURA.subtotal}" 
        Impuesto="002" 
        TipoFactor="Tasa" 
        TasaOCuota="0.160000" 
        Importe="${DATOS_FACTURA.iva}"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
</cfdi:Comprobante>`;
}

// ============ GENERAR CADENA ORIGINAL (SAT Anexo 20) ============
// ORDEN CORRECTO según Anexo 20 del SAT
function generarCadenaOriginal(xmlString: string): string {
  const partes: string[] = [];

  // 1. Datos del Comprobante - ORDEN EXACTO según Anexo 20
  const cfdiMatch = xmlString.match(/<cfdi:Comprobante([^>]+)>/);
  if (!cfdiMatch) {
    throw new Error('No se encontró el nodo Comprobante');
  }
  const compAttrs = cfdiMatch[1];
  
  // ORDEN CORRECTO: Version, Serie, Folio, Fecha, Sello, FormaPago, NoCertificado,
  // CondicionesDePago, SubTotal, Descuento, Total, Moneda, TipoCambio, TipoDeComprobante, Exportacion, MetodoPago, LugarExpedicion
  const compOrden = [
    'Version', 'Serie', 'Folio', 'Fecha', 'Sello', 'FormaPago', 'NoCertificado',
    'CondicionesDePago', 'SubTotal', 'Descuento', 'Total', 'Moneda', 'TipoCambio',
    'TipoDeComprobante', 'Exportacion', 'MetodoPago', 'LugarExpedicion'
  ];
  for (const attr of compOrden) {
    const m = compAttrs.match(new RegExp(`${attr}="([^"]*)"`, 'i'));
    partes.push(m ? m[1] : '');
  }

  // 2. Datos del Emisor
  const emisorMatch = xmlString.match(/<cfdi:Emisor\s+Rfc="([^"]*)"\s+Nombre="([^"]*)"\s+RegimenFiscal="([^"]*)"/);
  partes.push(emisorMatch ? emisorMatch[1] : '');
  partes.push(emisorMatch ? emisorMatch[2] : '');
  partes.push(emisorMatch ? emisorMatch[3] : '');

  // 3. Datos del Receptor
  const receptorMatch = xmlString.match(/<cfdi:Receptor\s+Rfc="([^"]*)"\s+Nombre="([^"]*)"\s+UsoCFDI="([^"]*)"/);
  partes.push(receptorMatch ? receptorMatch[1] : '');
  partes.push(receptorMatch ? receptorMatch[2] : '');
  partes.push(receptorMatch ? receptorMatch[3] : '');

  // 4. Información Adicional del Receptor (puede estar vacío)
  partes.push('');

  // 5. Conceptos
  const conceptoMatches = xmlString.matchAll(/<cfdi:Concepto\s+([^>]+)>/g);
  for (const match of conceptoMatches) {
    const attrs = match[1];
    const cps = extractAttr(attrs, 'ClaveProdServ');
    const ccu = extractAttr(attrs, 'ClaveUnidad');
    const cant = extractAttr(attrs, 'Cantidad');
    const und = extractAttr(attrs, 'Unidad');
    const desc = extractAttr(attrs, 'Descripcion');
    const vu = extractAttr(attrs, 'ValorUnitario');
    const imp = extractAttr(attrs, 'Importe');
    const obj = extractAttr(attrs, 'ObjetoImp');
    
    partes.push(cps);
    partes.push(cant);
    partes.push(ccu);
    partes.push(und);
    partes.push(desc);
    partes.push(vu);
    partes.push(imp);
    partes.push(obj);

    // Impuestos del concepto (si existe)
    const concXml = match[0];
    const impMatch = xmlString.includes('<cfdi:Impuestos>') 
      ? xmlString.match(new RegExp(`<cfdi:Concepto[^>]+>${escapeRegex(concXml.substring(concXml.indexOf('<')))}.*?</cfdi:Concepto>`, 's'))
      : null;
    
    const concepStart = match.index!;
    const nextConceptoStart = findNextConceptoStart(xmlString, match.index!);
    const nextConceptoMatch = nextConceptoStart > 0 ? xmlString.indexOf('<cfdi:Concepto', nextConceptoStart) : -1;
    const conceptoBlock = xmlString.substring(concepStart, nextConceptoStart > 0 ? nextConceptoStart : xmlString.indexOf('</cfdi:Conceptos>'));
    
    const trasMatch = conceptoBlock.match(/<cfdi:Traslado\s+Base="([^"]*)"\s+Impuesto="([^"]*)"\s+TipoFactor="([^"]*)"\s+TasaOCuota="([^"]*)"\s+Importe="([^"]*)"/);
    if (trasMatch) {
      partes.push(trasMatch[1]); // Base
      partes.push(trasMatch[2]); // Impuesto
      partes.push(trasMatch[3]); // TipoFactor
      partes.push(trasMatch[4]); // TasaOCuota
      partes.push(trasMatch[5]); // Importe
    }
  }

  // 6. Impuestos Globales
  const impGlobalMatch = xmlString.match(/<cfdi:Impuestos\s+TotalImpuestosTrasladados="([^"]*)">/);
  partes.push(impGlobalMatch ? impGlobalMatch[1] : '');
  
  // Traslados globales
  const globalTrasMatch = xmlString.match(/<cfdi:Traslado\s+Base="([^"]*)"\s+Impuesto="([^"]*)"\s+TipoFactor="([^"]*)"\s+TasaOCuota="([^"]*)"\s+Importe="([^"]*)"/);
  if (globalTrasMatch) {
    partes.push(globalTrasMatch[1]); // Base
    partes.push(globalTrasMatch[2]); // Impuesto
    partes.push(globalTrasMatch[3]); // TipoFactor
    partes.push(globalTrasMatch[4]); // TasaOCuota
    partes.push(globalTrasMatch[5]); // Importe
  }

  return `||${partes.join('|')}|`;
}

function extractAttr(attrs: string, name: string): string {
  const m = attrs.match(new RegExp(`${name}="([^"]*)"`, 'i'));
  return m ? m[1] : '';
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findNextConceptoStart(xml: string, afterIndex: number): number {
  const nextConcepto = xml.indexOf('<cfdi:Concepto', afterIndex + 1);
  const conceptosEnd = xml.indexOf('</cfdi:Conceptos>');
  return nextConcepto > 0 && nextConcepto < conceptosEnd ? nextConcepto : conceptosEnd;
}

// ============ SELLAR CFDI ============
async function sellarCFDI(): Promise<{ success: boolean; xmlSellado?: string; xmlBase64?: string; error?: string; noCertificado?: string; sello?: string }> {
  try {
    console.log('🔐 [Sellado CFDI] Iniciando proceso...');
    console.log('📄 Factura:', `${DATOS_FACTURA.serie}${DATOS_FACTURA.folio}`);
    console.log('🏢 Emisor:', DATOS_FACTURA.emisor.nombre);
    console.log('📋 RFC Emisor:', DATOS_FACTURA.emisor.rfc);

    // Verificar archivos
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

    // Guardar para debug
    fs.writeFileSync('cfdi-sin-sellar.xml', xmlString, 'utf-8');
    fs.writeFileSync('cadena-original.txt', cadenaOriginal, 'utf-8');

    // Leer llave privada
    const keyDer = fs.readFileSync(KEY_PATH);
    
    const privateKey = crypto.createPrivateKey({
      key: keyDer,
      format: 'der',
      type: 'pkcs8',
      passphrase: CSD_PASSWORD
    });

    // Firmar
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(cadenaOriginal, 'utf8');
    sign.end();

    const sello = sign.sign(privateKey, 'base64');
    console.log('✅ Sello generado, length:', sello.length);

    // Leer certificado
    const certDer = fs.readFileSync(CER_PATH);
    const certificadoBase64 = certDer.toString('base64');

    // Extraer número de certificado del archivo .cer (formato DER)
    const noCertificado = extraerNumeroCertificado(certDer);
    console.log('🔢 No. Certificado:', noCertificado);

    // Insertar en XML
    let xmlSellado = xmlString;
    xmlSellado = xmlSellado.replace(/Sello=""/g, `Sello="${sello}"`);
    xmlSellado = xmlSellado.replace(/NoCertificado=""/g, `NoCertificado="${noCertificado}"`);
    xmlSellado = xmlSellado.replace(/Certificado=""/g, `Certificado="${certificadoBase64}"`);

    // Guardar XML sellado
    fs.writeFileSync('cfdi-sellado-panuco-joven.xml', xmlSellado, 'utf-8');
    console.log('💾 XML sellado guardado en: cfdi-sellado-panuco-joven.xml');

    // Convertir a base64
    const xmlBase64 = Buffer.from(xmlSellado, 'utf-8').toString('base64').replace(/\r?\n|\r/g, '');

    return {
      success: true,
      xmlSellado,
      xmlBase64,
      noCertificado,
      sello
    };

  } catch (error: any) {
    console.error('❌ [Sellado CFDI] Error:', error);
    return { success: false, error: error.message };
  }
}

// ============ ENVIAR AL PAC ============
async function timbrarConPAC(xmlBase64: string): Promise<any> {
  const endpoint = 'https://testing.solucionfactible.com/ws/services/Timbrado';

  const soapRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="${SOAP_NAMESPACE}">
  <soapenv:Header/>
  <soapenv:Body>
    <ws:timbrar>
      <ws:usuario>${USER}</ws:usuario>
      <ws:password>${PASSWORD}</ws:password>
      <ws:cfdiBase64>${xmlBase64}</ws:cfdiBase64>
    </ws:timbrar>
  </soapenv:Body>
</soapenv:Envelope>`;

  console.log('\n📡 [PAC] Enviando al sandbox...');
  console.log('🔗 Endpoint:', endpoint);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': ''
      },
      body: soapRequest
    });

    const responseText = await response.text();
    console.log('📥 [PAC] Response status:', response.status);
    console.log('📥 [PAC] Response body:', responseText.substring(0, 1000));

    // Guardar respuesta SOAP
    fs.writeFileSync('pac-response.xml', responseText, 'utf-8');

    // Parsear respuesta
    const uuidMatch = responseText.match(/<uuid>([^<]+)<\/uuid>/i);
    const xmlTimbradoMatch = responseText.match(/<xmlTimbrado>([^<]+)<\/xmlTimbrado>/i);
    const fechaMatch = responseText.match(/<fechaTimbrado>([^<]+)<\/fechaTimbrado>/i);
    const statusMatch = responseText.match(/<status>([^<]+)<\/status>/i);
    const mensajeMatch = responseText.match(/<mensaje>([^<]+)<\/mensaje>/i);
    const faultMatch = responseText.match(/<faultstring>([^<]+)<\/faultstring>/i);

    if (uuidMatch) {
      return {
        success: true,
        uuid: uuidMatch[1],
        xmlTimbrado: xmlTimbradoMatch ? xmlTimbradoMatch[1] : '',
        fechaTimbrado: fechaMatch ? fechaMatch[1] : new Date().toISOString(),
        mensaje: mensajeMatch ? mensajeMatch[1] : 'Timbrado exitoso'
      };
    } else {
      return {
        success: false,
        mensaje: faultMatch ? faultMatch[1] : mensajeMatch ? mensajeMatch[1] : 'Error desconocido',
        status: statusMatch ? statusMatch[1] : '500',
        rawResponse: responseText
      };
    }
  } catch (error: any) {
    return { success: false, mensaje: error.message };
  }
}

// ============ MAIN ============
async function main() {
  console.log('='.repeat(60));
  console.log('🚀 [Test Panuco Joven] CFDI 4.0 - Timbrado Sandbox');
  console.log('='.repeat(60));
  console.log();

  // 1. VENDER Y TIMBRAR
  const resultado = await sellarCFDI();

  if (!resultado.success) {
    console.error('\n❌ Error en sellado:', resultado.error);
    return;
  }

  console.log('\n✅ CFDI sellado exitosamente!');
  console.log('   No. Certificado:', resultado.noCertificado);
  console.log('   Sello:', resultado.sello?.substring(0, 50) + '...');

  // 2. ENVIAR AL PAC
  const timbrado = await timbrarConPAC(resultado.xmlBase64!);

  console.log('\n' + '='.repeat(60));
  if (timbrado.success) {
    console.log('✅ ¡TIMBRADO EXITOSO!');
    console.log('   UUID:', timbrado.uuid);
    console.log('   Fecha:', timbrado.fechaTimbrado);
    
    // Guardar XML timbrado
    if (timbrado.xmlTimbrado) {
      const xmlDecoded = Buffer.from(timbrado.xmlTimbrado, 'base64').toString('utf-8');
      fs.writeFileSync('cfdi-timbrado.xml', xmlDecoded, 'utf-8');
      console.log('   💾 XML timbrado guardado en: cfdi-timbrado.xml');
    }
  } else {
    console.log('❌ ERROR EN TIMBRADO');
    console.log('   Mensaje:', timbrado.mensaje);
    console.log('   Status:', timbrado.status);
    console.log();
    console.log('📝 NOTA: Si el error es "unknown", el CSD del RFC');
    console.log('   emisor no está activado en el sandbox de Solución Factible.');
    console.log('   Contacta a Leonardo para activar el CSD.');
  }
  console.log('='.repeat(60));
}

// Función para extraer el número de certificado del archivo .cer (formato DER ASN.1)
function extraerNumeroCertificado(certBuffer: Buffer): string {
  try {
    // El número de certificado está en el campo "Serial Number" del certificado
    // En DER ASN.1, el serial number está después del OID del algoritmo de firma
    // Para un certificado X.509, la estructura es:
    // Certificate ::= SEQUENCE { tbsCertificate, signatureAlgorithm, signature }
    // TBSCertificate ::= SEQUENCE { version, serialNumber, ... }
    
    // Buscar el inicio del serial number (etiqueta 0x02 = INTEGER)
    let i = 0;
    
    // Saltar el SEQUENCE inicial del certificado
    if (certBuffer[i] !== 0x30) throw new Error('No se encontró SEQUENCE inicial');
    i++;
    
    // Saltar longitud del SEQUENCE
    if (certBuffer[i] & 0x80) {
      const lenBytes = certBuffer[i] & 0x7F;
      i += 1 + lenBytes;
    } else {
      i++;
    }
    
    // Saltar el TBSCertificate SEQUENCE
    if (certBuffer[i] !== 0x30) throw new Error('No se encontró TBSCertificate SEQUENCE');
    i++;
    
    // Saltar longitud del TBSCertificate
    if (certBuffer[i] & 0x80) {
      const lenBytes = certBuffer[i] & 0x7F;
      i += 1 + lenBytes;
    } else {
      i++;
    }
    
    // Ahora debería estar el serialNumber (puede ser explícito con [0] o directo)
    // versión explícita [0] (etiqueta 0xA0)
    if (certBuffer[i] === 0xA0) {
      i++;
      if (certBuffer[i] & 0x80) {
        const lenBytes = certBuffer[i] & 0x7F;
        i += 1 + lenBytes;
      } else {
        i++;
      }
    }
    
    // Saltar serialNumber (INTEGER, etiqueta 0x02)
    if (certBuffer[i] !== 0x02) throw new Error('No se encontró serialNumber');
    i++;
    
    let len = certBuffer[i];
    if (len & 0x80) {
      const lenBytes = len & 0x7F;
      len = certBuffer[i + 1];
      for (let j = 2; j < lenBytes; j++) {
        len = (len << 8) | certBuffer[i + j];
      }
      i += 1 + lenBytes;
    } else {
      i++;
    }
    
    // Leer el serial number
    let serialHex = '';
    for (let j = 0; j < len; j++) {
      serialHex += certBuffer[i + j].toString(16).padStart(2, '0').toUpperCase();
    }
    
    return serialHex;
  } catch (error) {
    console.error('Error extrayendo serial del certificado:', error);
    // Fallback: usar el nombre del archivo
    return path.basename(CER_PATH, '.cer');
  }
}

main();
