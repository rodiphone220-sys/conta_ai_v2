import * as crypto from 'crypto';
import * as fs from 'fs';

// ============================================================================
// INTERFACES
// ============================================================================

interface CFDIEmisor {
    Rfc: string;
    Nombre: string;
    RegimenFiscal: string;
}

interface CFDIReceptor {
    Rfc: string;
    Nombre: string;
    DomicilioFiscalReceptor?: string;
    RegimenFiscalReceptor?: string;
    UsoCFDI: string;
}

interface ConceptoImpuestoTraslado {
    Base: string;
    Impuesto: string;
    TipoFactor: string;
    TasaOCuota: string;
    Importe: string;
}

interface ConceptoImpuestos {
    Traslados?: ConceptoImpuestoTraslado[];
}

interface Concepto {
    ClaveProdServ: string;
    Cantidad: string;
    ClaveUnidad: string;
    Unidad: string;
    Descripcion: string;
    ValorUnitario: string;
    Importe: string;
    ObjetoImp: string;
    Impuestos?: ConceptoImpuestos;
}

interface ImpuestosGlobales {
    TotalImpuestosTrasladados: string;
    Traslados: ConceptoImpuestoTraslado[];
}

interface CFDI {
    Version: string;
    Serie: string;
    Folio: string;
    Fecha: string;
    FormaPago: string;
    NoCertificado: string;
    Certificado: string;
    SubTotal: string;
    Moneda: string;
    Total: string;
    TipoDeComprobante: string;
    Exportacion: string;
    MetodoPago: string;
    LugarExpedicion: string;
    Emisor: CFDIEmisor;
    Receptor: CFDIReceptor;
    Conceptos: Concepto[];
    Impuestos?: ImpuestosGlobales;
}

// ============================================================================
// FUNCIONES DE FECHA
// ============================================================================

/**
 * Genera fecha para el XML CFDI (CON timezone - requerido por SAT)
 * Formato: 2026-04-03T10:30:00-06:00
 */
