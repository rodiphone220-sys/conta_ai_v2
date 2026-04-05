// ============================================
// CODE.GS - Funciones principales para la app
// ============================================
// Estas funciones son las que se llaman desde el frontend
// ACTUALIZADO: Incluye soporte para documentos OCR

const SPREADSHEET_ID = '1CTAHN_J9qDgIw46hSjvaADEpQeBZrhxU8k7Kj5Ea2iQ';
const DRIVE_FOLDER_ID = '1wrUJ75QDhClTGgcJU2jJSUs6v29BK-IZ';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxsXMT1Wr3gMtBi3RYl6kFfOYy8OHJV_yEZCT84MVXfaRmfZwVOHLPTBhIkaFajZ3aF/exec';

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('My Conta Ai - API')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  const action = e.parameter.action;
  let result;

  try {
    const postData = e.postData ? JSON.parse(e.postData.contents) : {};

    switch(action) {
      case 'saveInvoice':
        result = saveInvoice(postData);
        break;
      case 'saveInvoiceItems':
        result = saveInvoiceItems(postData.items, postData.invoiceId, postData.userId);
        break;
      case 'getInvoiceItems':
        result = getInvoiceItems(postData.invoiceId);
        break;
      case 'saveTicketItems':
        result = saveTicketItems(postData.items, postData.ticketId, postData.userId, postData.ocrData);
        break;
      case 'getTicketItems':
        result = getTicketItems(postData.ticketId);
        break;
      case 'getInvoices':
        result = getInvoices(postData.userId);
        break;
      case 'getInvoice':
        result = getInvoice(postData.id, postData.userId);
        break;
      case 'saveClient':
        result = saveClient(postData);
        break;
      case 'getClients':
        result = getClients(postData.userId);
        break;
      case 'saveProduct':
        result = saveProduct(postData);
        break;
      case 'getProducts':
        result = getProducts(postData.userId);
        break;
      case 'savePdfToDrive':
        result = savePdfToDrive(postData);
        break;
      case 'saveXmlToDrive':
        result = saveXmlToDrive(postData);
        break;
      case 'saveOcrDocumentToDrive':
        result = saveOcrDocumentToDrive(postData);
        break;
      case 'getOcrDocuments':
        result = getOcrDocuments(postData.userId);
        break;
      case 'getCompanyData':
        result = getCompanyData(postData.userId);
        break;
      case 'saveCompanyData':
        result = saveCompanyData(postData);
        break;
      case 'consultaRFC':
        result = consultaRFC(e.parameter.rfc);
        break;
      case 'sendWelcomeEmail':
        result = sendWelcomeEmail(postData);
        break;
      case 'sendInvoiceEmail':
        result = sendInvoiceEmail(postData);
        break;
      case 'testGmail':
        result = testGmail();
        break;
      case 'createUserFolder':
        result = createUserFolder(postData);
        break;
      case 'createUser':
        result = createUser(postData);
        break;
      case 'getUser':
        result = getUser(postData.email);
        break;
      case 'updateUserRFC':
        result = updateUserRFC(postData);
        break;
      case 'updateUser':
        result = updateUser(postData);
        break;
      default:
        throw new Error(`Acción desconocida: ${action}`);
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================
// CREACIÓN DE CARPETAS DE USUARIO (ACTUALIZADO)
// ============================================

function createUserFolder(data) {
  const { userId, userName, email } = data;

  if (!userId || !userName) {
    throw new Error('userId y userName son requeridos');
  }

  const parentFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);

  const folderName = `${userName.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '')}_${userId}`;

  let userFolder;
  const existingFolders = parentFolder.getFoldersByName(folderName);

  if (existingFolders.hasNext()) {
    userFolder = existingFolders.next();
  } else {
    userFolder = parentFolder.createFolder(folderName);
  }

  // Subcarpetas principales (ACTUALIZADO: incluye "Documentos OCR")
  const subfolders = ['Facturas', 'XML', 'PDF', 'Imagenes', 'Reportes', 'Documentos OCR'];
  const createdFolders = {};

  for (const subfolderName of subfolders) {
    const existingSubfolders = userFolder.getFoldersByName(subfolderName);

    if (existingSubfolders.hasNext()) {
      createdFolders[subfolderName] = existingSubfolders.next().getId();
    } else {
      const subfolder = userFolder.createFolder(subfolderName);
      createdFolders[subfolderName] = subfolder.getId();
    }
  }

  // Crear subcarpetas adicionales para organización de OCR
  const ocrFolder = DriveApp.getFolderById(createdFolders['Documentos OCR']);
  const ocrSubfolders = ['Tickets', 'Facturas Proveedores', 'Comprobantes'];
  const ocrSubfolderIds = {};

  for (const subfolderName of ocrSubfolders) {
    const existingSubfolders = ocrFolder.getFoldersByName(subfolderName);
    if (existingSubfolders.hasNext()) {
      ocrSubfolderIds[subfolderName] = existingSubfolders.next().getId();
    } else {
      const subfolder = ocrFolder.createFolder(subfolderName);
      ocrSubfolderIds[subfolderName] = subfolder.getId();
    }
  }

  return {
    userFolderId: userFolder.getId(),
    userFolderUrl: userFolder.getUrl(),
    subfolders: createdFolders,
    ocrSubfolders: ocrSubfolderIds,
    message: `Carpeta de usuario creada exitosamente para ${userName} con soporte OCR`
  };
}

// ============================================
// FUNCIONES PARA DOCUMENTOS OCR
// ============================================

function saveOcrDocumentToDrive(data) {
  const { userId, documentType, imageBase64, fileName, extractedData } = data;

  if (!userId || !imageBase64) {
    throw new Error('userId e imageBase64 son requeridos');
  }

  // Obtener carpeta del usuario
  const userFolder = getUserFolder(userId);
  if (!userFolder) {
    throw new Error('No se encontró la carpeta del usuario');
  }

  // Navegar a la carpeta "Documentos OCR"
  const ocrFolderName = 'Documentos OCR';
  let ocrFolder;
  const existingOcrFolders = userFolder.getFoldersByName(ocrFolderName);

  if (existingOcrFolders.hasNext()) {
    ocrFolder = existingOcrFolders.next();
  } else {
    ocrFolder = userFolder.createFolder(ocrFolderName);
  }

  // Navegar a subcarpeta según tipo de documento
  let targetFolder = ocrFolder;
  if (documentType === 'ticket') {
    const ticketFolders = ocrFolder.getFoldersByName('Tickets');
    if (ticketFolders.hasNext()) {
      targetFolder = ticketFolders.next();
    }
  } else if (documentType === 'factura') {
    const facturaFolders = ocrFolder.getFoldersByName('Facturas Proveedores');
    if (facturaFolders.hasNext()) {
      targetFolder = facturaFolders.next();
    }
  } else {
    const comprobantesFolders = ocrFolder.getFoldersByName('Comprobantes');
    if (comprobantesFolders.hasNext()) {
      targetFolder = comprobantesFolders.next();
    }
  }

  // Generar nombre de archivo
  const timestamp = new Date().getTime();
  const safeFileName = fileName ? fileName.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.-]/g, '_') : `OCR_${timestamp}`;
  const fullFileName = `${safeFileName}_${timestamp}.jpg`;

  // Decodificar y guardar imagen
  const blob = Utilities.newBlob(
    Utilities.base64Decode(imageBase64),
    'image/jpeg',
    fullFileName
  );

  const file = targetFolder.createFile(blob);

  // Guardar metadata en hoja de cálculo
  saveOcrMetadata(userId, file, extractedData);

  return {
    id: file.getId(),
    name: file.getName(),
    url: file.getUrl(),
    downloadUrl: file.getDownloadUrl(),
    message: 'Documento OCR guardado exitosamente en Google Drive'
  };
}

