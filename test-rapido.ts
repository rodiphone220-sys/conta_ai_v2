import * as fs from 'fs';
import * as crypto from 'crypto';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================
const CONFIG = {
  certificado: 'certs/00001000000518570370.cer',
  llavePrivada: 'certs/CSD_UNICA_GUIM980220L20_20230320_000716.key',
  // Lista de contraseñas candidatas
  posiblesContrasenas: ['12345678a', '12345678', 'a', 'CSD_UNICA', 'GUIM980220L20', 'password']
};

const CERTIFICADO_BASE64 = fs.readFileSync(CONFIG.certificado).toString('base64');
const CERTIFICADO_PRUEBA = '00001000000518570370';

// ============================================================================
// UTILIDADES SAT
// ============================================================================

function convertirLlaveSATaPEM(rutaLlave: string, candidatas: string[]): { pem: string, password: string } {
  const derBuffer = fs.readFileSync(rutaLlave);

  for (const pwd of candidatas) {
    try {
      // Intentar desbloquear con esta contraseña
      const keyObject = crypto.createPrivateKey({
        key: derBuffer,
        format: 'der',
        passphrase: pwd
      });
      // Si no lanza error, la contraseña es correcta
      console.log(`🔓 ¡Contraseña correcta encontrada! Usando: "${pwd}"`);
      return {
        pem: keyObject.export({ format: 'pem', type: 'pkcs8' }).toString('utf8'),
        password: pwd
      };
    } catch (err) {
      // Silenciar errores de contraseña incorrecta y probar la siguiente
    }
  }
  throw new Error('Ninguna de las contraseñas probadas funcionó. Verifica el archivo .key');
}

function generarFechaParaXML(): string {
  const now = new Date();
  const offset = -now.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(offset) / 60);
  const offsetMinutes = Math.abs(offset) % 60;
  const sign = offset >= 0 ? '+' : '-';
  const iso = now.toISOString().slice(0, 19);
  return `${iso}${sign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
}

function generarFechaParaCadenaOriginal(): string {
  return new Date().toISOString().slice(0, 19);
}

function generarCadenaOriginal(): string {
  const folio = Date.now().toString().slice(-10);
  const fecha = generarFechaParaCadenaOriginal();
  return `||4.0|F|${folio}|${fecha}|03|${CERTIFICADO_PRUEBA}|3500|MXN|4060|I|01|PUE|87500|GUIM980220L20|MARIO ALBERTO GUERRERO IBARRA|626|RGO810620KC3|RODOLFO GARCIA ORTIZ|||G03|84111500|1|E48|SERVICIO|Servicio de ambientación musical|3500.00|3500.00|02|3500.00|002|Tasa|0.160000|560.00|3500|002|Tasa|0.160000|560|560||.`;
}

function firmarCadenaOriginal(cadenaOriginal: string, llavePEM: string): string {
  const sign = crypto.createSign('SHA256');
  sign.update(cadenaOriginal, 'utf8');
  sign.end();
  const signature = sign.sign(llavePEM);
  return signature.toString('base64');
}

function generarXMLCFDI(sello: string, folio?: string): string {
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

// ============================================================================
// EJECUCIÓN
// ============================================================================
console.log('🚀 Generando CFDI con auto-detección de contraseña...\n');

try {
  if (!fs.existsSync(CONFIG.certificado)) throw new Error(`Certificado no encontrado: ${CONFIG.certificado}`);
  if (!fs.existsSync(CONFIG.llavePrivada)) throw new Error(`Llave no encontrada: ${CONFIG.llavePrivada}`);

  console.log('🔄 Probando contraseñas candidatas...');
  const { pem: llavePEM, password: pwdCorrecta } = convertirLlaveSATaPEM(CONFIG.llavePrivada, CONFIG.posiblesContrasenas);

  console.log('📝 Generando cadena original...');
  const cadena = generarCadenaOriginal();

  console.log('🔒 Firmando digitalmente...');
  const sello = firmarCadenaOriginal(cadena, llavePEM);

  console.log('📄 Construyendo XML final...');
  const xml = generarXMLCFDI(sello);
  const base64 = Buffer.from(xml, 'utf8').toString('base64');

  fs.writeFileSync('cfdi-generado.xml', xml);
  fs.writeFileSync('cadena-original.txt', cadena);
  fs.writeFileSync('cfdi-base64.txt', base64);

  console.log('\n✅ CFDI generado exitosamente\n');
  console.log('📊 Resumen:');
  console.log(`   🔑 Contraseña usada: "${pwdCorrecta}"`);
  console.log('   📁 Certificado:', CONFIG.certificado);
  console.log('   🆔 No. Certificado:', CERTIFICADO_PRUEBA);
  console.log('   📏 Base64 length:', base64.length, 'chars\n');

  console.log('📄 Archivos generados:');
  console.log('   • cfdi-base64.txt      ← Copia TODO el contenido para SoapUI');
  console.log('   • cadena-original.txt  ← Verifica formato\n');

  console.log('✅ ¡Listo! Abre SoapUI, pega el base64 en <tim:cfdi> y ejecuta ▶️');

} catch (error) {
  console.error('\n❌ Error fatal:', error.message);
  process.exit(1);
}