export function generarFechaParaXML(): string {
    const now = new Date();
    const offset = -now.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(offset) / 60);
    const offsetMinutes = Math.abs(offset) % 60;
    const sign = offset >= 0 ? '+' : '-';
    const iso = now.toISOString().slice(0, 19);
    return `${iso}${sign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
}

/**
 * Genera fecha para la cadena original (SIN timezone - requerido por SAT)
 * Formato: 2026-04-03T10:30:00
 */
export function generarFechaParaCadenaOriginal(): string {
    const now = new Date();
    return now.toISOString().slice(0, 19);
}

// ============================================================================
// GENERACIÓN DE CADENA ORIGINAL
// ============================================================================

/**
 * Genera la cadena original del CFDI 4.0
 * Formato exacto requerido por el SAT
 */
export function generarCadenaOriginal(cfdi: CFDI): string {
    const parts: string[] = ['']; // Inicia con pipe vacío ||

    // === DATOS DEL COMPROBANTE (13 campos) ===
    parts.push(cfdi.Version);                    // 0: 4.0
    parts.push(cfdi.Serie);                      // 1: F
    parts.push(cfdi.Folio);                      // 2: 0000000001
    parts.push(generarFechaParaCadenaOriginal()); // 3: 2026-04-03T10:30:00 (SIN timezone)
    parts.push(cfdi.FormaPago);                  // 4: 03
    parts.push(cfdi.NoCertificado);              // 5: 00001000000518570370
    parts.push(cfdi.SubTotal);                   // 6: 3500
    parts.push(cfdi.Moneda);                     // 7: MXN
    parts.push(cfdi.Total);                      // 8: 4060
    parts.push(cfdi.TipoDeComprobante);          // 9: I
    parts.push(cfdi.Exportacion);                // 10: 01
    parts.push(cfdi.MetodoPago);                 // 11: PUE
    parts.push(cfdi.LugarExpedicion);            // 12: 87500

    // === EMISOR (3 campos) ===
    parts.push(cfdi.Emisor.Rfc);                 // 13: GUIM980220L20
    parts.push(cfdi.Emisor.Nombre);              // 14: MARIO ALBERTO GUERRERO IBARRA
    parts.push(cfdi.Emisor.RegimenFiscal);       // 15: 626

    // === RECEPTOR (6 campos) ===
    parts.push(cfdi.Receptor.Rfc);               // 16: RGO810620KC3
    parts.push(cfdi.Receptor.Nombre);            // 17: RODOLFO GARCIA ORTIZ
    parts.push(cfdi.Receptor.DomicilioFiscalReceptor ?? ''); // 18: "" (vacío)
    parts.push(cfdi.Receptor.RegimenFiscalReceptor ?? '');   // 19: "" (vacío)
    parts.push(cfdi.Receptor.UsoCFDI);           // 20: G03

    // === CONCEPTOS (primer concepto - 10 campos base) ===
    const concepto = cfdi.Conceptos[0];
    parts.push(concepto.ClaveProdServ);          // 21: 84111500
    parts.push(concepto.Cantidad);               // 22: 1
    parts.push(concepto.ClaveUnidad);            // 23: E48
    parts.push(concepto.Unidad);                 // 24: SERVICIO
    parts.push(concepto.Descripcion);            // 25: Servicio de ambientación musical
    parts.push(concepto.ValorUnitario);          // 26: 3500.00
    parts.push(concepto.Importe);                // 27: 3500.00
    parts.push(concepto.ObjetoImp);              // 28: 02

    // === IMPUESTOS DEL CONCEPTO (traslados - 5 campos por traslado) ===
    if (concepto.Impuestos?.Traslados && concepto.Impuestos.Traslados.length > 0) {
        const t = concepto.Impuestos.Traslados[0];
        parts.push(t.Base);                        // 29: 3500.00
        parts.push(t.Impuesto);                    // 30: 002
        parts.push(t.TipoFactor);                  // 31: Tasa
        parts.push(t.TasaOCuota);                  // 32: 0.160000
        parts.push(t.Importe);                     // 33: 560.00
    }

    // === IMPUESTOS GLOBALES (traslados - 5 campos por traslado) ===
    if (cfdi.Impuestos?.Traslados && cfdi.Impuestos.Traslados.length > 0) {
        const t = cfdi.Impuestos.Traslados[0];
        parts.push(t.Base);                        // 34: 3500
        parts.push(t.Impuesto);                    // 35: 002
        parts.push(t.TipoFactor);                  // 36: Tasa
        parts.push(t.TasaOCuota);                  // 37: 0.160000
        parts.push(t.Importe);                     // 38: 560
    }

    // === TOTALES ===
    parts.push(cfdi.Impuestos?.TotalImpuestosTrasladados ?? ''); // 39: 560

    // === CIERRE ===
    parts.push(''); // 40: campo vacío final
    parts.push('.'); // 41: terminador

    return parts.join('|');
}

// ============================================================================
// FUNCIONES DE SELLADO
// ============================================================================

/**
 * Lee el certificado .cer en formato base64
 */
export function leerCertificadoBase64(rutaCertificado: string): string {
    const certBuffer = fs.readFileSync(rutaCertificado);
    return certBuffer.toString('base64');
}

/**
 * Extrae el número de serie del certificado
 */
export function extraerNoCertificado(rutaCertificado: string): string {
    const certBuffer = fs.readFileSync(rutaCertificado);
    const certPem = certBuffer.toString('pem');

    // Buscar el número de serie en el certificado
    const match = certPem.match(/Serial Number: ([0-9A-F]+)/i);
    if (match) {
        return match[1].toUpperCase();
    }

    // Fallback: usar hash del certificado
    const hash = crypto.createHash('sha1').update(certBuffer).digest('hex');
    return hash.toUpperCase().substring(0, 20);
}

/**
 * Firma la cadena original con la llave privada (.key)
 * Retorna el sello digital en base64
 */
export function firmarCadenaOriginal(
    cadenaOriginal: string,
    rutaLlavePrivada: string,
    contrasenaLlave: string
): string {
    // Leer la llave privada
    const keyPem = fs.readFileSync(rutaLlavePrivada, 'utf8');

    // Crear signer con SHA-256
    const sign = crypto.createSign('SHA256');
    sign.update(cadenaOriginal, 'utf8');
    sign.end();

    // Firmar
    const signature = sign.sign({
        key: keyPem,
        passphrase: contrasenaLlave
    });

    // Retornar en base64
    return signature.toString('base64');
}

// ============================================================================
// GENERACIÓN DE XML CFDI
// ============================================================================

/**
 * Genera el XML completo del CFDI con sello y certificado
 */
export function generarXMLCFDI(
    cfdi: CFDI,
    sello: string,
    certificadoBase64: string,
    noCertificado: string
): string {
    const fechaXML = generarFechaParaXML();

    // Construir XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante 
  xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd"
  Version="${cfdi.Version}"
  Serie="${cfdi.Serie}"
  Folio="${cfdi.Folio}"
  Fecha="${fechaXML}"
  Sello="${sello}"
  FormaPago="${cfdi.FormaPago}"
  NoCertificado="${noCertificado}"
  Certificado="${certificadoBase64}"
  SubTotal="${cfdi.SubTotal}"
  Total="${cfdi.Total}"
  TipoDeComprobante="${cfdi.TipoDeComprobante}"
  Exportacion="${cfdi.Exportacion}"
  LugarExpedicion="${cfdi.LugarExpedicion}"
  MetodoPago="${cfdi.MetodoPago}"
  Moneda="${cfdi.Moneda}">
  
  <cfdi:Emisor 
    Rfc="${cfdi.Emisor.Rfc}"
    Nombre="${cfdi.Emisor.Nombre}"
    RegimenFiscal="${cfdi.Emisor.RegimenFiscal}"/>
  
  <cfdi:Receptor 
    Rfc="${cfdi.Receptor.Rfc}"
    Nombre="${cfdi.Receptor.Nombre}"
    ${cfdi.Receptor.DomicilioFiscalReceptor ? `DomicilioFiscalReceptor="${cfdi.Receptor.DomicilioFiscalReceptor}"` : ''}
    ${cfdi.Receptor.RegimenFiscalReceptor ? `RegimenFiscalReceptor="${cfdi.Receptor.RegimenFiscalReceptor}"` : ''}
    UsoCFDI="${cfdi.Receptor.UsoCFDI}"/>
  
  <cfdi:Conceptos>`;

    // Agregar conceptos
    for (const concepto of cfdi.Conceptos) {
        xml += `
    <cfdi:Concepto 
      ClaveProdServ="${concepto.ClaveProdServ}"
      ClaveUnidad="${concepto.ClaveUnidad}"
      Cantidad="${concepto.Cantidad}"
      Unidad="${concepto.Unidad}"
      Descripcion="${concepto.Descripcion}"
      ValorUnitario="${concepto.ValorUnitario}"
      Importe="${concepto.Importe}"
      ObjetoImp="${concepto.ObjetoImp}"`;

        // Agregar impuestos del concepto si existen
        if (concepto.Impuestos?.Traslados && concepto.Impuestos.Traslados.length > 0) {
            xml += `>
      <cfdi:Impuestos>
        <cfdi:Traslados>`;

            for (const t of concepto.Impuestos.Traslados) {
                xml += `
          <cfdi:Traslado 
            Base="${t.Base}"
            Impuesto="${t.Impuesto}"
            TipoFactor="${t.TipoFactor}"
            TasaOCuota="${t.TasaOCuota}"
            Importe="${t.Importe}"/>`;
            }

            xml += `
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>`;
        } else {
            xml += `/>\n`;
        }
    }

    xml += `
  </cfdi:Conceptos>`;

    // Agregar impuestos globales si existen
    if (cfdi.Impuestos && cfdi.Impuestos.Traslados.length > 0) {
        xml += `
  
  <cfdi:Impuestos TotalImpuestosTrasladados="${cfdi.Impuestos.TotalImpuestosTrasladados}">
    <cfdi:Traslados>`;

        for (const t of cfdi.Impuestos.Traslados) {
            xml += `
      <cfdi:Traslado 
        Base="${t.Base}"
        Impuesto="${t.Impuesto}"
        TipoFactor="${t.TipoFactor}"
        TasaOCuota="${t.TasaOCuota}"
        Importe="${t.Importe}"/>`;
        }

        xml += `
    </cfdi:Traslados>
  </cfdi:Impuestos>`;
    }

    xml += `
</cfdi:Comprobante>`;

    return xml;
}