function saveOcrMetadata(userId, file, extractedData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('OCR_Documentos');

  if (!sheet) {
    sheet = ss.insertSheet('OCR_Documentos');
    sheet.getRange(1, 1, 1, 15).setValues([[
      'ID', 'UserID', 'Fecha', 'TipoDocumento', 'NombreArchivo',
      'RFC_Emisor', 'Nombre_Emisor', 'UUID', 'Fecha_Documento',
      'Subtotal', 'IVA', 'Total', 'EsDeducible', 'FileID', 'FileURL'
    ]]);
    sheet.getRange(1, 1, 1, 15).setFontWeight('bold').setBackground('#10b981').setFontColor('#ffffff');
  }

  const docId = `OCR-${Date.now()}`;
  const row = [
    docId,
    userId,
    new Date().toISOString(),
    extractedData?.documentType || 'unknown',
    file.getName(),
    extractedData?.rfcEmisor || '',
    extractedData?.nombreEmisor || '',
    extractedData?.uuid || '',
    extractedData?.fecha || '',
    extractedData?.subtotal || 0,
    extractedData?.iva || 0,
    extractedData?.total || 0,
    extractedData?.isDeductible ? 'Sí' : 'No',
    file.getId(),
    file.getUrl()
  ];

  sheet.appendRow(row);
  return docId;
}

