// ============================================
// APP_SETUP.GS - Configuración Inicial del Sistema
// ============================================
// Script de UNA SOLA EJECUCIÓN para inicializar todas las hojas necesarias
// Incluye: Usuarios, Facturas, Clientes, Productos, Empresa, Catálogos, OCR_Documentos, Items_Factura, Items_Ticket
// NOTA: Las constantes SPREADSHEET_ID y DRIVE_FOLDER_ID están definidas en Code.gs

/**
 * FUNCIÓN PRINCIPIPAL - EJECUTAR UNA SOLA VEZ
 * Inicializa todas las hojas del sistema
 */
function runInitialSetup() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  Logger.log('=== INICIANDO CONFIGURACIÓN INICIAL ===');
  Logger.log('Spreadsheet: ' + ss.getName());

  // Crear todas las hojas
  createUsuariosSheet(ss);
  createFacturasSheet(ss);
  createClientesSheet(ss);
  createProductosSheet(ss);
  createEmpresaSheet(ss);
  createCatalogosSheet(ss);

  // NUEVAS HOJAS PARA OCR E ITEMS
  createOcrDocumentosSheet(ss);
  createItemsFacturaSheet(ss);
  createItemsTicketSheet(ss);

  // Asegurar que todas las hojas tengan UserID
  addUserIdColumnToSheets(ss);

  // Asegurar columna Password en Usuarios
  addPasswordColumnToUsuarios(ss);

  Logger.log('=== CONFIGURACIÓN COMPLETADA ===');
  Logger.log('Hojas creadas: Usuarios, Facturas, Clientes, Productos, Empresa, Catalogos_SAT, OCR_Documentos, Items_Factura, Items_Ticket');
}

/**
 * Agregar columna Password a hoja Usuarios existente
 */
function addPasswordColumnToUsuarios(ss) {
  var sheet = ss.getSheetByName('Usuarios');
  if (!sheet) return;

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var headerString = headers.join(',');

  if (headerString.indexOf('Password') === -1) {
    var lastCol = headers.length;
    sheet.getRange(1, lastCol + 1).setValue('Password').setFontWeight('bold').setBackground('#667eea').setFontColor('#ffffff');
    sheet.setColumnWidth(lastCol + 1, 150);
    Logger.log('✓ Agregada columna Password a Usuarios');
  } else {
    Logger.log('✓ Usuarios ya tiene columna Password');
  }
}

