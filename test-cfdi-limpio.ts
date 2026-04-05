/**
 * Script de prueba limpio para CFDI 4.0
 * Usando CSDs oficiales de prueba del SAT
 * 
 * Uso: npx tsx test-cfdi-limpio.ts
 */

import fs from 'fs';
import crypto from 'crypto';
import path from 'path';

const SOAP_NAMESPACE = 'http://timbrado.ws.cfdi.solucionfactible.com';
const PAC_USER = 'testing@solucionfactible.com';
const PAC_PASSWORD = 'timbrado.SF.16672';

// CSD de prueba del SAT (EKU9003173C9 - ESCUELA KEMPER URGATE)
const CER_PATH = 'C:\\rod_apps\\my-conta-ai-facturador-main_v1\\Certificados_Pruebas\\Certificados_Pruebas\\Personas Morales\\EKU9003173C9_20230517223532\\eku9003173c9.cer';
const KEY_PATH = 'C:\\rod_apps\\my-conta-ai-facturador-main_v1\\Certificados_Pruebas\\Certificados_Pruebas\\Personas Morales\\EKU9003173C9_20230517223532\\Claveprivada_FIEL_EKU9003173C9_20230517_223532.key';
const CSD_PASSWORD = '12345678a';

// RFC de prueba del SAT
const RFC_EMISOR = 'EKU9003173C9';
const NOMBRE_EMISOR = 'ESCUELA KEMPER URGATE';
const REGIMEN_FISCAL = '601';

// Número de certificado (extraer del .cer o usar conocido)
const NO_CERTIFICADO = '00001000000518570370'; // Este debe extraerse del certificado