function getOcrDocuments(userId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('OCR_Documentos');

  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const userIdIndex = headers.indexOf('UserID');

  if (userIdIndex === -1) return [];

  const documents = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][userIdIndex] === userId) {
      const obj = {};
      headers.forEach((h, idx) => obj[h] = data[i][idx]);
      documents.push(obj);
    }
  }

  return documents;
}

// ============================================
// FUNCIONES DE USUARIOS
// ============================================

function createUser(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Usuarios');

  if (!sheet) {
    throw new Error('Hoja Usuarios no existe. Ejecuta setup primero.');
  }

  // Asegurar que exista la columna Password
  ensurePasswordColumn(sheet);

  const dataRange = sheet.getDataRange().getValues();
  const headers = dataRange[0];
  const emailIndex = headers.indexOf('Email');

  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][emailIndex] === data.email) {
      return { success: true, userId: dataRange[i][0], existing: true };
    }
  }

  const now = new Date().toISOString();
  const row = [
    data.userId,
    data.email,
    data.name,
    data.googleId || '',
    data.driveFolderId || '',
    data.driveFolderUrl || '',
    '',               // RFC_Empresa
    '',               // Nombre_Empresa
    now,              // FechaRegistro
    now,              // UltimoAcceso
    true,             // Activo
    data.password || '' // Password (columna 12)
  ];

  sheet.appendRow(row);
  return { success: true, userId: data.userId, message: 'Usuario creado' };
}

function ensurePasswordColumn(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const passwordIndex = headers.indexOf('Password');
  
  if (passwordIndex === -1) {
    const lastCol = headers.length;
    sheet.getRange(1, lastCol + 1).setValue('Password').setFontWeight('bold');
    sheet.setColumnWidth(lastCol + 1, 150);
  }
}

function getUser(email) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Usuarios');

  if (!sheet) return null;

  // Asegurar columna Password
  ensurePasswordColumn(sheet);

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const emailIndex = headers.indexOf('Email');

  for (let i = 1; i < data.length; i++) {
    if (data[i][emailIndex] === email) {
      const user = {};
      headers.forEach((h, idx) => user[h] = data[i][idx]);
      return user;
    }
  }

  return null;
}

function updateUserRFC(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Usuarios');

  if (!sheet) return { success: false, error: 'Hoja Usuarios no existe' };

  const sheetData = sheet.getDataRange().getValues();
  const headers = sheetData[0];
  const emailIndex = headers.indexOf('Email');
  const rfcIndex = headers.indexOf('RFC_Empresa');
  const nombreIndex = headers.indexOf('Nombre_Empresa');

  for (let i = 1; i < sheetData.length; i++) {
    if (sheetData[i][emailIndex] === data.email) {
      sheet.getRange(i + 1, rfcIndex + 1).setValue(data.rfc);
      sheet.getRange(i + 1, nombreIndex + 1).setValue(data.nombreEmpresa);
      return { success: true, message: 'RFC actualizado' };
    }
  }

  return { success: false, error: 'Usuario no encontrado' };
}

