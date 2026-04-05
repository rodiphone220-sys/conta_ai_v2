import * as fs from 'fs';
import * as https from 'https';
import * as crypto from 'crypto';
import forge from 'node-forge';

// --- CONFIGURACIÓN DE RUTAS Y PAC ---
// Se utilizan rutas relativas para evitar errores de acceso en OneDrive [2, 3]
const PAC_URL = 'https://testing.solucionfactible.com/ws/services/Timbrado.TimbradoHttpSoap11Endpoint';
const PAC_USER = 'testing@solucionfactible.com';
const PAC_PASSWORD = 'timbrado.SF.16672';
const CER_PATH = './certs/csd.cer';
const KEY_PATH = './certs/csd.key';
const CSD_PASSWORD = 'Gunsnroses10';
const NO_CERTIFICADO = '00001000000518570370';

// --- FUNCIÓN DE FIRMA DIGITAL ---
// Genera el sello RSA-SHA256 requerido para CFDI 4.0 [4, 5]
function firmar(xmlSinSello: string): string {
  const keyBuffer = fs.readFileSync(KEY_PATH);
  const asn1 = forge.asn1.fromDer(keyBuffer.toString('binary'));
  const privateKeyInfo = forge.pki.decryptPrivateKeyInfo(asn1, CSD_PASSWORD);
  const pem = forge.pki.privateKeyToPem(forge.pki.privateKeyFromAsn1(privateKeyInfo));

  const key = crypto.createPrivateKey(pem);
  const signer = crypto.createSign("RSA-SHA256");
  // Nota: Aquí deberías pasar la "Cadena Original" generada por XSLT [6, 7]
  signer.update(xmlSinSello);
  return signer.sign(key, 'base64');
}

// --- GENERACIÓN DE XML CFDI 4.0 ---
function generarXML(): string {
  const certBase64 = fs.readFileSync(CER_PATH).toString('base64');
  const fecha = new Date().toISOString().slice(0, 19);

  // IMPORTANTE: Se eliminó <cfdi:DomicilioFiscal> de Emisor ya que es ilegal en 4.0 [1, 8]
  return `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" Serie="F" Folio="1" Fecha="${fecha}" 
    FormaPago="03" NoCertificado="${NO_CERTIFICADO}" Certificado="${certBase64}" 
    SubTotal="100.00" Moneda="MXN" Total="116.00" TipoDeComprobante="I" Exportacion="01" 
    MetodoPago="PUE" LugarExpedicion="87500">
    <cfdi:Emisor Rfc="GUIM980220L20" Nombre="MARIO ALBERTO GUERRERO IBARRA" RegimenFiscal="626"/>
    <cfdi:Receptor Rfc="RGO810620KC3" Nombre="RODOLFO GARCIA ORTIZ" DomicilioFiscalReceptor="87500" RegimenFiscalReceptor="605" UsoCFDI="G03"/>
    <cfdi:Conceptos>
        <cfdi:Concepto ClaveProdServ="01010101" Cantidad="1" ClaveUnidad="ACT" Descripcion="Servicio de prueba" ValorUnitario="100.00" Importe="100.00" ObjetoImp="02">
            <cfdi:Impuestos>
                <cfdi:Traslados>
                    <cfdi:Traslado Base="100.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="16.00"/>
                </cfdi:Traslados>
            </cfdi:Impuestos>
        </cfdi:Concepto>
    </cfdi:Conceptos>
    <cfdi:Impuestos TotalImpuestosTrasladados="16.00">
        <cfdi:Traslados>
            <cfdi:Traslado Base="100.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="16.00"/>
        </cfdi:Traslados>
    </cfdi:Impuestos>
</cfdi:Comprobante>`;
}

// --- COMUNICACIÓN CON EL PAC (SOAP) ---
async function enviarAlPAC(xml: string) {
  const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tim="http://timbrado.ws.cfdi.solucionfactible.com">
    <soapenv:Header/>
    <soapenv:Body>
        <tim:timbrarCFDI>
            <tim:usuario>${PAC_USER}</tim:usuario>
            <tim:password>${PAC_PASSWORD}</tim:password>
            <tim:cfdi><![CDATA[${xml}]]></tim:cfdi>
        </tim:timbrarCFDI>
    </soapenv:Body>
</soapenv:Envelope>`;

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': '' // REQUERIDO: Previene el error WSA Action = null [9, 10]
    }
  };

  const req = https.request(PAC_URL, options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      fs.writeFileSync('respuesta.xml', data);
      console.log("✅ Proceso completado. Revisa respuesta.xml");
    });
  });

  req.on('error', (e) => console.error("❌ Error de red:", e));
  req.write(soapEnvelope);
  req.end();
}

// --- EJECUCIÓN PRINCIPAL ---
async function main() {
  console.log("📄 Generando XML y Sello...");
  let xml = generarXML();
  const sello = firmar(xml); // En producción, firmar la cadena original exacta [11, 12]
  xml = xml.replace('Sello=""', `Sello="${sello}"`);

  console.log("📤 Enviando a Solución Factible...");
  await enviarAlPAC(xml);
}

main();