// src/lib/cfdi-generator-minimal.ts

import * as crypto from 'crypto';
import * as fs from 'fs';

// Valores de prueba del SAT (certificados de demostración)
export const CERTIFICADO_PRUEBA = '00001000000518570370';
export const CERTIFICADO_BASE64 = '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';

export function generarFechaParaXML(): string {
    const now = new Date();
    const offset = -now.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(offset) / 60);
    const offsetMinutes = Math.abs(offset) % 60;
    const sign = offset >= 0 ? '+' : '-';
    const iso = now.toISOString().slice(0, 19);
    return `${iso}${sign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
}

export function generarFechaParaCadenaOriginal(): string {
    return new Date().toISOString().slice(0, 19);
}

export function generarCadenaOriginal(): string {
    const folio = Date.now().toString().slice(-10);
    const fecha = generarFechaParaCadenaOriginal();

    // Cadena original EXACTA como la espera el SAT (basada en el error CFDI40102)
    return `||4.0|F|${folio}|${fecha}|03|${CERTIFICADO_PRUEBA}|3500|MXN|4060|I|01|PUE|87500|GUIM980220L20|MARIO ALBERTO GUERRERO IBARRA|626|RGO810620KC3|RODOLFO GARCIA ORTIZ|||G03|84111500|1|E48|SERVICIO|Servicio de ambientación musical|3500.00|3500.00|02|3500.00|002|Tasa|0.160000|560.00|3500|002|Tasa|0.160000|560|560||.`;
}

export function firmarCadenaOriginal(cadenaOriginal: string, rutaLlave: string, password: string): string {
    const keyPem = fs.readFileSync(rutaLlave, 'utf8');
    const sign = crypto.createSign('SHA256');
    sign.update(cadenaOriginal, 'utf8');
    sign.end();
    const signature = sign.sign({ key: keyPem, passphrase: password });
    return signature.toString('base64');
}

export function generarXMLCFDI(sello: string, folio?: string): string {
    const fechaXML = generarFechaParaXML();
    const folioFinal = folio || Date.now().toString().slice(-10);

    return `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd" Version="4.0" Serie="F" Folio="${folioFinal}" Fecha="${fechaXML}" Sello="${sello}" FormaPago="03" NoCertificado="${CERTIFICADO_PRUEBA}" Certificado="${CERTIFICADO_BASE64}" SubTotal="3500" Total="4060" TipoDeComprobante="I" Exportacion="01" LugarExpedicion="87500" MetodoPago="PUE" Moneda="MXN">
  <cfdi:Emisor Rfc="GUIM980220L20" Nombre="MARIO ALBERTO GUERRERO IBARRA" RegimenFiscal="626"/>
  <cfdi:Receptor Rfc="RGO810620KC3" Nombre="RODOLFO GARCIA ORTIZ" UsoCFDI="G03"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="84111500" ClaveUnidad="E48" Cantidad="1" Unidad="SERVICIO" Descripcion="Servicio de ambientación musical" ValorUnitario="3500.00" Importe="3500.00" ObjetoImp="02">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="3500.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="560.00"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="560">
    <cfdi:Traslados>
      <cfdi:Traslado Base="3500" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="560"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
</cfdi:Comprobante>`;
}

export function generarCFDIListoParaTimbrar(rutaLlave: string, password: string) {
    const cadena = generarCadenaOriginal();
    const sello = firmarCadenaOriginal(cadena, rutaLlave, password);
    const xml = generarXMLCFDI(sello);
    const base64 = Buffer.from(xml, 'utf8').toString('base64');

    return { xml, cadena, sello, base64, folio: Date.now().toString().slice(-10) };
}