function updateUser(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Usuarios');

  if (!sheet) return { success: false, error: 'Hoja Usuarios no existe' };

  ensurePasswordColumn(sheet);

  const sheetData = sheet.getDataRange().getValues();
  const headers = sheetData[0];
  const emailIndex = headers.indexOf('Email');
  const userIdIndex = headers.indexOf('UserID');
  const googleIdIndex = headers.indexOf('GoogleID');
  const driveFolderIdIndex = headers.indexOf('DriveFolderID');
  const driveFolderUrlIndex = headers.indexOf('DriveFolderUrl');
  const nombreIndex = headers.indexOf('Nombre');
  const passwordIndex = headers.indexOf('Password');

  for (let i = 1; i < sheetData.length; i++) {
    if (sheetData[i][emailIndex] === data.email) {
      if (data.googleId && googleIdIndex >= 0) {
        sheet.getRange(i + 1, googleIdIndex + 1).setValue(data.googleId);
      }
      if (data.driveFolderId && driveFolderIdIndex >= 0) {
        sheet.getRange(i + 1, driveFolderIdIndex + 1).setValue(data.driveFolderId);
      }
      if (data.driveFolderUrl && driveFolderUrlIndex >= 0) {
        sheet.getRange(i + 1, driveFolderUrlIndex + 1).setValue(data.driveFolderUrl);
      }
      if (data.nombre && nombreIndex >= 0) {
        sheet.getRange(i + 1, nombreIndex + 1).setValue(data.nombre);
      }
      if (data.password && passwordIndex >= 0) {
        sheet.getRange(i + 1, passwordIndex + 1).setValue(data.password);
      }
      return { success: true, message: 'Usuario actualizado', existing: true };
    }
  }

  return { success: false, error: 'Usuario no encontrado' };
}

// ============================================
// FUNCIONES DE FACTURAS
// ============================================

function saveInvoice(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Facturas');

  if (!sheet) {
    sheet = ss.insertSheet('Facturas');
    sheet.getRange(1, 1, 1, 20).setValues([[
      'ID', 'UserID', 'Fecha', 'Serie', 'Folio', 'UUID',
      'RFC_Emisor', 'Nombre_Emisor', 'RFC_Receptor', 'Nombre_Receptor',
      'UsoCFDI', 'MetodoPago', 'FormaPago', 'RegimenFiscal',
      'Subtotal', 'IVA', 'Total', 'Status', 'PDF_Url', 'XML_Url'
    ]]);
    sheet.getRange(1, 1, 1, 20).setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
  }

  const invoiceId = data.id || `INV-${Date.now()}`;
  const row = [
    invoiceId,
    data.userId || '',
    data.fecha || new Date().toISOString(),
    data.serie || 'A',
    data.folio || '',
    data.uuid || '',
    data.emisor?.rfc || '',
    data.emisor?.nombre || '',
    data.receptor?.rfc || '',
    data.receptor?.nombre || '',
    data.usoCFDI || 'G01',
    data.metodoPago || 'PUE',
    data.formaPago || '03',
    data.regimenFiscal || '',
    data.subtotal || 0,
    data.iva || 0,
    data.total || 0,
    data.status || 'pending',
    data.pdfUrl || '',
    data.xmlUrl || ''
  ];

  sheet.appendRow(row);
  
  // Guardar items si existen
  let itemsResult = null;
  if (data.items && data.items.length > 0) {
    itemsResult = saveInvoiceItems(data.items, invoiceId, data.userId || '');
  }
  
  return { 
    id: invoiceId, 
    message: 'Factura guardada exitosamente',
    items: itemsResult
  };
}

// ============================================
// OBTENER FACTURAS POR USERID
// ============================================

function getInvoices(userId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Facturas');

  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const userIdIndex = headers.indexOf('UserID');

  if (userIdIndex === -1) return [];

  const invoices = [];
  for (let i = 1; i < data.length; i++) {
    // FILTRAR: Solo facturas del usuario específico
    if (data[i][userIdIndex] === userId) {
      const obj = {};
      headers.forEach((h, idx) => obj[h] = data[i][idx]);
      invoices.push(obj);
    }
  }

  return invoices;
}

function getInvoice(invoiceId, userId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Facturas');

  if (!sheet) return null;

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const invoiceIdIndex = headers.indexOf('ID');
  const userIdIndex = headers.indexOf('UserID');

  for (let i = 1; i < data.length; i++) {
    // VALIDAR: Que la factura pertenezca al usuario
    if (data[i][invoiceIdIndex] === invoiceId && data[i][userIdIndex] === userId) {
      const invoice = {};
      headers.forEach((h, idx) => invoice[h] = data[i][idx]);
      return invoice;
    }
  }

  return null;
}

// ============================================
// FUNCIONES PARA ITEMS DE FACTURA
// ============================================

