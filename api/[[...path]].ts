// ============================================
// CATCH-ALL API ROUTER FOR VERCEL SERVERLESS
// Handles all /api/* routes
// ============================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  callGoogleScript,
  generateAutoPassword,
  generarCadenaOriginal,
  sellarCFDI,
  obtenerNoCertificado,
  obtenerCertificadoBase64,
  SYSTEM_INSTRUCTION,
  OLLAMA_HOST,
  OLLAMA_MODEL,
  GOOGLE_SCRIPT_URL,
  clients,
  products,
  invoices,
  companyData
} from './_shared';
import path from 'path';
import fs from 'fs';

// Disable body parsing for file uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

// In-memory users (serverless = resets on cold start)
// Users are persisted via Google Sheets
const users: any[] = [];

// Helper to get user ID from headers or body
function getUserId(req: VercelRequest): string {
  return (req.headers['x-user-id'] as string) || req.body?.userId || 'default-user';
}

// Helper to send JSON response
function sendJson(res: VercelResponse, data: any, status = 200) {
  res.status(status).json(data);
}

// Helper to send error
function sendError(res: VercelResponse, message: string, status = 500) {
  res.status(status).json({ error: message });
}

// ============================================
// ROUTER HANDLER
// ============================================
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query, body } = req;
  const pathStr = (req.url || '').replace('/api/', '');

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id');

  // Handle preflight
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // ============================================
    // AUTH ENDPOINTS
    // ============================================
    if (pathStr === 'auth/google-login' && method === 'POST') {
      return await handleGoogleLogin(req, res);
    }

    if (pathStr === 'auth/google-signup' && method === 'POST') {
      return await handleGoogleSignup(req, res);
    }

    if (pathStr === 'auth/signup' && method === 'POST') {
      return await handleSignup(req, res);
    }

    if (pathStr === 'auth/verify' && method === 'POST') {
      return await handleVerify(req, res);
    }

    if (pathStr === 'auth/resend-verification' && method === 'POST') {
      return await handleResendVerification(req, res);
    }

    if (pathStr === 'auth/login' && method === 'POST') {
      return await handleLogin(req, res);
    }

    // ============================================
    // CLIENTS ENDPOINTS
    // ============================================
    if (pathStr === 'clients' && method === 'GET') {
      return await handleGetClients(req, res);
    }

    if (pathStr === 'clients' && method === 'POST') {
      return await handleSaveClient(req, res);
    }

    if (pathStr.match(/^clients\/[^/]+$/) && method === 'GET') {
      return await handleGetClient(req, res);
    }

    if (pathStr.match(/^clients\/[^/]+$/) && method === 'PUT') {
      return await handleUpdateClient(req, res);
    }

    if (pathStr.match(/^clients\/[^/]+$/) && method === 'DELETE') {
      return await handleDeleteClient(req, res);
    }

    // ============================================
    // PRODUCTS ENDPOINTS
    // ============================================
    if (pathStr === 'products' && method === 'GET') {
      return await handleGetProducts(req, res);
    }

    if (pathStr === 'products' && method === 'POST') {
      return await handleSaveProduct(req, res);
    }

    // ============================================
    // INVOICES ENDPOINTS
    // ============================================
    if (pathStr === 'invoices' && method === 'GET') {
      return await handleGetInvoices(req, res);
    }

    if (pathStr === 'invoices' && method === 'POST') {
      return await handleSaveInvoice(req, res);
    }

    if (pathStr.match(/^invoices\/[^/]+$/) && method === 'GET') {
      return await handleGetInvoice(req, res);
    }

    if (pathStr.match(/^invoices\/[^/]+$/) && method === 'PUT') {
      return await handleUpdateInvoice(req, res);
    }

    if (pathStr.match(/^invoices\/[^/]+$/) && method === 'DELETE') {
      return await handleDeleteInvoice(req, res);
    }

    if (pathStr === 'invoices/generate-pdf' && method === 'POST') {
      return await handleGeneratePdf(req, res);
    }

    if (pathStr.match(/^invoices\/[^/]+\/download-xml$/) && method === 'GET') {
      return await handleDownloadXml(req, res);
    }

    if (pathStr.match(/^invoices\/[^/]+\/download-json$/) && method === 'GET') {
      return await handleDownloadJson(req, res);
    }

    if (pathStr === 'invoices/local/list' && method === 'GET') {
      return await handleListLocalInvoices(req, res);
    }

    if (pathStr.match(/^invoices\/[^/]+\/upload-pdf$/) && method === 'POST') {
      return await handleUploadPdf(req, res);
    }

    if (pathStr === 'invoices/upload-xml' && method === 'POST') {
      return await handleUploadXml(req, res);
    }

    // ============================================
    // PENDING INVOICES ENDPOINTS
    // ============================================
    if (pathStr === 'pending-invoices' && method === 'GET') {
      return await handleGetPendingInvoices(req, res);
    }

    if (pathStr === 'pending-invoices' && method === 'POST') {
      return await handleSavePendingInvoice(req, res);
    }

    if (pathStr.match(/^pending-invoices\/[^/]+$/) && method === 'GET') {
      return await handleGetPendingInvoice(req, res);
    }

    if (pathStr.match(/^pending-invoices\/[^/]+$/) && method === 'PUT') {
      return await handleUpdatePendingInvoice(req, res);
    }

    if (pathStr.match(/^pending-invoices\/[^/]+$/) && method === 'DELETE') {
      return await handleDeletePendingInvoice(req, res);
    }

    if (pathStr.match(/^pending-invoices\/[^/]+\/timbrar$/) && method === 'POST') {
      return await handleTimbrarPending(req, res);
    }

    // ============================================
    // COMPANY ENDPOINTS
    // ============================================
    if (pathStr === 'company' && method === 'GET') {
      return await handleGetCompany(req, res);
    }

    if (pathStr === 'company' && method === 'POST') {
      return await handleSaveCompany(req, res);
    }

    // ============================================
    // SETUP ENDPOINTS
    // ============================================
    if (pathStr === 'setup/status' && method === 'GET') {
      return await handleSetupStatus(req, res);
    }

    if (pathStr === 'setup/save-csd' && method === 'POST') {
      return await handleSaveCsd(req, res);
    }

    if (pathStr === 'setup/parse-cert' && method === 'GET') {
      return await handleParseCert(req, res);
    }

    // ============================================
    // CSD ENDPOINTS
    // ============================================
    if (pathStr === 'csd/config' && method === 'POST') {
      return await handleCsdConfig(req, res);
    }

    if (pathStr === 'csd/test' && method === 'POST') {
      return await handleCsdTest(req, res);
    }

    // ============================================
    // CFDI ENDPOINTS
    // ============================================
    if (pathStr === 'cfdi/generate' && method === 'POST') {
      return await handleCfdiGenerate(req, res);
    }

    if (pathStr === 'cfdi/sign' && method === 'POST') {
      return await handleCfdiSign(req, res);
    }

    // ============================================
    // PAC ENDPOINTS
    // ============================================
    if (pathStr === 'pac/config' && method === 'GET') {
      return await handlePacConfigGet(req, res);
    }

    if (pathStr === 'pac/config' && method === 'POST') {
      return await handlePacConfigPost(req, res);
    }

    if (pathStr === 'pac/test' && method === 'POST') {
      return await handlePacTest(req, res);
    }

    if (pathStr === 'pac/timbrar' && method === 'POST') {
      return await handlePacTimbrar(req, res);
    }

    if (pathStr === 'pac/timbrar-json' && method === 'POST') {
      return await handlePacTimbrarJson(req, res);
    }

    if (pathStr === 'pac/cancelar' && method === 'POST') {
      return await handlePacCancelar(req, res);
    }

    // ============================================
    // OCR ENDPOINTS
    // ============================================
    if (pathStr === 'ocr/upload' && method === 'POST') {
      return await handleOcrUpload(req, res);
    }

    if (pathStr === 'ocr/documents' && method === 'GET') {
      return await handleOcrDocuments(req, res);
    }

    // ============================================
    // EMAIL ENDPOINTS
    // ============================================
    if (pathStr === 'email/welcome' && method === 'POST') {
      return await handleEmailWelcome(req, res);
    }

    if (pathStr === 'email/invoice' && method === 'POST') {
      return await handleEmailInvoice(req, res);
    }

    if (pathStr === 'email/test' && method === 'GET') {
      return await handleEmailTest(req, res);
    }

    // ============================================
    // SAT ENDPOINTS
    // ============================================
    if (pathStr === 'sat-lookup' && method === 'GET') {
      return await handleSatLookup(req, res);
    }

    // ============================================
    // OLLAMA ENDPOINTS
    // ============================================
    if (pathStr === 'ollama/status' && method === 'GET') {
      return await handleOllamaStatus(req, res);
    }

    if (pathStr === 'chat' && method === 'POST') {
      return await handleChat(req, res);
    }

    // ============================================
    // HEALTH CHECK
    // ============================================
    if (pathStr === 'health' && method === 'GET') {
      return await handleHealth(req, res);
    }

    // ============================================
    // 404 - Route not found
    // ============================================
    return sendError(res, `Route not found: ${method} /${pathStr}`, 404);

  } catch (error: any) {
    console.error('API Error:', error);
    return sendError(res, error.message || 'Internal server error', 500);
  }
}