// Datos de la factura
const FACTURA = {
  serie: 'F',
  folio: '0000000001',
  fecha: new Date().toISOString().replace(/Z$/, ''),
  emisor: {
    rfc: RFC_EMISOR,
    nombre: NOMBRE_EMISOR,
    regimenFiscal: REGIMEN_FISCAL,
    calle: 'Calle Ejemplo',
    numeroExt: '123',
    colonia: 'Colonia Ejemplo',
    ciudad: 'Ciudad de Mexico',
    estado: 'CDMX',
    pais: 'Mexico',
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
    pais: 'Mexico',
    cp: '83150'
  },
  conceptos: [
    {
      claveProdServ: '84111500',
      claveUnidad: 'E48',
      cantidad: '1',
      unidad: 'SERVICIO',
      descripcion: 'Servicio de ambientacion musical',
      valorUnitario: '3500.00',
      importe: '3500.00',
      objetoImp: '02'
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

function extraerNumeroCertificado(certBuffer: Buffer): string {
  try {
    let i = 0;
    
    // Saltar SEQUENCE del certificado
    if (certBuffer[i] !== 0x30) throw new Error('No SEQUENCE');
    i++;
    if (certBuffer[i] & 0x80) {
      i += 1 + (certBuffer[i] & 0x7F);
    } else i++;
    
    // Saltar TBSCertificate SEQUENCE
    if (certBuffer[i] !== 0x30) throw new Error('No TBSCertificate');
    i++;
    if (certBuffer[i] & 0x80) {
      i += 1 + (certBuffer[i] & 0x7F);
    } else i++;
    
    // Saltar version [0] si existe
    if (certBuffer[i] === 0xA0) {
      i++;
      if (certBuffer[i] & 0x80) i += 1 + (certBuffer[i] & 0x7F);
      else i++;
    }
    
    // Saltar serialNumber (INTEGER)
    if (certBuffer[i] !== 0x02) throw new Error('No serialNumber');
    i++;
    let len = certBuffer[i];
    if (len & 0x80) {
      const lenBytes = len & 0x7F;
      len = certBuffer[i + 1];
      for (let j = 2; j < lenBytes; j++) len = (len << 8) | certBuffer[i + j];
      i += 1 + lenBytes;
    } else i++;
    
    // Leer serial
    let serialHex = '';
    for (let j = 0; j < len; j++) {
      serialHex += certBuffer[i + j].toString(16).padStart(2, '0').toUpperCase();
    }
    
    // El serial debe tener 20 dígitos (40 hex chars), padding con ceros al inicio si es necesario
    return serialHex.padStart(40, '0');
  } catch (e) {
    console.error('Error extrayendo serial:', e);
    return NO_CERTIFICADO;
  }
}

function generarCadenaOriginalSAT(): string {
  // ORDEN EXACTO según Anexo 20 del SAT
  // Comprobante
  let cadena = [
    FACTURA.subtotal.toFixed(2),           // SubTotal
    '',                                     // Descuento
    FACTURA.total.toFixed(2),              // Total
    FACTURA.moneda,                        // Moneda
    '',                                     // TipoCambio
  ].join('|');
  
  // Emisor
  cadena += [
    FACTURA.emisor.rfc,
    FACTURA.emisor.nombre,
    FACTURA.emisor.regimenFiscal
  ].join('|');
  
  // Receptor
  cadena += [
    FACTURA.receptor.rfc,
    FACTURA.receptor.nombre,
    FACTURA.receptor.usoCFDI,
    '' // InformacionAdicional
  ].join('|');
  
  // Conceptos
  for (const c of FACTURA.conceptos) {
    cadena += [
      c.claveProdServ,
      c.cantidad,
      c.claveUnidad,
      c.unidad,
      c.descripcion,
      c.valorUnitario,
      c.importe,
      c.objetoImp
    ].join('|');
    
    // Impuestos del concepto
    if (c.objetoImp === '02' || c.objetoImp === '03') {
      const base = (parseFloat(c.importe)).toFixed(2);
      const imp = (parseFloat(c.importe) * FACTURA.tasaIVA).toFixed(2);
      cadena += [
        base, '002', 'Tasa', FACTURA.tasaIVA.toFixed(6), imp
      ].join('|');
    }
  }
  
  // Impuestos globales
  cadena += FACTURA.iva.toFixed(2);
  
  // Traslados globales
  if (FACTURA.iva > 0) {
    cadena += [
      FACTURA.subtotal.toFixed(2), '002', 'Tasa', FACTURA.tasaIVA.toFixed(6), FACTURA.iva.toFixed(2)
    ].join('|');
  }
  
  return `||${cadena}|`;
}

function generarXMLConPlaceholders(): string {
  const conceptosXml = FACTURA.conceptos.map(c => {
    const imp = (parseFloat(c.importe) * FACTURA.tasaIVA).toFixed(2);
    return `
    <cfdi:Concepto 
      ClaveProdServ="${c.claveProdServ}" 
      ClaveUnidad="${c.claveUnidad}" 
      Cantidad="${c.cantidad}" 
      Unidad="${c.unidad}" 
      Descripcion="${c.descripcion}" 
      ValorUnitario="${c.valorUnitario}" 
      Importe="${c.importe}"
      ObjetoImp="${c.objetoImp}">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado 
            Base="${c.importe}" 
            Impuesto="002" 
            TipoFactor="Tasa" 
            TasaOCuota="0.160000" 
            Importe="${imp}"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>`;
  }).join('');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante 
  xmlns:cfdi="http://www.sat.gob.mx/cfd/4" 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
  xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd" 
  Version="4.0" 
  Serie="${FACTURA.serie}" 
  Folio="${FACTURA.folio}" 
  Fecha="${FACTURA.fecha}" 
  Sello="" 
  FormaPago="${FACTURA.formaPago}" 
  NoCertificado="" 
  Certificado="" 
  SubTotal="${FACTURA.subtotal}" 
  Total="${FACTURA.total}" 
  TipoDeComprobante="I" 
  Exportacion="01" 
  MetodoPago="${FACTURA.metodoPago}" 
  LugarExpedicion="${FACTURA.emisor.cp}" 
  Moneda="${FACTURA.moneda}">
  
  <cfdi:Emisor 
    Rfc="${FACTURA.emisor.rfc}" 
    Nombre="${FACTURA.emisor.nombre}" 
    RegimenFiscal="${FACTURA.emisor.regimenFiscal}">
    <cfdi:DomicilioFiscal 
      Calle="${FACTURA.emisor.calle}" 
      NumeroExterior="${FACTURA.emisor.numeroExt}" 
      Colonia="${FACTURA.emisor.colonia}" 
      Ciudad="${FACTURA.emisor.ciudad}" 
      Estado="${FACTURA.emisor.estado}" 
      Pais="${FACTURA.emisor.pais}" 
      CodigoPostal="${FACTURA.emisor.cp}"/>
  </cfdi:Emisor>
  
  <cfdi:Receptor 
    Rfc="${FACTURA.receptor.rfc}" 
    Nombre="${FACTURA.receptor.nombre}" 
    UsoCFDI="${FACTURA.receptor.usoCFDI}">
    <cfdi:Domicilio 
      Calle="${FACTURA.receptor.calle}" 
      NumeroExterior="${FACTURA.receptor.numeroExt}" 
      Colonia="${FACTURA.receptor.colonia}" 
      Ciudad="${FACTURA.receptor.ciudad}" 
      Estado="${FACTURA.receptor.estado}" 
      Pais="${FACTURA.receptor.pais}" 
      CodigoPostal="${FACTURA.receptor.cp}"/>
  </cfdi:Receptor>
  
  <cfdi:Conceptos>
    ${conceptosXml}
  </cfdi:Conceptos>
  
  <cfdi:Impuestos TotalImpuestosTrasladados="${FACTURA.iva}">
    <cfdi:Traslados>
      <cfdi:Traslado 
        Base="${FACTURA.subtotal}" 
        Impuesto="002" 
        TipoFactor="Tasa" 
        TasaOCuota="0.160000" 
        Importe="${FACTURA.iva}"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
</cfdi:Comprobante>`;
}

async function sellarCFDI(): Promise<{ success: boolean; xmlSellado?: string; xmlBase64?: string; error?: string }> {
  try {
    console.log('📄 Generando CFDI 4.0...');
    
    // Leer certificado y llave
    if (!fs.existsSync(CER_PATH)) {
      return { success: false, error: `Certificado no encontrado: ${CER_PATH}` };
    }
    if (!fs.existsSync(KEY_PATH)) {
      return { success: false, error: `Llave no encontrada: ${KEY_PATH}` };
    }
    
    const certDer = fs.readFileSync(CER_PATH);
    const certBase64 = certDer.toString('base64');
    
    // Extraer número de certificado
    const noCert = extraerNumeroCertificado(certDer);
    console.log(`🔢 No. Certificado: ${noCert}`);
    
    // Generar XML con placeholders
    const xmlSinSellar = generarXMLConPlaceholders();
    
    // Generar cadena original CORRECTA según SAT Anexo 20
    const cadenaOriginal = generarCadenaOriginalSAT();
    console.log(`🔗 Cadena original: ${cadenaOriginal}`);
    
    // Guardar para debug
    fs.writeFileSync('cfdi-sin-sellar.xml', xmlSinSellar, 'utf-8');
    fs.writeFileSync('cadena-original.txt', cadenaOriginal, 'utf-8');
    
    // Leer llave privada
    const keyDer = fs.readFileSync(KEY_PATH);
    const privateKey = crypto.createPrivateKey({
      key: keyDer,
      format: 'der',
      type: 'pkcs8',
      passphrase: CSD_PASSWORD
    });
    
    // Firmar con RSA-SHA256
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(cadenaOriginal, 'utf8');
    sign.end();
    const sello = sign.sign(privateKey, 'base64');
    console.log(`🔐 Sello generado (${sello.length} chars)`);
    
    // Ensamblar XML final
    let xmlSellado = xmlSinSellar;
    xmlSellado = xmlSellado.replace(/Sello=""/, `Sello="${sello}"`);
    xmlSellado = xmlSellado.replace(/NoCertificado=""/, `NoCertificado="${noCert}"`);
    xmlSellado = xmlSellado.replace(/Certificado=""/, `Certificado="${certBase64}"`);
    
    // Guardar XML sellado
    fs.writeFileSync('cfdi-sellado.xml', xmlSellado, 'utf-8');
    console.log('💾 CFDI sellado guardado en: cfdi-sellado.xml');
    
    // Convertir a base64
    const xmlBase64 = Buffer.from(xmlSellado, 'utf-8').toString('base64');
    
    return { success: true, xmlSellado, xmlBase64 };
  } catch (error: any) {
    console.error('❌ Error en sellado:', error);
    return { success: false, error: error.message };
  }
}

async function timbrarConPAC(xmlBase64: string): Promise<any> {
  const endpoint = 'https://testing.solucionfactible.com/ws/services/Timbrado';
  
  // SOAP 1.2 request
  const soapRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tim="http://timbrado.ws.cfdi.solucionfactible.com">
  <soapenv:Header/>
  <soapenv:Body>
    <tim:timbrar>
      <tim:usuario>${PAC_USER}</tim:usuario>
      <tim:password>${PAC_PASSWORD}</tim:password>
      <tim:cfdi>${xmlBase64}</tim:cfdi>
      <tim:zip>false</tim:zip>
    </tim:timbrar>
  </soapenv:Body>
</soapenv:Envelope>`;
  
  console.log('\n📡 Enviando al PAC...');
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8',
        'SOAPAction': ''
      },
      body: soapRequest
    });
    
    const responseText = await response.text();
    fs.writeFileSync('pac-response.xml', responseText, 'utf-8');
    
    // Parsear respuesta
    const uuidMatch = responseText.match(/<uuid>([^<]+)<\/uuid>/i);
    const xmlTimbradoMatch = responseText.match(/<cfdiTimbrado>([^<]+)<\/cfdiTimbrado>/i);
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
        mensaje: mensajeMatch ? mensajeMatch[1] : 'OK'
      };
    }
    
    return {
      success: false,
      status: statusMatch ? statusMatch[1] : '500',
      mensaje: faultMatch ? faultMatch[1] : mensajeMatch ? mensajeMatch[1] : 'Error desconocido',
      raw: responseText.substring(0, 500)
    };
  } catch (error: any) {
    return { success: false, mensaje: error.message };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 CFDI 4.0 - Timbrado con CSDs del SAT');
  console.log('='.repeat(60));
  console.log();
  
  // 1. SELLAR
  const resultado = await sellarCFDI();
  
  if (!resultado.success) {
    console.error('\n❌ Error en sellado:', resultado.error);
    return;
  }
  
  console.log('\n✅ CFDI sellado exitosamente!');
  
  // 2. TIMBRAR
  const timbrado = await timbrarConPAC(resultado.xmlBase64!);
  
  console.log('\n' + '='.repeat(60));
  if (timbrado.success) {
    console.log('✅ ¡TIMBRADO EXITOSO!');
    console.log('   UUID:', timbrado.uuid);
    console.log('   Fecha:', timbrado.fechaTimbrado);
    
    if (timbrado.xmlTimbrado) {
      const xmlDecoded = Buffer.from(timbrado.xmlTimbrado, 'base64').toString('utf-8');
      fs.writeFileSync('cfdi-timbrado.xml', xmlDecoded, 'utf-8');
      console.log('   💾 XML timbrado guardado en: cfdi-timbrado.xml');
    }
  } else {
    console.log('❌ ERROR EN TIMBRADO');
    console.log('   Status:', timbrado.status);
    console.log('   Mensaje:', timbrado.mensaje);
    if (timbrado.raw) {
      console.log('   Respuesta:', timbrado.raw);
    }
  }
  console.log('='.repeat(60));
}

main();