function saveInvoiceItems(items, invoiceId, userId) {
  if (!items || items.length === 0) {
    return { success: true, message: 'No hay items para guardar' };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Items_Factura');

  if (!sheet) {
    sheet = ss.insertSheet('Items_Factura');
    sheet.getRange(1, 1, 1, 14).setValues([[
      'ID', 'FacturaID', 'UserID', 'ClaveProdServ', 'ClaveUnidad',
      'Cantidad', 'Descripcion', 'ValorUnitario', 'Importe',
      'ObjetoImp', 'BaseImpuesto', 'TasaImpuesto', 'ImporteImpuesto',
      'FechaAlta'
    ]]);
    sheet.getRange(1, 1, 1, 14).setFontWeight('bold').setBackground('#00bcd4').setFontColor('#ffffff');
  }

  const savedItems = [];
  const now = new Date().toISOString();

  items.forEach(function(item) {
    const itemId = `ITEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const importe = (item.cantidad || 1) * (item.valorUnitario || 0);
    const baseImpuesto = item.baseImpuesto || importe;
    const tasaImpuesto = item.tasaImpuesto || 0.16;
    const importeImpuesto = baseImpuesto * tasaImpuesto;

    const row = [
      itemId,
      invoiceId,
      userId,
      item.claveProdServ || '80101500',
      item.claveUnidad || 'E48',
      item.cantidad || 1,
      item.descripcion || '',
      item.valorUnitario || 0,
      importe,
      item.objetoImp || '02',
      baseImpuesto,
      tasaImpuesto,
      importeImpuesto,
      now
    ];

    sheet.appendRow(row);
    savedItems.push({ id: itemId, ...item });
  });

  return {
    success: true,
    message: `${savedItems.length} items guardados exitosamente`,
    items: savedItems
  };
}

function getInvoiceItems(invoiceId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Items_Factura');

  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const invoiceIdIndex = headers.indexOf('FacturaID');

  if (invoiceIdIndex === -1) return [];

  const items = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][invoiceIdIndex] === invoiceId) {
      const obj = {};
      headers.forEach((h, idx) => obj[h] = data[i][idx]);
      items.push(obj);
    }
  }

  return items;
}

// ============================================
// FUNCIONES PARA ITEMS DE TICKET (OCR)
// ============================================

function saveTicketItems(items, ticketId, userId, ocrData) {
  if (!items || items.length === 0) {
    // Si no hay items, guardar al menos el total como un item
    if (ocrData && ocrData.total) {
      items = [{
        producto: ocrData.nombreEmisor || 'Producto/Servicio',
        cantidad: 1,
        precioUnitario: ocrData.total,
        importe: ocrData.total,
        categoria: ocrData.documentType || 'general'
      }];
    }
  }

  if (!items || items.length === 0) {
    return { success: true, message: 'No hay items para guardar' };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Items_Ticket');

  if (!sheet) {
    sheet = ss.insertSheet('Items_Ticket');
    sheet.getRange(1, 1, 1, 11).setValues([[
      'ID', 'TicketID', 'UserID', 'Producto', 'Cantidad',
      'PrecioUnitario', 'Importe', 'Categoria', 'Marca',
      'Presentacion', 'FechaAlta'
    ]]);
    sheet.getRange(1, 1, 1, 11).setFontWeight('bold').setBackground('#ff9800').setFontColor('#ffffff');
  }

  const savedItems = [];
  const now = new Date().toISOString();

  items.forEach(function(item) {
    const itemId = `TITEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const row = [
      itemId,
      ticketId,
      userId,
      item.producto || item.descripcion || 'Producto sin nombre',
      item.cantidad || 1,
      item.precioUnitario || item.valorUnitario || 0,
      item.importe || (item.cantidad || 1) * (item.precioUnitario || 0),
      item.categoria || ocrData?.documentType || 'general',
      item.marca || '',
      item.presentacion || '',
      now
    ];

    sheet.appendRow(row);
    savedItems.push({ id: itemId, ...item });
  });

  return {
    success: true,
    message: `${savedItems.length} items de ticket guardados exitosamente`,
    items: savedItems
  };
}

function getTicketItems(ticketId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Items_Ticket');

  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const ticketIdIndex = headers.indexOf('TicketID');

  if (ticketIdIndex === -1) return [];

  const items = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][ticketIdIndex] === ticketId) {
      const obj = {};
      headers.forEach((h, idx) => obj[h] = data[i][idx]);
      items.push(obj);
    }
  }

  return items;
}

// ============================================
// FUNCIONES DE CLIENTES Y PRODUCTOS
// ============================================