// ============================================================================
// FUNCIÓN PRINCIPAL DE GENERACIÓN
// ============================================================================

/**
 * Genera un CFDI completo listo para timbrar
 */
export function generarCFDICompleto(
    rutaCertificado: string,
    rutaLlavePrivada: string,
    contrasenaLlave: string
): {
    xml: string;
    cadenaOriginal: string;
    sello: string;
    noCertificado: string;
    certificadoBase64: string;
} {
    // Leer certificado y llave
    const certificadoBase64 = leerCertificadoBase64(rutaCertificado);
    const noCertificado = extraerNoCertificado(rutaCertificado);

    // Generar folio único
    const folio = Date.now().toString().padStart(10, '0');

    // Crear estructura CFDI
    const cfdi: CFDI = {
        Version: '4.0',
        Serie: 'F',
        Folio: folio,
        Fecha: generarFechaParaXML(),
        FormaPago: '03',
        NoCertificado: noCertificado,
        Certificado: certificadoBase64,
        SubTotal: '3500',
        Moneda: 'MXN',
        Total: '4060',
        TipoDeComprobante: 'I',
        Exportacion: '01',
        MetodoPago: 'PUE',
        LugarExpedicion: '87500',
        Emisor: {
            Rfc: 'GUIM980220L20',
            Nombre: 'MARIO ALBERTO GUERRERO IBARRA',
            RegimenFiscal: '626'
        },
        Receptor: {
            Rfc: 'RGO810620KC3',
            Nombre: 'RODOLFO GARCIA ORTIZ',
            DomicilioFiscalReceptor: '',
            RegimenFiscalReceptor: '',
            UsoCFDI: 'G03'
        },
        Conceptos: [{
            ClaveProdServ: '84111500',
            Cantidad: '1',
            ClaveUnidad: 'E48',
            Unidad: 'SERVICIO',
            Descripcion: 'Servicio de ambientación musical',
            ValorUnitario: '3500.00',
            Importe: '3500.00',
            ObjetoImp: '02',
            Impuestos: {
                Traslados: [{
                    Base: '3500.00',
                    Impuesto: '002',
                    TipoFactor: 'Tasa',
                    TasaOCuota: '0.160000',
                    Importe: '560.00'
                }]
            }
        }],
        Impuestos: {
            TotalImpuestosTrasladados: '560',
            Traslados: [{
                Base: '3500',
                Impuesto: '002',
                TipoFactor: 'Tasa',
                TasaOCuota: '0.160000',
                Importe: '560'
            }]
        }
    };

    // Generar cadena original
    const cadenaOriginal = generarCadenaOriginal(cfdi);

    // Firmar cadena original
    const sello = firmarCadenaOriginal(cadenaOriginal, rutaLlavePrivada, contrasenaLlave);

    // Generar XML final
    const xml = generarXMLCFDI(cfdi, sello, certificadoBase64, noCertificado);

    return {
        xml,
        cadenaOriginal,
        sello,
        noCertificado,
        certificadoBase64
    };
}

// ============================================================================
// EXPORTACIONES
// ============================================================================

export {
    CFDI,
    CFDIEmisor,
    CFDIReceptor,
    Concepto,
    ConceptoImpuestoTraslado,
    ConceptoImpuestos,
    ImpuestosGlobales
};