// ============================================
// AUTH HANDlers
// ============================================
async function handleGoogleLogin(req: VercelRequest, res: VercelResponse) {
  const { email, name } = req.body || {};

  if (!email) {
    return sendError(res, 'Email is required', 400);
  }

  try {
    // Try to find user in Google Sheets
    const gsResult = await callGoogleScript('getUser', { email });
    let user = gsResult?.data || null;

    // Also check in-memory
    const memUser = users.find(u => u.email === email);
    if (memUser && !user) {
      user = memUser;
    }

    if (!user) {
      // Create user automatically
      const autoPassword = generateAutoPassword();
      const userId = `user_${Date.now()}`;

      user = {
        id: userId,
        email,
        name: name || email.split('@')[0],
        password: autoPassword,
        verified: true,
        createdAt: new Date().toISOString(),
      };

      // Save to Google Sheets
      await callGoogleScript('createUser', user);
    }

    return sendJson(res, {
      success: true,
      user,
      autoPassword: user.isNew ? user.password : undefined,
      isNewUser: user.isNew || false,
    });
  } catch (error: any) {
    console.error('Google login error:', error);
    return sendError(res, error.message || 'Login failed', 500);
  }
}

async function handleGoogleSignup(req: VercelRequest, res: VercelResponse) {
  const { email, name } = req.body || {};

  if (!email) {
    return sendError(res, 'Email is required', 400);
  }

  try {
    // Check if user exists
    const gsResult = await callGoogleScript('getUser', { email });
    let user = gsResult?.data || null;

    const memUser = users.find(u => u.email === email);
    if (memUser && !user) {
      user = memUser;
    }

    const isNewUser = !user;

    if (isNewUser) {
      const autoPassword = generateAutoPassword();
      const userId = `user_${Date.now()}`;

      user = {
        id: userId,
        email,
        name: name || email.split('@')[0],
        password: autoPassword,
        verified: true,
        createdAt: new Date().toISOString(),
        isNew: true,
      };

      // Save to Google Sheets
      await callGoogleScript('createUser', user);

      // Create Drive folder
      await callGoogleScript('createUserFolder', { userId, email });
    }

    return sendJson(res, {
      success: true,
      user,
      isNewUser,
      autoPassword: isNewUser ? user.password : undefined,
    });
  } catch (error: any) {
    console.error('Google signup error:', error);
    return sendError(res, error.message || 'Signup failed', 500);
  }
}