function saveClient(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Clientes');

  if (!sheet) {
    sheet = ss.insertSheet('Clientes');
    const headers = ['ID', 'UserID', 'RFC', 'Nombre', 'Email', 'Telefono', 'Calle', 'NumeroExt', 'NumeroInt', 'Colonia', 'Municipio', 'Estado', 'Pais', 'CP', 'RegimenFiscal', 'FechaAlta'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#34a853').setFontColor('#ffffff');
  }

  const clientId = data.id || `CLI-${Date.now()}`;
  const fechaAlta = data.fechaAlta || new Date().toISOString();
  const row = [
    clientId,
    data.userId || '',
    data.rfc || '',
    data.nombre || '',
    data.email || '',
    data.telefono || '',
    data.calle || '',
    data.numeroExt || '',
    data.numeroInt || '',
    data.colonia || '',
    data.municipio || '',
    data.estado || '',
    data.pais || 'México',
    data.cp || '',
    data.regimenFiscal || '',
    fechaAlta
  ];

  sheet.appendRow(row);
  return { id: clientId, message: 'Cliente guardado exitosamente' };
}

function getClients(userId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Clientes');

  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const userIdIndex = headers.indexOf('UserID');

  if (userIdIndex === -1) return [];

  const clients = [];
  for (let i = 1; i < data.length; i++) {
    // Si no se proporciona userId, devolver todos los clientes
    if (!userId || userId === '' || data[i][userIdIndex] === userId) {
      const obj = {};
      headers.forEach((h, idx) => obj[h] = data[i][idx]);
      clients.push(obj);
    }
  }

  return clients;
}

function saveProduct(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Productos');

  if (!sheet) {
    sheet = ss.insertSheet('Productos');
    sheet.getRange(1, 1, 1, 10).setValues([[
      'ID', 'UserID', 'ClaveProdServ', 'ClaveUnidad', 'Nombre', 'Descripcion',
      'PrecioUnitario', 'Impuesto', 'TasaImpuesto', 'FechaAlta'
    ]]);
    sheet.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#fbbc05').setFontColor('#000000');
  }

  const productId = data.id || `PROD-${Date.now()}`;
  const row = [
    productId,
    data.userId || '',
    data.clave || '',
    data.claveUnidad || 'H87',
    data.nombre || '',
    data.descripcion || '',
    data.precio || 0,
    data.impuesto || 'IVA',
    data.tasaImpuesto || 0.16,
    new Date().toISOString()
  ];

  sheet.appendRow(row);
  return { id: productId, message: 'Producto guardado exitosamente' };
}

function getProducts(userId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Productos');

  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const userIdIndex = headers.indexOf('UserID');

  if (userIdIndex === -1) return [];

  const products = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][userIdIndex] === userId) {
      const obj = {};
      headers.forEach((h, idx) => obj[h] = data[i][idx]);
      products.push(obj);
    }
  }

  return products;
}

// ============================================
// FUNCIONES DE EMPRESA
// ============================================

function saveCompanyData(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Empresa');

  if (!sheet) {
    sheet = ss.insertSheet('Empresa');
    sheet.getRange(1, 1, 1, 14).setValues([[
      'UserID', 'Nombre', 'RFC', 'Calle', 'NumeroExt', 'NumeroInt',
      'Colonia', 'Municipio', 'Estado', 'Pais', 'CP',
      'Email', 'Telefono', 'RegimenFiscal'
    ]]);
    sheet.getRange(1, 1, 1, 14).setFontWeight('bold').setBackground('#ea4335').setFontColor('#ffffff');
  }

  const headers = ['UserID', 'Nombre', 'RFC', 'Calle', 'NumeroExt', 'NumeroInt',
    'Colonia', 'Municipio', 'Estado', 'Pais', 'CP',
    'Email', 'Telefono', 'RegimenFiscal'];

  const sheetData = sheet.getDataRange().getValues();
  const userIdIndex = headers.indexOf('UserID');
  const rfcIndex = headers.indexOf('RFC');
  const emailIndex = headers.indexOf('Email');

  // Buscar si ya existe por UserID
  let rowIndex = -1;
  for (let i = 1; i < sheetData.length; i++) {
    if (sheetData[i][userIdIndex] === data.userId) {
      rowIndex = i + 1;
      break;
    }
  }

  // VALIDACIÓN: No duplicar por RFC (si se proporciona)
  if (data.rfc && data.rfc.trim() !== '') {
    for (let i = 1; i < sheetData.length; i++) {
      if (sheetData[i][rfcIndex] === data.rfc.trim()) {
        // Si encontramos el mismo RFC pero es diferente userId, es duplicado
        if (sheetData[i][userIdIndex] !== data.userId) {
          throw new Error(`El RFC "${data.rfc}" ya está registrado con otro usuario. No se permiten duplicados.`);
        }
      }
    }
  }

  // VALIDACIÓN: No duplicar por Email (si se proporciona)
  if (data.email && data.email.trim() !== '') {
    for (let i = 1; i < sheetData.length; i++) {
      if (sheetData[i][emailIndex] === data.email.trim()) {
        // Si encontramos el mismo email pero es diferente userId, es duplicado
        if (sheetData[i][userIdIndex] !== data.userId) {
          throw new Error(`El email "${data.email}" ya está registrado con otro usuario. No se permiten duplicados.`);
        }
      }
    }
  }

  const values = [
    data.userId || '',
    data.nombre || '',
    data.rfc || '',
    data.calle || '',
    data.numeroExt || '',
    data.numeroInt || '',
    data.colonia || '',
    data.municipio || '',
    data.estado || '',
    data.pais || 'México',
    data.cp || '',
    data.email || '',
    data.telefono || '',
    data.regimenFiscal || ''
  ];

  if (rowIndex > 0) {
    // Actualizar fila existente
    sheet.getRange(rowIndex, 1, 1, values.length).setValues([values]);
  } else {
    // Crear nueva fila
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    sheet.appendRow(values);
  }

  return { 
    message: 'Datos de empresa guardados exitosamente',
    action: rowIndex > 0 ? 'updated' : 'created'
  };
}

