import * as fs from 'fs';
import * as crypto from 'crypto';
import * as https from 'https';
import * as forge from 'node-forge';
const SaxonJS = require('saxon-js');

// ============================================
// CONFIGURACIÓN
// ============================================

const PAC_URL = 'https://testing.solucionfactible.com/ws/services/Timbrado.TimbradoHttpSoap11Endpoint/';
const PAC_USER = 'testing@solucionfactible.com';
const PAC_PASSWORD = 'timbrado.SF.16672';

const CER_PATH = './certs/csd.cer';
const KEY_PATH = './certs/csd.key';

const CSD_PASSWORD = 'Gunsnroses10';
const NO_CERTIFICADO = '00001000000518570370';

// ============================================
// DATOS CFDI
// ============================================

const DATOS_CFDI = {
    version: '4.0',
    serie: 'F',
    folio: '1',
    fecha: new Date().toISOString().replace(/\.\d{3}Z$/, '-06:00'),
    formaPago: '03',
    noCertificado: NO_CERTIFICADO,
    subtotal: '3500.00',
    moneda: 'MXN',
    total: '4060.00',
    tipoDeComprobante: 'I',
    exportacion: '01',
    metodoPago: 'PUE',
    lugarExpedicion: '87500',
    emisor: {
        rfc: 'GUIM980220L20',
        nombre: 'MARIO ALBERTO GUERRERO IBARRA',
        regimenFiscal: '626'
    },
    receptor: {
        rfc: 'RGO810620KC3',
        nombre: 'RODOLFO GARCIA ORTIZ',
        domicilioFiscal: '87500',
        regimenFiscal: '605',
        usoCFDI: 'G03'
    }
};

// ============================================
// LLAVE
// ============================================

function leerLlavePrivada(): crypto.KeyObject {

    const keyBytes = fs.readFileSync(KEY_PATH);
    const asn1 = forge.asn1.fromDer(keyBytes.toString('binary'));
    const privateKeyInfo = forge.pki.decryptPrivateKeyInfo(asn1, CSD_PASSWORD);

    const privateKeyForge = forge.pki.privateKeyFromAsn1(privateKeyInfo);
    const pem = forge.pki.privateKeyToPem(privateKeyForge);

    return crypto.createPrivateKey({ key: pem });
}

// ============================================
// XML
// ============================================

function generarXMLSinSello(): string {

    const certificadoBase64 = fs.readFileSync(CER_PATH).toString('base64');

    return `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
Version="4.0"
Serie="F"
Folio="1"
Fecha="${DATOS_CFDI.fecha}"
Sello=""
FormaPago="03"
NoCertificado="${NO_CERTIFICADO}"
Certificado="${certificadoBase64}"
SubTotal="3500.00"
Moneda="MXN"
Total="4060.00"
TipoDeComprobante="I"
Exportacion="01"
MetodoPago="PUE"
LugarExpedicion="87500">
<cfdi:Emisor Rfc="GUIM980220L20" Nombre="MARIO ALBERTO GUERRERO IBARRA" RegimenFiscal="626"/>
<cfdi:Receptor Rfc="RGO810620KC3" Nombre="RODOLFO GARCIA ORTIZ" DomicilioFiscalReceptor="87500" RegimenFiscalReceptor="605" UsoCFDI="G03"/>
</cfdi:Comprobante>`;
}

// ============================================
// CADENA ORIGINAL
// ============================================

function generarCadenaOriginal(xml: string): string {

    const result = SaxonJS.transform({
        stylesheetFileName: './xslt/cadenaoriginal_4_0.xslt',
        sourceText: xml,
        destination: 'serialized'
    });

    return result.principalResult.trim();
}

// ============================================
// SELLO
// ============================================

function calcularSello(cadena: string): string {

    const key = leerLlavePrivada();
    const sign = crypto.createSign('RSA-SHA256');

    sign.update(cadena);
    sign.end();

    return sign.sign(key, 'base64');
}

// ============================================
// MAIN
// ============================================

async function main() {

    console.log("Generando XML...");
    const xml = generarXMLSinSello();

    console.log("Generando cadena...");
    const cadena = generarCadenaOriginal(xml);

    console.log("Firmando...");
    const sello = calcularSello(cadena);

    const xmlFinal = xml.replace('Sello=""', `Sello="${sello}"`);

    fs.writeFileSync('cfdi.xml', xmlFinal);

    console.log("CFDI generado correctamente");
}

main();