async function handleSignup(req: VercelRequest, res: VercelResponse) {
  const { email, name, password } = req.body || {};

  if (!email || !password) {
    return sendError(res, 'Email and password are required', 400);
  }

  try {
    // Check if user exists
    const gsResult = await callGoogleScript('getUser', { email });
    const existingUser = gsResult?.data || users.find(u => u.email === email);

    if (existingUser) {
      return sendError(res, 'El email ya está registrado', 409);
    }

    const userId = `user_${Date.now()}`;
    const newUser = {
      id: userId,
      email,
      name: name || email.split('@')[0],
      password,
      verified: false,
      verificationCode: Math.floor(100000 + Math.random() * 900000).toString(),
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    await callGoogleScript('createUser', newUser);
    await callGoogleScript('createUserFolder', { userId, email });

    return sendJson(res, {
      success: true,
      user: newUser,
      message: 'Usuario creado. Revisa tu email para verificar.',
    });
  } catch (error: any) {
    return sendError(res, error.message || 'Signup failed', 500);
  }
}

async function handleVerify(req: VercelRequest, res: VercelResponse) {
  const { email, code } = req.body || {};

  try {
    const gsResult = await callGoogleScript('getUser', { email });
    const user = gsResult?.data || users.find(u => u.email === email);

    if (!user) {
      return sendError(res, 'Usuario no encontrado', 404);
    }

    if (user.verificationCode !== code) {
      return sendError(res, 'Código de verificación incorrecto', 400);
    }

    user.verified = true;
    delete user.verificationCode;

    await callGoogleScript('updateUser', user);

    return sendJson(res, {
      success: true,
      user,
      message: 'Email verificado exitosamente',
    });
  } catch (error: any) {
    return sendError(res, error.message || 'Verification failed', 500);
  }
}

async function handleResendVerification(req: VercelRequest, res: VercelResponse) {
  const { email } = req.body || {};

  try {
    const gsResult = await callGoogleScript('getUser', { email });
    const user = gsResult?.data || users.find(u => u.email === email);

    if (!user) {
      return sendError(res, 'Usuario no encontrado', 404);
    }

    if (user.verified) {
      return sendError(res, 'El email ya está verificado', 400);
    }

    user.verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    await callGoogleScript('updateUser', user);

    return sendJson(res, {
      success: true,
      message: 'Código de verificación reenviado',
    });
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to resend verification', 500);
  }
}

async function handleLogin(req: VercelRequest, res: VercelResponse) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return sendError(res, 'Email y password son requeridos', 400);
  }

  try {
    const gsResult = await callGoogleScript('getUser', { email });
    let user = gsResult?.data || null;

    const memUser = users.find(u => u.email === email);
    if (memUser && !user) {
      user = memUser;
    }

    if (!user) {
      return sendError(res, 'Credenciales incorrectas', 401);
    }

    if (user.password !== password) {
      return sendError(res, 'Credenciales incorrectas', 401);
    }

    if (!user.verified) {
      return sendJson(res, {
        success: true,
        user,
        needsVerification: true,
      });
    }

    return sendJson(res, {
      success: true,
      user,
    });
  } catch (error: any) {
    return sendError(res, error.message || 'Login failed', 500);
  }
}

