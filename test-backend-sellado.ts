/**
 * Script para probar el sellado del backend
 * 
 * Uso: npx tsx test-backend-sellado.ts
 */

const API_URL = 'http://localhost:3001';

async function testCSD() {
  console.log('🧪 Probando configuración del CSD...\n');

  try {
    const response = await fetch(`${API_URL}/api/csd/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ ¡CSD configurado correctamente!\n');
      console.log('📊 Detalles:');
      console.log('   - No. Certificado:', result.noCertificado);
      console.log('   - Longitud del sello:', result.selloLength);
      console.log('   - Mensaje:', result.message);
    } else {
      console.log('⚠️ CSD no configurado o error:\n');
      console.log('   - Mensaje:', result.message);
    }
  } catch (error: any) {
    console.log('❌ Error de conexión:\n');
    console.log('   - Verifica que el backend esté corriendo en http://localhost:3001');
    console.log('   - Error:', error.message);
  }
}

async function testTimbrado() {
  console.log('\n🧪 Probando timbrado con sellado automático...\n');

  // XML de prueba (sin sello)
  const xmlSinSello = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" Serie="A" Folio="1" Fecha="2026-04-01T00:00:00" Sello="" FormaPago="01" NoCertificado="" Certificado="" SubTotal="100.00" Total="116.00" TipoDeComprobante="I" Exportacion="01" LugarExpedicion="79140" MetodoPago="PUE" Moneda="MXN">
  <cfdi:Emisor Rfc="GUIM980220L20" Nombre="MARIO ALBERTO GUERRERO IBARRA" RegimenFiscal="626"/>
  <cfdi:Receptor Rfc="VIPE9401251Z5" Nombre="ESMERALDA VICENCIO PADRON" DomicilioFiscalReceptor="32320" RegimenFiscalReceptor="612" UsoCFDI="G03"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="84111500" ClaveUnidad="E48" Cantidad="1" Descripcion="HONORARIOS CONTABLES" ValorUnitario="862.07" Importe="862.07" ObjetoImp="02">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="862.07" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="137.93"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="137.93">
    <cfdi:Traslados>
      <cfdi:Traslado Base="862.07" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="137.93"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
</cfdi:Comprobante>`;

  const xmlBase64 = Buffer.from(xmlSinSello, 'utf-8').toString('base64');

  try {
    const response = await fetch(`${API_URL}/api/pac/timbrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xmlBase64, autoSell: true })
    });

    const result = await response.json();

    if (result.uuid) {
      console.log('🎉 ¡TIMBRADO EXITOSO!\n');
      console.log('📊 Detalles:');
      console.log('   - UUID:', result.uuid);
      console.log('   - Fecha:', result.fechaTimbrado);
      console.log('   - Status:', result.status);
      console.log('   - Mensaje:', result.mensaje);
    } else {
      console.log('⚠️ Timbrado fallido:\n');
      console.log('   - Mensaje:', result.mensaje || result.message);
      if (result.rawResponse) {
        console.log('   - Response:', result.rawResponse.substring(0, 200) + '...');
      }
    }
  } catch (error: any) {
    console.log('❌ Error de conexión:\n');
    console.log('   - Verifica que el backend esté corriendo');
    console.log('   - Error:', error.message);
  }
}

async function main() {
  console.log('========================================');
  console.log('  TEST DE SELLADO Y TIMBRADO');
  console.log('========================================\n');

  await testCSD();
  await testTimbrado();

  console.log('\n========================================');
  console.log('  PRUEBAS COMPLETADAS');
  console.log('========================================\n');
}

main();
