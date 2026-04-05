/**
 * Generador de XML CFDI 4.0
 * Genera XML válido según Anexo 20 del SAT
 */

interface Emisor {
  rfc: string;
  nombre: string;
  regimenFiscal: string;
}

interface Receptor {
  rfc: string;
  nombre: string;
  regimenFiscal: string;
  usoCFDI: string;
  domicilioFiscalReceptor: string;
}

interface Concepto {
  claveProdServ: string;
  cantidad: number;
  claveUnidad: string;
  descripcion: string;
  valorUnitario: number;
  importe: number;
  objetoImp?: string;
}

interface CFDIOptions {
  emisor: Emisor;
  receptor: Receptor;
  conceptos: Concepto[];
  formaPago: string;
  metodoPago: string;
  moneda: string;
  tipoComprobante: string;
  lugarExpedicion: string;
  serie?: string;
  folio?: string;
}

/**
 * Genera XML CFDI 4.0 sin sello (para enviar a PAC)
 */
export function generarCFDI(options: CFDIOptions): string {
  const {
    emisor,
    receptor,
    conceptos,
    formaPago,
    metodoPago,
    moneda,
    tipoComprobante,
    lugarExpedicion,
    serie = 'A',
    folio = Date.now().toString().slice(-6)
  } = options;

  // Calcular totales
  const subtotal = conceptos.reduce((sum, c) => sum + c.importe, 0);
  const total = subtotal * 1.16; // IVA 16% incluido

  // Fecha actual en formato CFDI
  const fecha = new Date().toISOString().slice(0, 19);

  // Construir XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante 
  xmlns:cfdi="http://www.sat.gob.mx/cfd/4" 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
  xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd" 
  Version="4.0" 
  Serie="${serie}" 
  Folio="${folio}" 
  Fecha="${fecha}" 
  Sello="" 
  FormaPago="${formaPago}" 
  NoCertificado="" 
  Certificado="" 
  SubTotal="${subtotal.toFixed(2)}" 
  Total="${total.toFixed(2)}" 
  TipoDeComprobante="${tipoComprobante}" 
  Exportacion="01" 
  LugarExpedicion="${lugarExpedicion}" 
  MetodoPago="${metodoPago}" 
  TipoCambio="1" 
  Moneda="${moneda}">
  
  <cfdi:Emisor 
    Rfc="${emisor.rfc}" 
    Nombre="${emisor.nombre}" 
    RegimenFiscal="${emisor.regimenFiscal}"/>
  
  <cfdi:Receptor 
    Rfc="${receptor.rfc}" 
    Nombre="${receptor.nombre}" 
    DomicilioFiscalReceptor="${receptor.domicilioFiscalReceptor}" 
    RegimenFiscalReceptor="${receptor.regimenFiscal}" 
    UsoCFDI="${receptor.usoCFDI}"/>
  
  <cfdi:Conceptos>`;

  // Agregar conceptos
  for (const concepto of conceptos) {
    xml += `
    <cfdi:Concepto 
      ClaveProdServ="${concepto.claveProdServ}" 
      Cantidad="${concepto.cantidad}" 
      ClaveUnidad="${concepto.claveUnidad}" 
      Unidad="Pieza" 
      Descripcion="${concepto.descripcion}" 
      ValorUnitario="${concepto.valorUnitario.toFixed(2)}" 
      Importe="${concepto.importe.toFixed(2)}" 
      ObjetoImp="${concepto.objetoImp || '02'}">
    </cfdi:Concepto>`;
  }

  xml += `
  </cfdi:Conceptos>
  
  <cfdi:Impuestos TotalImpuestosTrasladados="${(total - subtotal).toFixed(2)}">
    <cfdi:Traslados>
      <cfdi:Traslado 
        Base="${subtotal.toFixed(2)}" 
        Impuesto="002" 
        TipoFactor="Tasa" 
        TasaOCuota="0.160000" 
        Importe="${(total - subtotal).toFixed(2)}"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
</cfdi:Comprobante>`;

  return xml;
}

/**
 * Valida que un XML CFDI tenga la estructura básica
 */
export function validarEstructuraCFDI(xml: string): { valido: boolean; errores: string[] } {
  const errores: string[] = [];

  // Verificaciones básicas
  if (!xml.includes('xmlns:cfdi="http://www.sat.gob.mx/cfd/4"')) {
    errores.push('Falta namespace CFDI 4.0');
  }

  if (!xml.includes('<cfdi:Comprobante')) {
    errores.push('Falta elemento Comprobante');
  }

  if (!xml.includes('<cfdi:Emisor')) {
    errores.push('Falta elemento Emisor');
  }

  if (!xml.includes('<cfdi:Receptor')) {
    errores.push('Falta elemento Receptor');
  }

  if (!xml.includes('<cfdi:Conceptos')) {
    errores.push('Falta elemento Conceptos');
  }

  return {
    valido: errores.length === 0,
    errores
  };
}