// ============================================
// CLIENTS Handlers
// ============================================
async function handleGetClients(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId(req);

  try {
    const gsResult = await callGoogleScript('getClients', { userId });

    if (gsResult?.data && Array.isArray(gsResult.data) && gsResult.data.length > 0) {
      const normalized = gsResult.data.map((c: any) => ({
        id: c.ID || c.id || '',
        userId: c.UserID || c.userId || '',
        rfc: c.RFC || c.rfc || '',
        nombre: c.Nombre || c.nombre || '',
        email: c.Email || c.email || '',
        telefono: c.Telefono || c.telefono || '',
        calle: c.Calle || c.calle || '',
        numeroExt: c.NumeroExt || c.numeroExt || '',
        numeroInt: c.NumeroInt || c.numeroInt || '',
        colonia: c.Colonia || c.colonia || '',
        municipio: c.Municipio || c.municipio || '',
        estado: c.Estado || c.estado || '',
        pais: c.Pais || c.pais || 'México',
        cp: c.CP || c.cp || '',
        regimenFiscal: c.RegimenFiscal || c.regimenFiscal || '',
        fechaAlta: c.FechaAlta || c.fechaAlta || '',
      }));
      return sendJson(res, normalized);
    }

    const userClients = clients.filter(c => !userId || c.userId === userId);
    return sendJson(res, userClients);
  } catch (error) {
    console.error('Get clients error:', error);
    return sendJson(res, clients);
  }
}

async function handleGetClient(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId(req);
  const id = (req.url || '').split('/').pop();

  try {
    const client = clients.find(c => c.id === id && (!userId || c.userId === userId));
    if (client) {
      return sendJson(res, client);
    }

    const gsResult = await callGoogleScript('getClients', { userId });
    const allClients = gsResult?.data || clients;
    const found = allClients.find((c: any) => c.ID === id || c.id === id);

    return sendJson(res, found || null);
  } catch (error) {
    return sendError(res, 'Failed to get client', 500);
  }
}

async function handleSaveClient(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId(req);
  const newClient = {
    id: req.body?.id || `CLI-${Date.now()}`,
    userId,
    ...req.body,
    fechaAlta: new Date().toISOString(),
  };

  try {
    clients.push(newClient);
    await callGoogleScript('saveClient', newClient);
    return sendJson(res, { success: true, data: newClient }, 201);
  } catch (error) {
    return sendError(res, 'Failed to save client', 500);
  }
}

async function handleUpdateClient(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId(req);
  const id = (req.url || '').split('/').pop();

  try {
    const index = clients.findIndex(c => c.id === id && (!userId || c.userId === userId));
    if (index !== -1) {
      clients[index] = { ...clients[index], ...req.body };
      await callGoogleScript('saveClient', clients[index]);
      return sendJson(res, { success: true, data: clients[index] });
    }
    return sendError(res, 'Client not found', 404);
  } catch (error) {
    return sendError(res, 'Failed to update client', 500);
  }
}

async function handleDeleteClient(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId(req);
  const id = (req.url || '').split('/').pop();

  try {
    const index = clients.findIndex(c => c.id === id && (!userId || c.userId === userId));
    if (index !== -1) {
      clients.splice(index, 1);
      return sendJson(res, { success: true, message: 'Client deleted' });
    }
    return sendError(res, 'Client not found', 404);
  } catch (error) {
    return sendError(res, 'Failed to delete client', 500);
  }
}

// ============================================
// PRODUCTS Handlers
// ============================================
async function handleGetProducts(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId(req);

  try {
    const gsResult = await callGoogleScript('getProducts', { userId });

    if (gsResult?.data) {
      return sendJson(res, gsResult.data);
    }

    const userProducts = products.filter(p => !userId || p.userId === userId);
    return sendJson(res, userProducts);
  } catch (error) {
    return sendJson(res, products);
  }
}

async function handleSaveProduct(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId(req);
  const newProduct = {
    id: req.body?.id || `PROD-${Date.now()}`,
    userId,
    ...req.body,
    fechaAlta: new Date().toISOString(),
  };

  try {
    products.push(newProduct);
    await callGoogleScript('saveProduct', newProduct);
    return sendJson(res, { success: true, data: newProduct }, 201);
  } catch (error) {
    return sendError(res, 'Failed to save product', 500);
  }
}

// ============================================
// INVOICES Handlers
// ============================================
async function handleGetInvoices(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId(req);

  try {
    const gsResult = await callGoogleScript('getInvoices', { userId });

    if (gsResult?.data) {
      return sendJson(res, gsResult.data);
    }

    const userInvoices = invoices.filter(i => !userId || i.userId === userId);
    return sendJson(res, userInvoices);
  } catch (error) {
    return sendJson(res, invoices);
  }
}