function getCompanyData(userId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Empresa');

  if (!sheet) return null;

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const userIdIndex = headers.indexOf('UserID');

  if (userIdIndex === -1) return null;

  // Si se proporciona userId, buscar por ese
  if (userId && userId !== '') {
    for (let i = 1; i < data.length; i++) {
      if (data[i][userIdIndex] === userId) {
        const company = {};
        headers.forEach((h, idx) => company[h] = data[i][idx]);
        return company;
      }
    }
  }

  // Si no hay userId o no se encontró, devolver el primer registro
  if (data.length > 1) {
    const company = {};
    headers.forEach((h, idx) => company[h] = data[1][idx]);
    return company;
  }

  return null;
}

// ============================================
// FUNCIONES DE ARCHIVOS (PDF, XML, OCR)
// ============================================

function savePdfToDrive(data) {
  const userFolderId = data.userFolderId || DRIVE_FOLDER_ID;
  const folder = DriveApp.getFolderById(userFolderId);
  const fileName = `Factura_${data.serie || 'A'}_${data.folio || Date.now()}.pdf`;

  const blob = Utilities.newBlob(
    Utilities.base64Decode(data.pdfBase64),
    'application/pdf',
    fileName
  );

  const file = folder.createFile(blob);

  return {
    id: file.getId(),
    name: file.getName(),
    url: file.getUrl(),
    message: 'PDF guardado en Google Drive exitosamente'
  };
}

function saveXmlToDrive(data) {
  const userFolderId = data.userFolderId || DRIVE_FOLDER_ID;
  let folder = DriveApp.getFolderById(userFolderId);

  const xmlSubfolderName = 'XML';
  const existingSubfolders = folder.getFoldersByName(xmlSubfolderName);
  if (existingSubfolders.hasNext()) {
    folder = existingSubfolders.next();
  } else {
    folder = folder.createFolder(xmlSubfolderName);
  }

  const fileName = `Factura_${data.serie || 'F'}_${data.folio || 'sin-folio'}_${data.uuid || Date.now()}.xml`;

  const xmlContent = Utilities.newBlob(
    Utilities.base64Decode(data.xmlBase64),
    'application/xml',
    fileName
  );

  const file = folder.createFile(xmlContent);

  return {
    id: file.getId(),
    name: file.getName(),
    url: file.getUrl(),
    message: 'XML guardado en Google Drive exitosamente'
  };
}

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

function getUserFolder(userId) {
  const parentFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const folders = parentFolder.getFolders();

  while (folders.hasNext()) {
    const folder = folders.next();
    if (folder.getName().includes(userId)) {
      return folder;
    }
  }

  return null;
}

