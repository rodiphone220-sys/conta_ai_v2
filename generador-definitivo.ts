import fs from 'fs';
import crypto from 'crypto';

const PAC_ENDPOINT = 'https://testing.solucionfactible.com/ws/services/Timbrado.TimbradoHttpsSoap12Endpoint/';
const PAC_USER = 'testing@solucionfactible.com';
const PAC_PASSWORD = 'timbrado.SF.16672';

const CER_PATH = './certs/csd.cer';
const KEY_PATH = './certs/csd.key';
const CSD_PASSWORD = 'Gunsnroses10';
const NO_CERTIFICADO = '00001000000518570370';

async function main() {
  console.log("🚀 Generando CFDI 4.0 completo...");

  const xmlSinSello = generarXMLCompletoSinSello();
  fs.writeFileSync('cfdi-sin-sello.xml', xmlSinSello);
  console.log("💾 XML sin sello guardado");

  const cadenaOriginal = generarCadenaOriginal();
  console.log("\n🔗 Cadena original:\n", cadenaOriginal);
  fs.writeFileSync('cadena-original.txt', cadenaOriginal);

  const sello = calcularSello(cadenaOriginal);
  console.log("\n🔐 Sello generado (80 primeros chars):");
  console.log(sello.substring(0, 80) + "...");

  const xmlFinal = xmlSinSello.replace('Sello=""', `Sello="${sello}"`);
  fs.writeFileSync('cfdi-sellado-final.xml', xmlFinal);
  console.log("💾 XML sellado guardado");

  await timbrarCFDI(xmlFinal);
}

function generarXMLCompletoSinSello(): string {
  const certBase64 = fs.readFileSync(CER_PATH).toString('base64');

  return `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante 
  xmlns:cfdi="http://www.sat.gob.mx/cfd/4" 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
  xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd" 
  Version="4.0" 
  Serie="F" 
  Folio="0000000001" 
  Fecha="2026-04-01T12:30:00" 
  Sello="" 
  FormaPago="03" 
  NoCertificado="${NO_CERTIFICADO}" 
  Certificado="${certBase64}" 
  SubTotal="3500" 
  Total="4060" 
  TipoDeComprobante="I" 
  Exportacion="01" 
  LugarExpedicion="87500" 
  MetodoPago="PUE" 
  Moneda="MXN">

  <cfdi:Emisor Rfc="GUIM980220L20" Nombre="MARIO ALBERTO GUERRERO IBARRA" RegimenFiscal="626"/>
  <cfdi:Receptor 
      Rfc="RGO810620KC3" 
      Nombre="RODOLFO GARCIA ORTIZ" 
      DomicilioFiscalReceptor="87500" 
      RegimenFiscalReceptor="612" 
      UsoCFDI="G03"/>

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

// Cadena Original actualizada con los datos faltantes del Receptor
function generarCadenaOriginal(): string {
  const partes = [
    "4.0",                    // Version
    "F",                      // Serie
    "0000000001",             // Folio
    "2026-04-01T12:30:00",    // Fecha
    "03",                     // FormaPago
    NO_CERTIFICADO,           // NoCertificado
    "3500",                   // SubTotal
    "MXN",                    // Moneda
    "4060",                   // Total
    "I",                      // TipoDeComprobante
    "01",                     // Exportacion
    "PUE",                    // MetodoPago
    "87500",                  // LugarExpedicion

    // Emisor
    "GUIM980220L20",
    "MARIO ALBERTO GUERRERO IBARRA",
    "626",

    // Receptor con datos ficticios
    "RGO810620KC3",
    "RODOLFO GARCIA ORTIZ",
    "87500",  // DomicilioFiscalReceptor
    "612",    // RegimenFiscalReceptor
    "G03",

    // Concepto
    "84111500",
    "1",
    "E48",
    "SERVICIO",
    "Servicio de ambientación musical",
    "3500.00",
    "3500.00",
    "02",

    // Impuestos del concepto
    "3500.00",
    "002",
    "Tasa",
    "0.160000",
    "560.00",

    // Impuestos globales
    "3500",
    "002",
    "Tasa",
    "0.160000",
    "560",

    "560"  // TotalImpuestosTrasladados
  ];

  return `||${partes.join('|')}||`;
}

function calcularSello(cadena: string): string {
  const keyBuffer = fs.readFileSync(KEY_PATH);

  const privateKey = crypto.createPrivateKey({
    key: keyBuffer,
    format: 'der',
    type: 'pkcs8',
    passphrase: CSD_PASSWORD
  });

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(cadena, 'utf8');
  sign.end();

  return sign.sign(privateKey, 'base64');
}

async function timbrarCFDI(xmlSellado: string) {
  const cfdiBase64 = Buffer.from(xmlSellado, 'utf-8').toString('base64');

  const soap = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tim="http://timbrado.ws.cfdi.solucionfactible.com">
   <soap:Header/>
   <soap:Body>
      <tim:timbrar>
         <tim:usuario>${PAC_USER}</tim:usuario>
         <tim:password>${PAC_PASSWORD}</tim:password>
         <tim:cfdi>${cfdiBase64}</tim:cfdi>
         <tim:zip>false</tim:zip>
      </tim:timbrar>
   </soap:Body>
</soap:Envelope>`;

  console.log("\n📡 Enviando al PAC...");

  const response = await fetch(PAC_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/soap+xml; charset=utf-8',
      'SOAPAction': 'urn:timbrar'
    },
    body: soap
  });

  const respText = await response.text();
  fs.writeFileSync('pac-response.xml', respText);
  console.log("📥 Respuesta guardada en pac-response.xml");
  console.log("Status:", response.status);
}

main().catch(err => console.error("❌ Error:", err.message));