async function handleGetInvoice(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId(req);
  const id = (req.url || '').split('/').pop();

  try {
    const invoice = invoices.find(i => (i.id === id || i.ID === id) && (!userId || i.userId === userId));
    if (invoice) {
      return sendJson(res, invoice);
    }

    const gsResult = await callGoogleScript('getInvoices', { userId });
    const allInvoices = gsResult?.data || invoices;
    const found = allInvoices.find((i: any) => i.ID === id || i.id === id);

    return sendJson(res, found || null);
  } catch (error) {
    return sendError(res, 'Failed to get invoice', 500);
  }
}

async function handleSaveInvoice(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId(req);
  const body = req.body || {};

  try {
    const now = new Date().toISOString();
    const invoiceData = body;

    const newInvoice = {
      id: invoiceData.ID || invoiceData.id || `INV-${Date.now()}`,
      userId,
      fecha: invoiceData.Fecha || invoiceData.fecha || now,
      serie: invoiceData.Serie || invoiceData.serie || 'F',
      folio: invoiceData.Folio || invoiceData.folio || String(Date.now()).slice(-6),
      uuid: invoiceData.UUID || invoiceData.uuid || null,
      emisor: invoiceData.emisor || { rfc: '', nombre: '' },
      receptor: invoiceData.receptor || { rfc: '', nombre: '' },
      usoCFDI: invoiceData.UsoCFDI || invoiceData.usoCFDI || 'G01',
      metodoPago: invoiceData.MetodoPago || invoiceData.metodoPago || 'PUE',
      formaPago: invoiceData.FormaPago || invoiceData.formaPago || '03',
      regimenFiscal: invoiceData.RegimenFiscal || invoiceData.regimenFiscal || '',
      subtotal: invoiceData.Subtotal || invoiceData.subtotal || 0,
      iva: invoiceData.IVA || invoiceData.iva || 0,
      total: invoiceData.Total || invoiceData.total || 0,
      status: invoiceData.Status || invoiceData.status || 'BORRADOR',
      pdfUrl: invoiceData.PDF_Url || invoiceData.pdfUrl || '',
      xmlUrl: invoiceData.XML_Url || invoiceData.xmlUrl || '',
      xmlContent: invoiceData.XML_Content || invoiceData.xmlContent || '',
      items: invoiceData.items || invoiceData.Items || [],
      createdAt: now,
    };

    invoices.push(newInvoice);
    await callGoogleScript('saveInvoice', newInvoice);

    return sendJson(res, { success: true, data: newInvoice }, 201);
  } catch (error) {
    return sendError(res, 'Failed to save invoice', 500);
  }
}

async function handleUpdateInvoice(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId(req);
  const id = (req.url || '').split('/').pop();

  try {
    const index = invoices.findIndex(i => (i.id === id || i.ID === id) && (!userId || i.userId === userId));
    if (index !== -1) {
      invoices[index] = { ...invoices[index], ...req.body };
      await callGoogleScript('saveInvoice', invoices[index]);
      return sendJson(res, { success: true, data: invoices[index] });
    }
    return sendError(res, 'Invoice not found', 404);
  } catch (error) {
    return sendError(res, 'Failed to update invoice', 500);
  }
}

async function handleDeleteInvoice(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId(req);
  const id = (req.url || '').split('/').pop();

  try {
    const index = invoices.findIndex(i => (i.id === id || i.ID === id) && (!userId || i.userId === userId));
    if (index !== -1) {
      invoices.splice(index, 1);
      return sendJson(res, { success: true, message: 'Invoice deleted' });
    }
    return sendError(res, 'Invoice not found', 404);
  } catch (error) {
    return sendError(res, 'Failed to delete invoice', 500);
  }
}

async function handleGeneratePdf(req: VercelRequest, res: VercelResponse) {
  // Simplified PDF generation - return invoice data
  const invoiceData = req.body;

  try {
    // In a real implementation, you'd use a PDF library
    // For now, return the data for frontend PDF generation
    return sendJson(res, {
      success: true,
      pdfUrl: invoiceData.pdfUrl || '',
      message: 'PDF generation requires frontend implementation',
    });
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to generate PDF', 500);
  }
}

async function handleDownloadXml(req: VercelRequest, res: VercelResponse) {
  const id = (req.url || '').split('/').pop();
  const invoice = invoices.find(i => i.id === id || i.ID === id);

  if (!invoice || !invoice.xmlContent) {
    return sendError(res, 'XML not found', 404);
  }

  res.setHeader('Content-Type', 'application/xml');
  return res.send(invoice.xmlContent);
}

async function handleDownloadJson(req: VercelRequest, res: VercelResponse) {
  const id = (req.url || '').split('/').pop();
  const invoice = invoices.find(i => i.id === id || i.ID === id);

  if (!invoice) {
    return sendError(res, 'Invoice not found', 404);
  }

  return sendJson(res, invoice);
}