function consultaRFC(rfc) {
  const rfcLimpio = rfc.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (!rfcLimpio || rfcLimpio.length < 12) {
    return { error: 'RFC incompleto' };
  }

  const datosMock = {
    'XAXX010101000': {
      rfc: 'XAXX010101000',
      nombre: 'PUBLICO EN GENERAL',
      estado: 'Ciudad de México',
      municipio: 'Cuauhtémoc',
      cp: '06010',
      colonia: 'Centro',
      calle: '',
      regimenFiscal: 'Sin obligaciones fiscales',
      situacion: 'Activo'
    },
    'XEXX010101000': {
      rfc: 'XEXX010101000',
      nombre: 'EXTRANJERO',
      estado: '',
      municipio: '',
      cp: '',
      colonia: '',
      calle: '',
      regimenFiscal: 'General de Ley Personas Morales',
      situacion: 'Activo'
    }
  };

  if (datosMock[rfcLimpio]) {
    return datosMock[rfcLimpio];
  }

  const rfcMatch = rfcLimpio.match(/^([A-Z&Ñ]{3,4})([0-9]{6})([A-Z0-9]{3})$/);
  if (rfcMatch) {
    const esPersonaFisica = rfcLimpio.length === 13;
    return {
      rfc: rfcLimpio,
      nombre: esPersonaFisica ? 'CONTRIBUYENTE PERSONA FÍSICA' : 'CONTRIBUYENTE PERSONA MORAL',
      estado: 'México',
      municipio: '',
      cp: '',
      colonia: '',
      calle: '',
      regimenFiscal: esPersonaFisica ? '612 - Personas Físicas con Actividad Empresarial' : '601 - General de Ley Personas Morales',
      situacion: 'Activo'
    };
  }

  return { error: 'RFC no encontrado', rfc: rfcLimpio };
}

// ============================================
// ENVÍO DE EMAILS
// ============================================

function sendWelcomeEmail(data) {
  try {
    const { email, nombre, tipo } = data;

    if (!email) {
      throw new Error('Email es requerido');
    }

    const nombreDisplay = nombre || 'Usuario';
    const fecha = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let subject, htmlBody;

    if (tipo === 'bienvenida') {
      subject = '¡Bienvenido a My Conta AI Facturador! 🎉';
      htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 40px 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏢 My Conta AI</h1>
              <p>Sistema de Facturación Inteligente</p>
            </div>
            <div class="content">
              <h2>¡Hola, ${nombreDisplay}! 👋</h2>
              <p>Bienvenido a <strong>My Conta AI Facturador</strong>.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      subject = 'Notificación - My Conta AI';
      htmlBody = `<p>Hola ${nombreDisplay}, tienes un nuevo mensaje de My Conta AI.</p>`;
    }

    GmailApp.sendEmail(email, subject, '', {
      htmlBody: htmlBody,
      name: 'My Conta AI Facturador',
      noReply: true
    });

    return { success: true, message: 'Email enviado exitosamente' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function sendInvoiceEmail(data) {
  try {
    const { email, nombre, folio, serie, total, fecha, receptor } = data;

    if (!email) {
      throw new Error('Email es requerido');
    }

    const subject = `Factura ${folio || ''} - My Conta AI`;
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: #10b981; padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .invoice-box { background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0; }
          .invoice-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .total-row { background: #667eea; color: white; border-radius: 8px; padding: 15px 20px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Factura Timbrada Exitosamente</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${nombre || 'Usuario'}</strong>,</p>
            <p>Tu factura ha sido timbrada correctamente.</p>
            <div class="invoice-box">
              <div class="invoice-row">
                <span class="invoice-label">Folio:</span>
                <span class="invoice-value">${folio || 'N/A'}</span>
              </div>
              <div class="invoice-row">
                <span class="invoice-label">Serie:</span>
                <span class="invoice-value">${serie || 'A'}</span>
              </div>
              <div class="total-row">
                <span>Total: </span>
                <span style="font-size: 20px; font-weight: bold;">$${total ? total.toLocaleString('es-MX') : '0.00'}</span>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    GmailApp.sendEmail(email, subject, '', {
      htmlBody: htmlBody,
      name: 'My Conta AI Facturador',
      noReply: true
    });

    return { success: true, message: 'Email de factura enviado exitosamente' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function testGmail() {
  try {
    const email = Session.getActiveUser().getEmail();
    return { success: true, email: email };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function testApi() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    spreadsheetId: SPREADSHEET_ID,
    driveFolderId: DRIVE_FOLDER_ID
  };
}