// ============================================
// HOJA DE USUARIOS
// ============================================
function createUsuariosSheet(ss) {
  var sheet = ss.getSheetByName('Usuarios');
  
  if (sheet) {
    Logger.log('✓ Hoja Usuarios ya existe');
    return sheet;
  }
  
  sheet = ss.insertSheet('Usuarios');
  Logger.log('✓ Creando hoja: Usuarios');
  
  const headers = [
    'UserID', 'Email', 'Nombre', 'GoogleID', 'DriveFolderID', 'DriveFolderUrl',
    'RFC_Empresa', 'Nombre_Empresa', 'FechaRegistro', 'UltimoAcceso', 'Activo'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#667eea')
    .setFontColor('#ffffff');
  
  // Ajustar anchos de columna
  sheet.setColumnWidth(1, 120);  // UserID
  sheet.setColumnWidth(2, 200);  // Email
  sheet.setColumnWidth(3, 150);  // Nombre
  sheet.setColumnWidth(4, 100);  // GoogleID
  sheet.setColumnWidth(5, 180);  // DriveFolderID
  sheet.setColumnWidth(6, 250);  // DriveFolderUrl
  sheet.setColumnWidth(7, 130);  // RFC_Empresa
  sheet.setColumnWidth(8, 150);  // Nombre_Empresa
  sheet.setColumnWidth(9, 150);  // FechaRegistro
  sheet.setColumnWidth(10, 150); // UltimoAcceso
  sheet.setColumnWidth(11, 80);  // Activo
  
  return sheet;
}

// ============================================
// HOJA DE FACTURAS
// ============================================
function createFacturasSheet(ss) {
  var sheet = ss.getSheetByName('Facturas');
  
  if (sheet) {
    Logger.log('✓ Hoja Facturas ya existe');
    return sheet;
  }
  
  sheet = ss.insertSheet('Facturas');
  Logger.log('✓ Creando hoja: Facturas');
  
  const headers = [
    'ID', 'UserID', 'Fecha', 'Serie', 'Folio', 'UUID',
    'RFC_Emisor', 'Nombre_Emisor', 'RFC_Receptor', 'Nombre_Receptor',
    'UsoCFDI', 'MetodoPago', 'FormaPago', 'RegimenFiscal',
    'Subtotal', 'IVA', 'Total', 'Status', 'PDF_Url', 'XML_Url'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#4285f4')
    .setFontColor('#ffffff');
  
  // Ajustar anchos
  headers.forEach(function(_, i) { sheet.setColumnWidth(i + 1, 120); });
  sheet.setColumnWidth(3, 150);  // Fecha
  sheet.setColumnWidth(6, 200);  // UUID
  
  return sheet;
}

// ============================================
// HOJA DE CLIENTES
// ============================================
function createClientesSheet(ss) {
  var sheet = ss.getSheetByName('Clientes');
  
  if (sheet) {
    Logger.log('✓ Hoja Clientes ya existe');
    return sheet;
  }
  
  sheet = ss.insertSheet('Clientes');
  Logger.log('✓ Creando hoja: Clientes');
  
  const headers = [
    'ID', 'UserID', 'RFC', 'Nombre', 'Email', 'Telefono',
    'Calle', 'NumeroExt', 'NumeroInt', 'Colonia', 'Municipio',
    'Estado', 'Pais', 'CP', 'RegimenFiscal', 'FechaAlta'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#34a853')
    .setFontColor('#ffffff');
  
  headers.forEach(function(_, i) { sheet.setColumnWidth(i + 1, 120); });
  
  return sheet;
}

// ============================================
// HOJA DE PRODUCTOS
// ============================================
function createProductosSheet(ss) {
  var sheet = ss.getSheetByName('Productos');
  
  if (sheet) {
    Logger.log('✓ Hoja Productos ya existe');
    return sheet;
  }
  
  sheet = ss.insertSheet('Productos');
  Logger.log('✓ Creando hoja: Productos');
  
  const headers = [
    'ID', 'UserID', 'ClaveProdServ', 'ClaveUnidad', 'Nombre', 'Descripcion',
    'PrecioUnitario', 'Impuesto', 'TasaImpuesto', 'FechaAlta'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#fbbc05')
    .setFontColor('#000000');
  
  headers.forEach(function(_, i) { sheet.setColumnWidth(i + 1, 120); });
  sheet.setColumnWidth(6, 250);  // Descripcion
  
  return sheet;
}

// ============================================
// HOJA DE EMPRESA
// ============================================
function createEmpresaSheet(ss) {
  var sheet = ss.getSheetByName('Empresa');
  
  if (sheet) {
    Logger.log('✓ Hoja Empresa ya existe');
    return sheet;
  }
  
  sheet = ss.insertSheet('Empresa');
  Logger.log('✓ Creando hoja: Empresa');
  
  const headers = [
    'UserID', 'Nombre', 'RFC', 'Calle', 'NumeroExt', 'NumeroInt',
    'Colonia', 'Municipio', 'Estado', 'Pais', 'CP',
    'Email', 'Telefono', 'RegimenFiscal', 'Certificado', 'LlavePrivada'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#ea4335')
    .setFontColor('#ffffff');
  
  headers.forEach(function(_, i) { sheet.setColumnWidth(i + 1, 150); });
  sheet.setColumnWidth(15, 200); // Certificado
  sheet.setColumnWidth(16, 200); // LlavePrivada
  
  return sheet;
}

// ============================================
// HOJA DE CATÁLOGOS SAT
// ============================================
function createCatalogosSheet(ss) {
  var sheet = ss.getSheetByName('Catalogos_SAT');
  
  if (sheet) {
    Logger.log('✓ Hoja Catalogos_SAT ya existe');
    return sheet;
  }
  
  sheet = ss.insertSheet('Catalogos_SAT');
  Logger.log('✓ Creando hoja: Catalogos_SAT');
  
  sheet.getRange(1, 1, 1, 4).setValues([['Catalogo', 'Clave', 'Descripcion', 'Activo']]);
  sheet.getRange(1, 1, 1, 4)
    .setFontWeight('bold')
    .setBackground('#673ab7')
    .setFontColor('#ffffff');
  
  // Agregar datos de catálogos
  addCatalogoData(sheet);
  
  // Congelar primera fila y aplicar filtro
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, 4).createFilter();
  
  return sheet;
}

function addCatalogoData(sheet) {
  var catalogos = [
    // UsoCFDI
    ['UsoCFDI', 'G01', 'Adquisición de mercancias', true],
    ['UsoCFDI', 'G02', 'Devoluciones, descuentos o bonificaciones', true],
    ['UsoCFDI', 'G03', 'Gastos en general', true],
    ['UsoCFDI', 'I01', 'Construcciones', true],
    ['UsoCFDI', 'I02', 'Mobilario y equipo de oficina por inversiones', true],
    ['UsoCFDI', 'I03', 'Equipo de transporte', true],
    ['UsoCFDI', 'I04', 'Equipo de computo y accesorios', true],
    ['UsoCFDI', 'I05', 'Dados, troqueles, moldes y herramientas', true],
    ['UsoCFDI', 'I06', 'Comunicacion', true],
    ['UsoCFDI', 'I07', 'Telecomunicaciones', true],
    ['UsoCFDI', 'I08', 'Satelitales', true],
    ['UsoCFDI', 'P01', 'Por definir', true],
    // MetodoPago
    ['MetodoPago', 'PUE', 'Pago en una sola exhibición', true],
    ['MetodoPago', 'PPD', 'Pago en parcialidades o diferido', true],
    // FormaPago
    ['FormaPago', '01', 'Efectivo', true],
    ['FormaPago', '02', 'Cheque nominativo', true],
    ['FormaPago', '03', 'Transferencia electrónica de fondos', true],
    ['FormaPago', '04', 'Tarjeta de crédito', true],
    ['FormaPago', '05', 'Monedero electrónico', true],
    ['FormaPago', '06', 'Dinero electrónico', true],
    ['FormaPago', '08', 'Vales de despensa', true],
    ['FormaPago', '28', 'Tarjeta de débito', true],
    ['FormaPago', '29', 'Tarjeta de servicios', true],
    // Unidad
    ['Unidad', 'H87', 'Unidad de servicio', true],
    ['Unidad', 'E48', 'Unidad de servicio de telecomunicacion', true],
    ['Unidad', 'ACT', 'Actividad', true],
    ['Unidad', 'PIE', 'Pie', true],
    ['Unidad', 'KG', 'Kilogramo', true],
    // RegimenFiscal
    ['RegimenFiscal', '601', 'General de Ley Personas Morales', true],
    ['RegimenFiscal', '603', 'Personas Morales con fines no lucrativos', true],
    ['RegimenFiscal', '605', 'Sueldos y Salarios e Ingresos Asimilados a Salarios', true],
    ['RegimenFiscal', '606', 'Arrendamiento', true],
    ['RegimenFiscal', '608', 'Dividendos', true],
    ['RegimenFiscal', '609', 'FFOM', true],
    ['RegimenFiscal', '610', 'ResICO', true],
    ['RegimenFiscal', '611', 'Intereses', true],
    ['RegimenFiscal', '612', 'Personas Físicas con Actividad Empresarial', true],
    ['RegimenFiscal', '614', 'Ingresos por intereses', true],
    ['RegimenFiscal', '615', 'Sin obligaciones fiscales', true],
    // TipoRelacion
    ['TipoRelacion', '01', 'Nota de crédito', true],
    ['TipoRelacion', '02', 'Nota de débito', true],
    ['TipoRelacion', '03', 'Devolución', true],
    ['TipoRelacion', '04', 'Descuento', true],
    ['TipoRelacion', '05', 'Diferencia en Références', true],
    ['TipoRelacion', '06', 'Diferencia en precio', true],
    ['TipoRelacion', '07', 'Por anticipos', true],
    ['TipoRelacion', '08', 'Por prorrogas', true],
  ];
  
  sheet.getRange(2, 1, catalogos.length, 4).setValues(catalogos);
  Logger.log('✓ Agregados ' + catalogos.length + ' registros de catálogos SAT');
}

// ============================================
// NUEVA: HOJA DE DOCUMENTOS OCR
// ============================================
function createOcrDocumentosSheet(ss) {
  var sheet = ss.getSheetByName('OCR_Documentos');
  
  if (sheet) {
    Logger.log('✓ Hoja OCR_Documentos ya existe');
    return sheet;
  }
  
  sheet = ss.insertSheet('OCR_Documentos');
  Logger.log('✓ Creando hoja: OCR_Documentos');
  
  const headers = [
    'ID', 'UserID', 'Fecha', 'TipoDocumento', 'NombreArchivo',
    'RFC_Emisor', 'Nombre_Emisor', 'UUID', 'Fecha_Documento',
    'Subtotal', 'IVA', 'Total', 'EsDeducible', 'RegimenUsuario',
    'FileID', 'FileURL', 'RawText'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#10b981')
    .setFontColor('#ffffff');
  
  // Ajustar anchos
  sheet.setColumnWidth(1, 100);   // ID
  sheet.setColumnWidth(2, 120);   // UserID
  sheet.setColumnWidth(3, 150);   // Fecha
  sheet.setColumnWidth(4, 100);   // TipoDocumento
  sheet.setColumnWidth(5, 200);   // NombreArchivo
  sheet.setColumnWidth(6, 130);   // RFC_Emisor
  sheet.setColumnWidth(7, 180);   // Nombre_Emisor
  sheet.setColumnWidth(8, 200);   // UUID
  sheet.setColumnWidth(9, 120);   // Fecha_Documento
  sheet.setColumnWidth(10, 100);  // Subtotal
  sheet.setColumnWidth(11, 100);  // IVA
  sheet.setColumnWidth(12, 100);  // Total
  sheet.setColumnWidth(13, 100);  // EsDeducible
  sheet.setColumnWidth(14, 100);  // RegimenUsuario
  sheet.setColumnWidth(15, 180);  // FileID
  sheet.setColumnWidth(16, 250);  // FileURL
  sheet.setColumnWidth(17, 300);  // RawText
  
  // Congelar primera fila
  sheet.setFrozenRows(1);
  
  return sheet;
}

// ============================================
// NUEVA: HOJA DE ITEMS DE FACTURA
// ============================================
function createItemsFacturaSheet(ss) {
  var sheet = ss.getSheetByName('Items_Factura');
  
  if (sheet) {
    Logger.log('✓ Hoja Items_Factura ya existe');
    return sheet;
  }
  
  sheet = ss.insertSheet('Items_Factura');
  Logger.log('✓ Creando hoja: Items_Factura');
  
  const headers = [
    'ID', 'FacturaID', 'UserID', 'ClaveProdServ', 'ClaveUnidad',
    'Cantidad', 'Descripcion', 'ValorUnitario', 'Importe',
    'ObjetoImp', 'BaseImpuesto', 'TasaImpuesto', 'ImporteImpuesto',
    'FechaAlta'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#00bcd4')
    .setFontColor('#ffffff');
  
  // Ajustar anchos
  sheet.setColumnWidth(1, 100);   // ID
  sheet.setColumnWidth(2, 120);   // FacturaID
  sheet.setColumnWidth(3, 120);   // UserID
  sheet.setColumnWidth(4, 120);   // ClaveProdServ
  sheet.setColumnWidth(5, 100);   // ClaveUnidad
  sheet.setColumnWidth(6, 100);   // Cantidad
  sheet.setColumnWidth(7, 300);   // Descripcion
  sheet.setColumnWidth(8, 120);   // ValorUnitario
  sheet.setColumnWidth(9, 120);   // Importe
  sheet.setColumnWidth(10, 100);  // ObjetoImp
  sheet.setColumnWidth(11, 120);  // BaseImpuesto
  sheet.setColumnWidth(12, 100);  // TasaImpuesto
  sheet.setColumnWidth(13, 120);  // ImporteImpuesto
  sheet.setColumnWidth(14, 150);  // FechaAlta
  
  // Congelar primera fila
  sheet.setFrozenRows(1);
  
  return sheet;
}

// ============================================
// NUEVA: HOJA DE ITEMS DE TICKET
// ============================================
function createItemsTicketSheet(ss) {
  var sheet = ss.getSheetByName('Items_Ticket');
  
  if (sheet) {
    Logger.log('✓ Hoja Items_Ticket ya existe');
    return sheet;
  }
  
  sheet = ss.insertSheet('Items_Ticket');
  Logger.log('✓ Creando hoja: Items_Ticket');
  
  const headers = [
    'ID', 'TicketID', 'UserID', 'Producto', 'Cantidad',
    'PrecioUnitario', 'Importe', 'Categoria', 'Marca',
    'Presentacion', 'FechaAlta'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#ff9800')
    .setFontColor('#ffffff');
  
  // Ajustar anchos
  sheet.setColumnWidth(1, 100);   // ID
  sheet.setColumnWidth(2, 120);   // TicketID
  sheet.setColumnWidth(3, 120);   // UserID
  sheet.setColumnWidth(4, 250);   // Producto
  sheet.setColumnWidth(5, 100);   // Cantidad
  sheet.setColumnWidth(6, 120);   // PrecioUnitario
  sheet.setColumnWidth(7, 120);   // Importe
  sheet.setColumnWidth(8, 150);   // Categoria
  sheet.setColumnWidth(9, 150);   // Marca
  sheet.setColumnWidth(10, 150);  // Presentacion
  sheet.setColumnWidth(11, 150);  // FechaAlta
  
  // Congelar primera fila
  sheet.setFrozenRows(1);
  
  return sheet;
}

// ============================================
// AGREGAR COLUMNA USERID A HOJAS EXISTENTES
// ============================================
function addUserIdColumnToSheets(ss) {
  var sheetsToUpdate = ['Clientes', 'Facturas', 'Productos', 'Empresa', 'OCR_Documentos', 'Items_Factura', 'Items_Ticket'];
  
  sheetsToUpdate.forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      Logger.log('⚠ Hoja ' + sheetName + ' no existe, saltando...');
      return;
    }
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var headerString = headers.join(',');
    
    if (headerString.indexOf('UserID') === -1) {
      sheet.insertColumnAfter(1);
      sheet.getRange(1, 2).setValue('UserID');
      sheet.getRange(1, 2).setFontWeight('bold');
      sheet.setColumnWidth(2, 120);
      Logger.log('✓ Agregada columna UserID a hoja: ' + sheetName);
    } else {
      Logger.log('✓ Hoja ' + sheetName + ' ya tiene columna UserID');
    }
  });
}

// ============================================
// TEST DE CONEXIÓN
// ============================================
function testConnection() {
  Logger.log('=== TEST DE CONEXIÓN ===');
  
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    Logger.log('✓ Spreadsheet conectado: ' + ss.getName());
    
    var sheets = ss.getSheets();
    Logger.log('✓ Hojas encontradas: ' + sheets.map(function(s) { return s.getName(); }).join(', '));
    
    var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    Logger.log('✓ Drive folder conectado: ' + folder.getName());
    
    return {
      success: true,
      spreadsheet: ss.getName(),
      sheets: sheets.map(function(s) { return s.getName(); }),
      folder: folder.getName()
    };
  } catch (error) {
    Logger.log('✗ Error: ' + error.message);
    return { success: false, error: error.message };
  }
}

// ============================================
// LIMPIAR DATOS DE PRUEBA
// ============================================
function cleanTestData() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  ['Facturas', 'Clientes', 'Productos', 'OCR_Documentos', 'Items_Factura', 'Items_Ticket'].forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (sheet && sheet.getLastRow() > 1) {
      var lastRow = sheet.getLastRow();
      sheet.deleteRows(2, lastRow - 1);
      Logger.log('✓ Limpiados ' + (lastRow - 1) + ' registros de ' + sheetName);
    }
  });
  
  Logger.log('✓ Datos de prueba eliminados');
  return { message: 'Datos de prueba eliminados' };
}

// ============================================
// VERIFICAR ESTRUCTURA DE HOJAS
// ============================================
function verifySheetStructure() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheets = ss.getSheets();
  
  Logger.log('=== VERIFICACIÓN DE ESTRUCTURA ===');
  
  var requiredSheets = [
    'Usuarios', 'Facturas', 'Clientes', 'Productos', 'Empresa',
    'Catalogos_SAT', 'OCR_Documentos', 'Items_Factura', 'Items_Ticket'
  ];
  
  var result = {
    missing: [],
    existing: [],
    totalRows: {}
  };
  
  requiredSheets.forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      result.existing.push(sheetName);
      result.totalRows[sheetName] = sheet.getLastRow();
      Logger.log('✓ ' + sheetName + ': ' + sheet.getLastRow() + ' filas');
    } else {
      result.missing.push(sheetName);
      Logger.log('✗ FALTA: ' + sheetName);
    }
  });
  
  Logger.log('=== RESUMEN ===');
  Logger.log('Hojas existentes: ' + result.existing.length);
  Logger.log('Hojas faltantes: ' + result.missing.length);
  
  if (result.missing.length > 0) {
    Logger.log('⚠ Ejecuta runInitialSetup para crear las hojas faltantes');
  }
  
  return result;
}