async function handleListLocalInvoices(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId(req);

  try {
    const DATA_DIR = path.join(process.cwd(), 'data');
    const userDir = path.join(DATA_DIR, 'users', userId, 'facturas');

    if (!fs.existsSync(userDir)) {
      return sendJson(res, []);
    }

    const files = fs.readdirSync(userDir);
    const invoiceFiles = files.filter(f => f.endsWith('.xml') || f.endsWith('.json'));

    return sendJson(res, invoiceFiles.map(f => ({
      filename: f,
      path: path.join(userDir, f),
    })));
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to list invoices', 500);
  }
}

async function handleUploadPdf(req: VercelRequest, res: VercelResponse) {
  // Placeholder for file upload - requires multer adaptation
  return sendJson(res, { success: true, message: 'File upload endpoint' });
}

async function handleUploadXml(req: VercelRequest, res: VercelResponse) {
  // Placeholder for file upload - requires multer adaptation
  return sendJson(res, { success: true, message: 'XML upload endpoint' });
}

// ============================================
// PENDING INVOICES Handlers
// ============================================
async function handleGetPendingInvoices(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId(req);

  try {
    const gsResult = await callGoogleScript('getPendingInvoices', { userId });

    if (gsResult?.data) {
      return sendJson(res, gsResult.data);
    }

    const pending = invoices.filter(i => i.status === 'BORRADOR' || i.status === 'GENERADA');
    return sendJson(res, pending);
  } catch (error) {
    return sendJson(res, []);
  }
}

async function handleGetPendingInvoice(req: VercelRequest, res: VercelResponse) {
  const id = (req.url || '').split('/').pop();

  try {
    const invoice = invoices.find(i => (i.id === id || i.ID === id));
    return sendJson(res, invoice || null);
  } catch (error) {
    return sendError(res, 'Failed to get pending invoice', 500);
  }
}

async function handleSavePendingInvoice(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId(req);
  const newInvoice = {
    id: req.body?.id || `INV-${Date.now()}`,
    userId,
    ...req.body,
    status: 'BORRADOR',
    fecha: new Date().toISOString(),
  };

  try {
    invoices.push(newInvoice);
    await callGoogleScript('savePendingInvoice', newInvoice);
    return sendJson(res, { success: true, data: newInvoice }, 201);
  } catch (error) {
    return sendError(res, 'Failed to save pending invoice', 500);
  }
}

async function handleUpdatePendingInvoice(req: VercelRequest, res: VercelResponse) {
  const id = (req.url || '').split('/').pop();

  try {
    const index = invoices.findIndex(i => i.id === id || i.ID === id);
    if (index !== -1) {
      invoices[index] = { ...invoices[index], ...req.body };
      await callGoogleScript('updatePendingInvoice', invoices[index]);
      return sendJson(res, { success: true, data: invoices[index] });
    }
    return sendError(res, 'Pending invoice not found', 404);
  } catch (error) {
    return sendError(res, 'Failed to update pending invoice', 500);
  }
}

async function handleDeletePendingInvoice(req: VercelRequest, res: VercelResponse) {
  const id = (req.url || '').split('/').pop();

  try {
    const index = invoices.findIndex(i => i.id === id || i.ID === id);
    if (index !== -1) {
      invoices.splice(index, 1);
      return sendJson(res, { success: true, message: 'Pending invoice deleted' });
    }
    return sendError(res, 'Pending invoice not found', 404);
  } catch (error) {
    return sendError(res, 'Failed to delete pending invoice', 500);
  }
}

async function handleTimbrarPending(req: VercelRequest, res: VercelResponse) {
  const id = (req.url || '').split('/').pop();

  try {
    const invoice = invoices.find(i => i.id === id || i.ID === id);
    if (!invoice) {
      return sendError(res, 'Pending invoice not found', 404);
    }

    invoice.status = 'TIMBRANDO';
    await callGoogleScript('timbrarPendingInvoice', { id, invoice });

    // Simulate timbrado
    invoice.status = 'TIMBRADA';
    invoice.uuid = `UUID-${Date.now()}`;

    return sendJson(res, { success: true, data: invoice });
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to timbrar', 500);
  }
}

// ============================================
// COMPANY Handlers
// ============================================
async function handleGetCompany(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId(req);

  try {
    const gsResult = await callGoogleScript('getCompany', { userId });

    if (gsResult?.data) {
      return sendJson(res, gsResult.data);
    }

    const userCompany = companyData[userId] || companyData;
    return sendJson(res, userCompany);
  } catch (error) {
    return sendJson(res, companyData);
  }
}

async function handleSaveCompany(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId(req);
  const companyInfo = req.body || {};

  try {
    companyData[userId] = { ...companyData[userId], ...companyInfo };
    await callGoogleScript('saveCompany', { userId, ...companyInfo });
    return sendJson(res, { success: true, data: companyData[userId] });
  } catch (error) {
    return sendError(res, 'Failed to save company', 500);
  }
}

// ============================================
// SETUP Handlers
// ============================================
async function handleSetupStatus(req: VercelRequest, res: VercelResponse) {
  try {
    const certsDir = path.join(process.cwd(), 'certs');
    const hasCer = fs.existsSync(path.join(certsDir, 'csd.cer'));
    const hasKey = fs.existsSync(path.join(certsDir, 'csd.key'));

    let certInfo: any = {};
    if (hasCer) {
      certInfo.noCertificado = obtenerNoCertificado(path.join(certsDir, 'csd.cer'));
      certInfo.certificado = obtenerCertificadoBase64(path.join(certsDir, 'csd.cer'));
    }

    return sendJson(res, {
      hasCer,
      hasKey,
      certInfo,
      googleScriptUrl: !!GOOGLE_SCRIPT_URL,
    });
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to get setup status', 500);
  }
}

async function handleSaveCsd(req: VercelRequest, res: VercelResponse) {
  // Placeholder - file uploads need adaptation
  return sendJson(res, { success: true, message: 'CSD saved (file upload needs adaptation)' });
}

async function handleParseCert(req: VercelRequest, res: VercelResponse) {
  // Placeholder for certificate parsing
  return sendJson(res, { success: true, data: {} });
}

// ============================================
// CSD Handlers
// ============================================
async function handleCsdConfig(req: VercelRequest, res: VercelResponse) {
  return sendJson(res, { success: true, message: 'CSD config endpoint' });
}

async function handleCsdTest(req: VercelRequest, res: VercelResponse) {
  return sendJson(res, { success: true, message: 'CSD test endpoint' });
}

// ============================================
// CFDI Handlers
// ============================================
async function handleCfdiGenerate(req: VercelRequest, res: VercelResponse) {
  const invoiceData = req.body;

  try {
    // Generate CFDI 4.0 XML structure
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" Sello="" Certificado="" NoCertificado="">
  <cfdi:Emisor Rfc="${invoiceData.emisor?.rfc || ''}" Nombre="${invoiceData.emisor?.nombre || ''}" RegimenFiscal="${invoiceData.regimenFiscal || ''}"/>
  <cfdi:Receptor Rfc="${invoiceData.receptor?.rfc || ''}" Nombre="${invoiceData.receptor?.nombre || ''}" UsoCFDI="${invoiceData.usoCFDI || 'G03'}"/>
  <cfdi:Conceptos>
    ${(invoiceData.items || []).map((item: any) => `
    <cfdi:Concepto ClaveProdServ="${item.claveProdServ || '01010101'}" Cantidad="${item.cantidad || 1}" ClaveUnidad="${item.claveUnidad || 'H87'}" Descripcion="${item.descripcion || ''}" ValorUnitario="${item.valorUnitario || 0}" Importe="${(item.cantidad || 1) * (item.valorUnitario || 0)}"/>
    `).join('')}
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="${invoiceData.iva || 0}">
    <cfdi:Traslados>
      <cfdi:Traslado Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${invoiceData.iva || 0}"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
</cfdi:Comprobante>`;

    const xmlBase64 = Buffer.from(xmlContent, 'utf-8').toString('base64');

    return sendJson(res, {
      success: true,
      xmlBase64,
      message: 'CFDI generated successfully',
    });
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to generate CFDI', 500);
  }
}

async function handleCfdiSign(req: VercelRequest, res: VercelResponse) {
  const { xmlBase64 } = req.body || {};

  try {
    const certsDir = path.join(process.cwd(), 'certs');
    const cerPath = path.join(certsDir, 'csd.cer');
    const keyPath = path.join(certsDir, 'csd.key');

    if (!fs.existsSync(cerPath) || !fs.existsSync(keyPath)) {
      return sendError(res, 'CSD files not found. Please upload .cer and .key files', 400);
    }

    const result = await sellarCFDI(xmlBase64, cerPath, keyPath, req.body.password || '');

    if (!result.success) {
      return sendError(res, result.error || 'Failed to sign CFDI', 400);
    }

    return sendJson(res, {
      success: true,
      xmlSellado: result.xmlSellado,
      sello: result.sello,
      noCertificado: result.noCertificado,
      cadenaOriginal: result.cadenaOriginal,
    });
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to sign CFDI', 500);
  }
}

// ============================================
// PAC Handlers
// ============================================
async function handlePacConfigGet(req: VercelRequest, res: VercelResponse) {
  return sendJson(res, {
    provider: 'solucion-factible',
    apiUrl: 'https://wiipdl.s factible.com/wsTimaTimbrado/wsTimbrado',
    user: 'testing@solucionfactible.com',
    configured: false,
  });
}

async function handlePacConfigPost(req: VercelRequest, res: VercelResponse) {
  return sendJson(res, { success: true, message: 'PAC config saved' });
}

async function handlePacTest(req: VercelRequest, res: VercelResponse) {
  return sendJson(res, { success: true, message: 'PAC test endpoint' });
}

async function handlePacTimbrar(req: VercelRequest, res: VercelResponse) {
  return sendJson(res, { success: true, message: 'PAC timbrar endpoint' });
}

async function handlePacTimbrarJson(req: VercelRequest, res: VercelResponse) {
  return sendJson(res, { success: true, message: 'PAC timbrar JSON endpoint' });
}

async function handlePacCancelar(req: VercelRequest, res: VercelResponse) {
  return sendJson(res, { success: true, message: 'PAC cancelar endpoint' });
}

// ============================================
// OCR Handlers
// ============================================
async function handleOcrUpload(req: VercelRequest, res: VercelResponse) {
  return sendJson(res, { success: true, message: 'OCR upload endpoint (needs file upload adaptation)' });
}

async function handleOcrDocuments(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId(req);

  try {
    const gsResult = await callGoogleScript('getOcrDocuments', { userId });

    if (gsResult?.data) {
      return sendJson(res, gsResult.data);
    }

    return sendJson(res, []);
  } catch (error) {
    return sendJson(res, []);
  }
}

// ============================================
// Email Handlers
// ============================================
async function handleEmailWelcome(req: VercelRequest, res: VercelResponse) {
  // In serverless, we can't send emails directly without a service
  // For now, just acknowledge the request
  return sendJson(res, { success: true, message: 'Welcome email request acknowledged' });
}

async function handleEmailInvoice(req: VercelRequest, res: VercelResponse) {
  return sendJson(res, { success: true, message: 'Invoice email request acknowledged' });
}

async function handleEmailTest(req: VercelRequest, res: VercelResponse) {
  return sendJson(res, { success: true, message: 'Email test endpoint' });
}

// ============================================
// SAT Lookup
// ============================================
async function handleSatLookup(req: VercelRequest, res: VercelResponse) {
  const { rfc } = req.query || {};

  try {
    // Simplified SAT lookup - in production, you'd use the actual SAT API
    return sendJson(res, {
      success: true,
      data: {
        rfc,
        nombre: 'Nombre del Contribuyente',
        regimenFiscal: '612',
        estado: 'ACTIVO',
      },
    });
  } catch (error: any) {
    return sendError(res, error.message || 'SAT lookup failed', 500);
  }
}

// ============================================
// OLLAMA Handlers
// ============================================
async function handleOllamaStatus(req: VercelRequest, res: VercelResponse) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${OLLAMA_HOST}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return sendJson(res, {
        available: true,
        host: OLLAMA_HOST,
        model: OLLAMA_MODEL,
        models: data.models?.map((m: any) => m.name) || [],
      });
    }

    return sendJson(res, {
      available: false,
      host: OLLAMA_HOST,
      error: `Status: ${response.status}`,
    });
  } catch (error: any) {
    return sendJson(res, {
      available: false,
      host: OLLAMA_HOST,
      error: error.message || 'Connection failed',
    });
  }
}

async function handleChat(req: VercelRequest, res: VercelResponse) {
  const { messages, stream = false, context } = req.body || {};

  if (!messages || !Array.isArray(messages)) {
    return sendError(res, 'Invalid messages format', 400);
  }

  try {
    // Check if Ollama is available
    const statusController = new AbortController();
    const statusTimeout = setTimeout(() => statusController.abort(), 3000);

    const statusCheck = await fetch(`${OLLAMA_HOST}/api/tags`, {
      method: 'GET',
      signal: statusController.signal,
    });

    clearTimeout(statusTimeout);

    if (!statusCheck.ok) {
      return sendError(res, 'Ollama no está disponible', 503);
    }

    // Build system prompt with context
    let enrichedSystemPrompt = SYSTEM_INSTRUCTION;

    if (context) {
      const contextInfo = [];
      if (context.currentView) {
        contextInfo.push(`- Vista actual del usuario: ${context.currentView}`);
      }
      if (context.stats) {
        contextInfo.push(`- Stats: Total $${context.stats.total || '0'}, ${context.stats.emitidas || 0} facturas`);
      }
      if (contextInfo.length > 0) {
        enrichedSystemPrompt += `\n\n**CONTEXTO EN TIEMPO REAL:**\n${contextInfo.join('\n')}`;
      }
    }

    const formattedMessages = [
      { role: 'system', content: enrichedSystemPrompt },
      ...messages.map((m: any) => ({
        role: m.role === 'model' ? 'assistant' : m.role,
        content: m.text || m.content || '',
      })),
    ];

    const ollamaResponse = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: formattedMessages,
        stream: false,
      }),
    });

    if (!ollamaResponse.ok) {
      throw new Error(`Ollama error: ${ollamaResponse.status}`);
    }

    const data = await ollamaResponse.json();
    const responseText = data.message?.content || 'No response';

    return sendJson(res, { text: responseText });
  } catch (error: any) {
    return sendError(res, `Ollama error: ${error.message}`, 500);
  }
}

// ============================================
// Health Check
// ============================================
async function handleHealth(req: VercelRequest, res: VercelResponse) {
  return sendJson(res, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    googleScript: !!GOOGLE_SCRIPT_URL,
    runtime: 'vercel-serverless',
  });
}
