import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import * as forge from 'node-forge';

const app = express();
const PORT = process.env.PORT || 3001;

const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || '';

// ============ CARPETAS LOCALES PARA FACTURAS ============
const DATA_DIR = path.join(process.cwd(), 'data');

function ensureUserDir(userId: string): string {
  const userDir = path.join(DATA_DIR, 'users', userId, 'facturas');
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  return userDir;
}

function saveInvoiceLocally(userId: string, invoice: any, xmlContent?: string): { xmlPath?: string; pdfPath?: string } {
  try {
    const userDir = ensureUserDir(userId);
    const filename = `${invoice.serie || 'F'}${invoice.folio || invoice.id}_${invoice.uuid || Date.now()}`;

    let xmlPath: string | undefined;
    let pdfPath: string | undefined;

    if (xmlContent) {
      xmlPath = path.join(userDir, `${filename}.xml`);
      fs.writeFileSync(xmlPath, xmlContent, 'utf-8');
      console.log(`[LOCAL] XML guardado en: ${xmlPath}`);
    }

    return { xmlPath, pdfPath };
  } catch (error) {
    console.error('[LOCAL] Error guardando factura:', error);
    return {};
  }
}

app.use(cors());
app.use(express.json());

// ============ CFDI 4.0 SELLADO FUNCTIONS ============
/**
 * Genera la cadena original para sellado según Anexo 20 del SAT
 * Extrae los atributos en el orden exacto especificado
 */
function generarCadenaOriginal(xmlString: string): string {
  // Extraer el nodo Comprobante y sus atributos
  const comprobanteMatch = xmlString.match(/<cfdi:Comprobante([^>]+)>/);
  if (!comprobanteMatch) {
    throw new Error('No se encontró el nodo Comprobante');
  }

  const atributosString = comprobanteMatch[1];

  // Atributos en orden según Anexo 20 (solo los requeridos)
  const atributosOrden = [
    'Version', 'Serie', 'Folio', 'Fecha', 'Sello', 'FormaPago', 'NoCertificado',
    'Certificado', 'CondicionesDePago', 'SubTotal', 'Total', 'TipoDeComprobante',
    'Exportacion', 'MetodoPago', 'LugarExpedicion'
  ];

  const valores: string[] = [];

  for (const atributo of atributosOrden) {
    const match = atributosString.match(new RegExp(`${atributo}="([^"]*)"`, 'i'));
    valores.push(match ? match[1] : '');
  }

  // Formato: ||Version|Serie|Folio|Fecha|Sello|...|
  const cadena = `||${valores.join('|')}|`;

  console.log('[Cadena Original] Generada:', cadena.substring(0, 200) + '...');
  return cadena;
}

/**
 * Sella un XML CFDI usando el CSD (Certificado de Sello Digital)
 * @param xmlBase64 - XML en base64 sin sellar
 * @param cerPath - Ruta al archivo .cer
 * @param keyPath - Ruta al archivo .key  
 * @param password - Contraseña del CSD
 */
async function sellarCFDI(
  xmlBase64: string,
  cerPath: string,
  keyPath: string,
  password: string
): Promise<{ success: boolean; xmlSellado?: string; error?: string }> {
  try {
    console.log('[Sellado CFDI] Iniciando proceso...');
    console.log('[Sellado CFDI] CerPath:', cerPath);
    console.log('[Sellado CFDI] KeyPath:', keyPath);

    // Verificar que existen los archivos
    if (!fs.existsSync(cerPath)) {
      return { success: false, error: `Archivo .cer no encontrado: ${cerPath}` };
    }
    if (!fs.existsSync(keyPath)) {
      return { success: false, error: `Archivo .key no encontrado: ${keyPath}` };
    }

    // Decodificar XML
    const xmlString = Buffer.from(xmlBase64, 'base64').toString('utf-8');
    console.log('[Sellado CFDI] XML decodificado, length:', xmlString.length);

    // Generar cadena original
    const cadenaOriginal = generarCadenaOriginal(xmlString);

    // Leer llave privada (.key)
    const keyPem = fs.readFileSync(keyPath, 'utf-8');

    // Firmar con llave privada (RSA + SHA-256)
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(cadenaOriginal);
    sign.end();

    const sello = sign.sign(keyPem, 'base64');
    console.log('[Sellado CFDI] Sello generado, length:', sello.length);

    // Leer certificado (.cer) y obtener certificado en base64
    const certDer = fs.readFileSync(cerPath);
    const certificadoBase64 = certDer.toString('base64');
    console.log('[Sellado CFDI] Certificado leído, length:', certificadoBase64.length);

    // Extraer número de certificado del .cer
    const certPem = fs.readFileSync(cerPath, 'utf-8');
    let noCertificado = '';
    try {
      const forgeCert = forge.pki.certificateFromPem(certPem);
      noCertificado = forgeCert.serialNumber;
      console.log('[Sellado CFDI] No. Certificado:', noCertificado);
    } catch (e) {
      console.warn('[Sellado CFDI] No se pudo extraer No. Certificado, usando default');
      noCertificado = '00001000000722266137';
    }

    // Insertar sello, certificado y noCertificado en el XML
    let xmlSellado = xmlString;

    // Reemplazar Sello="" por Sello="[sello]"
    xmlSellado = xmlSellado.replace(/Sello=""/g, `Sello="${sello}"`);

    // Reemplazar NoCertificado="" por NoCertificado="[numero]"
    xmlSellado = xmlSellado.replace(/NoCertificado=""/g, `NoCertificado="${noCertificado}"`);

    // Reemplazar Certificado="" por Certificado="[certificado]"
    xmlSellado = xmlSellado.replace(/Certificado=""/g, `Certificado="${certificadoBase64}"`);

    console.log('[Sellado CFDI] XML sellado exitosamente');

    // Convertir a base64
    const xmlSelladoBase64 = Buffer.from(xmlSellado, 'utf-8').toString('base64');

    return {
      success: true,
      xmlSellado: xmlSelladoBase64,
      sello,
      noCertificado,
      cadenaOriginal
    };

  } catch (error: any) {
    console.error('[Sellado CFDI] Error:', error);
    return {
      success: false,
      error: error.message || 'Error al sellar CFDI'
    };
  }
}

/**
 * Obtiene el número de certificado del .cer
 */
function obtenerNoCertificado(cerPath: string): string {
  try {
    if (!fs.existsSync(cerPath)) return '';

    const certPem = fs.readFileSync(cerPath, 'utf-8');
    const forgeCert = forge.pki.certificateFromPem(certPem);
    return forgeCert.serialNumber;
  } catch {
    return '';
  }
}

/**
 * Obtiene el certificado completo en base64
 */
function obtenerCertificadoBase64(cerPath: string): string {
  try {
    if (!fs.existsSync(cerPath)) return '';

    const certDer = fs.readFileSync(cerPath);
    return certDer.toString('base64');
  } catch {
    return '';
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const certsDir = path.join(process.cwd(), 'certs');
    if (!fs.existsSync(certsDir)) {
      fs.mkdirSync(certsDir, { recursive: true });
    }
    cb(null, certsDir);
  },
  filename: (req, file, cb) => {
    if (file.fieldname === 'cer') {
      cb(null, 'csd.cer');
    } else if (file.fieldname === 'key') {
      cb(null, 'csd.key');
    } else {
      cb(null, file.originalname);
    }
  }
});

const upload = multer({ storage });

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = (process.env.OLLAMA_MODEL || 'llama3.2:3b-instruct-q4_K_M').trim();

// System Prompt Definitivo - My Conta AI
const SYSTEM_INSTRUCTION = `Eres "My Conta Ai", el asistente experto integrado en la plataforma de facturación My Conta-AI.

**TU CONTEXTO TÉCNICO:**
- Estás en una app React 19 + Vite + TypeScript
- El usuario ve un Dashboard con: Total $124,500.00, 48 Facturas y 12 Clientes
- El flujo de facturación tiene 3 pasos: Receptor, Conceptos y Pago/Timbrado
- Backend: Node.js + Express
- PAC: Solución Factible (sandbox: testing@solucionfactible.com, password: timbrado.SF.16672)

**TUS CAPACIDADES DE NAVEGACIÓN:**
Si el usuario quiere ir a una sección, DEBES responder con la palabra clave entre corchetes al FINAL de tu respuesta.
**IMPORTANTE: Usa EXACTAMENTE estos tags, NO inventes otros:**
- Ir a Inicio: [NAV:dashboard]
- Ver Facturas: [NAV:invoices]
- Ver Clientes: [NAV:clients]
- Nueva Factura: [NAV:new-invoice]
- Configuración: [NAV:settings]
- Ver Pendientes: [NAV:pending]

**REGLAS FISCALES CRÍTICAS:**
- PUE (Pago en Una Exhibición): El pago se realiza en un solo momento. Es el más común para ventas al contado.
- PPD (Pago en Parcialidades o Diferido): Requiere un Complemento de Pago (REP) después de recibir cada pago.
- RFC: 12 caracteres para Personas Morales (empresas), 13 para Personas Físicas
- Uso CFDI más común: G03 (Gastos en general)
- IVA estándar: 16%, IVA frontera: 8%
- Regímenes comunes: 612 (Actividad Empresarial), 626 (RESICO), 601 (General Ley Personas Morales)

**REGLA DE ORO:**
- Sé breve y profesional (máximo 3-4 oraciones por respuesta)
- Si el usuario tiene facturas pendientes, felicítalo por su actividad
- NUNCA inventes leyes fiscales - si no estás seguro, sugiere consultar un contador
- SIEMPRE valida que el RFC tenga 12-13 caracteres
- USA el catálogo SAT oficial para regímenes y códigos

**TONO:**
- Amable, profesional y accesible
- Explica términos técnicos de forma simple
- Usa ejemplos prácticos de facturación
- Sé paciente con usuarios no técnicos

**CONOCIMIENTO DE LA APP:**
- Para timbrar: usuario debe tener CSD cargado (.cer y .key) en Configuración
- Si "Timbrar" está deshabilitado: falta RFC del receptor o código postal
- Las facturas pasan por estados: BORRADOR → GENERADA → FIRMADA → TIMBRANDO → TIMBRADA`;

// ============ IN-MEMORY STORAGE (for demo) ============
const clients: any[] = [
  {
    id: "CLI-001",
    rfc: "ABC123456T1",
    nombre: "Empresa ABC S.A. de C.V.",
    email: "contacto@abc.com",
    telefono: "55 1234 5678",
    cp: "06600",
    estado: "CDMX",
    regimenFiscal: "601 - General de Ley Personas Morales",
  },
  {
    id: "CLI-002",
    rfc: "PEGA800101H1",
    nombre: "Juan Pérez García",
    email: "juan@gmail.com",
    telefono: "55 9876 5432",
    cp: "03100",
    estado: "CDMX",
    regimenFiscal: "612 - Personas Físicas con Actividad Empresarial",
  },
  {
    id: "CLI-003",
    rfc: "TAN901010K2",
    nombre: "Tecnología Avanzada S.A.",
    email: "info@tech.mx",
    telefono: "33 3456 7890",
    cp: "44100",
    estado: "Jalisco",
    regimenFiscal: "601 - General de Ley Personas Morales",
  },
];

const products: any[] = [];
const invoices: any[] = [];
const companyData: any = {
  nombre: "Mi Empresa S.A. de C.V.",
  rfc: "ABC123456T1",
  regimenFiscal: "601",
};

// In-memory users (serverless = resets on cold start)
// Users are persisted via Google Sheets
const authUsers: any[] = [];

// ============ AUTH FUNCTIONS ============
async function handleGoogleLogin(req: any, res: any) {
  const { email, name } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Try to find user in Google Sheets
    const gsResult = await callGoogleScript('getUser', { email });
    let user = gsResult?.data || null;

    // Also check in-memory
    const memUser = authUsers.find(u => u.email === email);
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

    return res.json({
      success: true,
      user,
      autoPassword: user.isNew ? user.password : undefined,
      isNewUser: user.isNew || false,
    });
  } catch (error: any) {
    console.error('Google login error:', error);
    return res.status(500).json({ error: error.message || 'Login failed' });
  }
}

async function handleGoogleSignup(req: any, res: any) {
  const { email, name } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Check if user exists
    const gsResult = await callGoogleScript('getUser', { email });
    let user = gsResult?.data || null;

    const memUser = authUsers.find(u => u.email === email);
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

    return res.json({
      success: true,
      user,
      isNewUser,
      autoPassword: isNewUser ? user.password : undefined,
    });
  } catch (error: any) {
    console.error('Google signup error:', error);
    return res.status(500).json({ error: error.message || 'Signup failed' });
  }
}

async function handleSignup(req: any, res: any) {
  const { email, name, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Check if user exists
    const gsResult = await callGoogleScript('getUser', { email });
    const existingUser = gsResult?.data || authUsers.find(u => u.email === email);

    if (existingUser) {
      return res.status(409).json({ error: 'El email ya está registrado' });
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

    authUsers.push(newUser);
    await callGoogleScript('createUser', newUser);
    await callGoogleScript('createUserFolder', { userId, email });

    return res.json({
      success: true,
      user: newUser,
      message: 'Usuario creado. Revisa tu email para verificar.',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Signup failed' });
  }
}

async function handleVerify(req: any, res: any) {
  const { email, code } = req.body || {};

  try {
    const gsResult = await callGoogleScript('getUser', { email });
    const user = gsResult?.data || authUsers.find(u => u.email === email);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ error: 'Código de verificación incorrecto' });
    }

    user.verified = true;
    delete user.verificationCode;

    await callGoogleScript('updateUser', user);

    return res.json({
      success: true,
      user,
      message: 'Email verificado exitosamente',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Verification failed' });
  }
}

async function handleResendVerification(req: any, res: any) {
  const { email } = req.body || {};

  try {
    const gsResult = await callGoogleScript('getUser', { email });
    const user = gsResult?.data || authUsers.find(u => u.email === email);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (user.verified) {
      return res.status(400).json({ error: 'El email ya está verificado' });
    }

    user.verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    await callGoogleScript('updateUser', user);

    return res.json({
      success: true,
      message: 'Código de verificación reenviado',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to resend verification' });
  }
}

async function handleLogin(req: any, res: any) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password son requeridos' });
  }

  try {
    const gsResult = await callGoogleScript('getUser', { email });
    let user = gsResult?.data || null;

    const memUser = authUsers.find(u => u.email === email);
    if (memUser && !user) {
      user = memUser;
    }

    if (!user) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    if (!user.verified) {
      return res.json({
        success: true,
        user,
        needsVerification: true,
      });
    }

    return res.json({
      success: true,
      user,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Login failed' });
  }
}

// Generar password automático seguro
function generateAutoPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// ============ HELPER FUNCTIONS ============
async function callGoogleScript(action: string, data?: any): Promise<any> {
  if (!GOOGLE_SCRIPT_URL) {
    return null;
  }

  try {
    const url = new URL(GOOGLE_SCRIPT_URL);
    url.searchParams.set('action', action);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });

    return await response.json();
  } catch (error) {
    console.error('Google Script error:', error);
    return null;
  }
}

// ============ AUTH ENDPOINTS ============
app.post('/api/auth/google-login', handleGoogleLogin);
app.post('/api/auth/google-signup', handleGoogleSignup);
app.post('/api/auth/signup', handleSignup);
app.post('/api/auth/verify', handleVerify);
app.post('/api/auth/resend-verification', handleResendVerification);
app.post('/api/auth/login', handleLogin);

// ============ OLLAMA STATUS CHECK ============
app.get('/api/ollama/status', async (_req, res) => {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      const data = await response.json();
      res.json({
        available: true,
        host: OLLAMA_HOST,
        model: OLLAMA_MODEL,
        models: data.models?.map((m: any) => m.name) || []
      });
    } else {
      res.json({
        available: false,
        host: OLLAMA_HOST,
        error: `Status: ${response.status}`
      });
    }
  } catch (error: any) {
    res.json({
      available: false,
      host: OLLAMA_HOST,
      error: error.message || 'Connection failed'
    });
  }
});

// ============ AI CHAT ENDPOINT (OLLAMA) ============
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, stream = false, context } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    // Verificar si Ollama está disponible
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const statusCheck = await fetch(`${OLLAMA_HOST}/api/tags`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!statusCheck.ok) {
        return res.status(503).json({
          error: 'Ollama no está disponible',
          details: 'El servicio de IA no está corriendo. Por favor inicia Ollama o desactiva el asistente de IA.'
        });
      }
    } catch (checkError: any) {
      return res.status(503).json({
        error: 'Ollama no está disponible',
        details: 'No se puede conectar al servidor de IA. Asegúrate de que Ollama esté corriendo en localhost:11434.'
      });
    }

    // Inyectar contexto vivo en el system prompt
    let enrichedSystemPrompt = SYSTEM_INSTRUCTION;

    if (context) {
      const contextInfo = [];
      if (context.currentView) {
        contextInfo.push(`- Vista actual del usuario: ${context.currentView}`);
      }
      if (context.stats) {
        contextInfo.push(`- Stats en tiempo real: Total facturado $${context.stats.total || '0'}, ${context.stats.emitidas || 0} facturas, ${context.stats.clientes || 0} clientes`);
      }
      if (context.user_regimen) {
        contextInfo.push(`- Régimen fiscal del usuario: ${context.user_regimen}`);
      }
      if (contextInfo.length > 0) {
        enrichedSystemPrompt += `\n\n**CONTEXTO EN TIEMPO REAL:**\n${contextInfo.join('\n')}`;
      }
    }

    const formattedMessages = [
      { role: 'system', content: enrichedSystemPrompt },
      ...messages.map((m: any) => ({
        role: m.role === 'model' ? 'assistant' : m.role,
        content: m.text || m.content || ''
      }))
    ];

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const ollamaResponse = await fetch(`${OLLAMA_HOST}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages: formattedMessages,
          stream: true
        })
      });

      if (!ollamaResponse.ok) {
        throw new Error(`Ollama error: ${ollamaResponse.status}`);
      }

      const reader = ollamaResponse.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              res.write(`data: ${JSON.stringify({ content: data.message.content })}\n\n`);
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    const ollamaResponse = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: formattedMessages,
        stream: false
      })
    });

    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      console.error('[OLLAMA ERROR] Status:', ollamaResponse.status);
      console.error('[OLLAMA ERROR] Response:', errorText);
      console.error('[OLLAMA ERROR] Request body:', JSON.stringify({
        model: OLLAMA_MODEL,
        messages: formattedMessages.slice(0, 2), // Just log first 2 messages for brevity
        stream: false
      }).substring(0, 500));
      throw new Error(`Ollama error: ${ollamaResponse.status}`);
    }

    const data = await ollamaResponse.json();
    const responseText = data.message?.content || 'No response from model';

    res.json({ text: responseText });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Failed to get response from Ollama',
      details: error.message || 'Unknown error'
    });
  }
});

// ============ CLIENTS ENDPOINTS ============
app.get('/api/clients', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || req.body?.userId;
    const gsResult = await callGoogleScript('getClients', { userId: userId || '' });
    if (gsResult?.data && Array.isArray(gsResult.data) && gsResult.data.length > 0) {
      // Normalizar campos del Google Script (PascalCase) al formato del frontend
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
      return res.json(normalized);
    }
    const userClients = clients.filter(c => !userId || c.userId === userId);
    res.json(userClients);
  } catch (error) {
    console.error('Get clients error:', error);
    res.json(clients);
  }
});

app.get('/api/clients/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || req.body?.userId;
    const client = clients.find(c => c.id === req.params.id && (!userId || c.userId === userId));
    if (client) {
      res.json(client);
    } else {
      const gsResult = await callGoogleScript('getClients', { userId });
      const allClients = gsResult?.data || clients;
      const found = allClients.find((c: any) => c.ID === req.params.id || c.id === req.params.id);
      res.json(found || null);
    }
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ error: 'Failed to get client' });
  }
});

app.post('/api/clients', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || req.body?.userId;
    const newClient = {
      id: req.body.id || `CLI-${Date.now()}`,
      userId,
      ...req.body,
      fechaAlta: new Date().toISOString(),
    };
    clients.push(newClient);

    await callGoogleScript('saveClient', newClient);

    res.json({ success: true, data: newClient });
  } catch (error) {
    console.error('Save client error:', error);
    res.status(500).json({ error: 'Failed to save client' });
  }
});

app.put('/api/clients/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || req.body?.userId;
    const index = clients.findIndex(c => c.id === req.params.id && (!userId || c.userId === userId));
    if (index !== -1) {
      clients[index] = { ...clients[index], ...req.body };
      await callGoogleScript('saveClient', clients[index]);
      res.json({ success: true, data: clients[index] });
    } else {
      res.status(404).json({ error: 'Client not found' });
    }
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || req.body?.userId;
    const index = clients.findIndex(c => c.id === req.params.id && (!userId || c.userId === userId));
    if (index !== -1) {
      clients.splice(index, 1);
      res.json({ success: true, message: 'Client deleted' });
    } else {
      res.status(404).json({ error: 'Client not found' });
    }
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

// ============ PRODUCTS ENDPOINTS ============
app.get('/api/products', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || req.body?.userId;
    const gsResult = await callGoogleScript('getProducts', { userId });
    if (gsResult?.data) {
      return res.json(gsResult.data);
    }
    const userProducts = products.filter(p => !userId || p.userId === userId);
    res.json(userProducts);
  } catch (error) {
    console.error('Get products error:', error);
    res.json(products);
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || req.body?.userId;
    const newProduct = {
      id: req.body.id || `PROD-${Date.now()}`,
      userId,
      ...req.body,
      fechaAlta: new Date().toISOString(),
    };
    products.push(newProduct);

    await callGoogleScript('saveProduct', newProduct);

    res.json({ success: true, data: newProduct });
  } catch (error) {
    console.error('Save product error:', error);
    res.status(500).json({ error: 'Failed to save product' });
  }
});

// ============ INVOICES ENDPOINTS ============
app.get('/api/invoices', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || req.body?.userId;
    const gsResult = await callGoogleScript('getInvoices', { userId });
    if (gsResult?.data) {
      return res.json(gsResult.data);
    }
    const userInvoices = invoices.filter(i => !userId || i.userId === userId);
    res.json(userInvoices);
  } catch (error) {
    console.error('Get invoices error:', error);
    res.json(invoices);
  }
});

app.get('/api/invoices/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || req.body?.userId;
    const invoice = invoices.find(i => (i.id === req.params.id || i.ID === req.params.id) && (!userId || i.userId === userId));
    if (invoice) {
      return res.json(invoice);
    }
    const gsResult = await callGoogleScript('getInvoices', { userId });
    const allInvoices = gsResult?.data || invoices;
    const found = allInvoices.find((i: any) => i.ID === req.params.id || i.id === req.params.id);
    res.json(found || null);
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: 'Failed to get invoice' });
  }
});

app.post('/api/invoices', async (req, res) => {
  try {
    // Obtener userId del header o body, o generarlo desde el email
    let userId = req.headers['x-user-id'] as string || req.body?.userId;

    // Si no hay userId, intentar generar uno desde el email del emisor
    if (!userId && req.body?.emisor?.email) {
      userId = req.body.emisor.email;
    }

    // Si aún no hay userId, usar el RFC del emisor
    if (!userId && req.body?.emisor?.rfc) {
      userId = req.body.emisor.rfc;
    }

    // Último fallback
    userId = userId || 'default-user';

    console.log('[INVOICE] UserId para factura:', userId);

    const now = new Date().toISOString();
    const invoiceData = req.body;

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
      items: invoiceData.items || [],
      fechaCreacion: now,
      fechaTimbrado: invoiceData.fechaTimbrado || null,
    };

    invoices.push(newInvoice);

    // Guardar localmente
    saveInvoiceLocally(userId, newInvoice, newInvoice.xmlContent);

    // Guardar en Google Sheets
    await callGoogleScript('saveInvoice', newInvoice);

    res.json({ success: true, data: newInvoice });
  } catch (error) {
    console.error('Save invoice error:', error);
    res.status(500).json({ error: 'Failed to save invoice', details: String(error) });
  }
});

app.put('/api/invoices/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || req.body?.userId;
    const index = invoices.findIndex(i => (i.id === req.params.id || i.ID === req.params.id) && (!userId || i.userId === userId));
    if (index !== -1) {
      invoices[index] = { ...invoices[index], ...req.body };
      await callGoogleScript('saveInvoice', invoices[index]);
      res.json({ success: true, data: invoices[index] });
    } else {
      const gsResult = await callGoogleScript('getInvoices', { userId });
      if (gsResult?.data) {
        const allInvoices = gsResult.data;
        const idx = allInvoices.findIndex((i: any) => i.ID === req.params.id || i.id === req.params.id);
        if (idx !== -1) {
          allInvoices[idx] = { ...allInvoices[idx], ...req.body };
          await callGoogleScript('saveInvoice', allInvoices[idx]);
          return res.json({ success: true, data: allInvoices[idx] });
        }
      }
      res.status(404).json({ error: 'Invoice not found' });
    }
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

app.delete('/api/invoices/:id', async (req, res) => {
  try {
    const index = invoices.findIndex(i => i.id === req.params.id || i.ID === req.params.id);
    if (index !== -1) {
      invoices.splice(index, 1);
      res.json({ success: true, message: 'Invoice deleted' });
    } else {
      res.status(404).json({ error: 'Invoice not found' });
    }
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

// ============ PENDING INVOICES (FACTURAS PENDIENTES) ============
const pendingInvoices: any[] = [];

app.get('/api/pending-invoices', async (_req, res) => {
  try {
    res.json(pendingInvoices);
  } catch (error) {
    console.error('Get pending invoices error:', error);
    res.json(pendingInvoices);
  }
});

app.get('/api/pending-invoices/:id', async (req, res) => {
  try {
    const invoice = pendingInvoices.find(i => i.id === req.params.id || i.ID === req.params.id);
    if (invoice) {
      return res.json(invoice);
    }
    res.status(404).json({ error: 'Pending invoice not found' });
  } catch (error) {
    console.error('Get pending invoice error:', error);
    res.status(500).json({ error: 'Failed to get pending invoice' });
  }
});

app.post('/api/pending-invoices', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const invoiceData = req.body;

    const newPendingInvoice = {
      ID: invoiceData.ID || `PEND-${Date.now()}`,
      Fecha: invoiceData.Fecha || now,
      Serie: invoiceData.Serie || 'F',
      Folio: invoiceData.Folio || String(Date.now()).slice(-6),
      RFC_Emisor: invoiceData.RFC_Emisor || invoiceData.rfcEmisor || '',
      Nombre_Emisor: invoiceData.Nombre_Emisor || invoiceData.nombreEmisor || '',
      RFC_Receptor: invoiceData.RFC_Receptor || invoiceData.rfcReceptor || '',
      Nombre_Receptor: invoiceData.Nombre_Receptor || invoiceData.nombreReceptor || '',
      UsoCFDI: invoiceData.UsoCFDI || invoiceData.usoCFDI || '',
      MetodoPago: invoiceData.MetodoPago || invoiceData.metodoPago || '',
      FormaPago: invoiceData.FormaPago || invoiceData.formaPago || '',
      RegimenFiscal: invoiceData.RegimenFiscal || invoiceData.regimenFiscal || '',
      Subtotal: invoiceData.Subtotal || invoiceData.subtotal || 0,
      IVA: invoiceData.IVA || invoiceData.iva || 0,
      Total: invoiceData.Total || invoiceData.total || 0,
      Status: 'BORRADOR',
      PDF_Url: '',
      XML_Url: '',
      items: invoiceData.items || [],
      fechaCreacion: now,
      fechaModificacion: now,
    };

    pendingInvoices.push(newPendingInvoice);
    res.json({ success: true, data: newPendingInvoice });
  } catch (error) {
    console.error('Save pending invoice error:', error);
    res.status(500).json({ error: 'Failed to save pending invoice', details: String(error) });
  }
});

app.put('/api/pending-invoices/:id', async (req, res) => {
  try {
    const index = pendingInvoices.findIndex(i => i.id === req.params.id || i.ID === req.params.id);
    if (index !== -1) {
      pendingInvoices[index] = {
        ...pendingInvoices[index],
        ...req.body,
        fechaModificacion: new Date().toISOString()
      };
      res.json({ success: true, data: pendingInvoices[index] });
    } else {
      res.status(404).json({ error: 'Pending invoice not found' });
    }
  } catch (error) {
    console.error('Update pending invoice error:', error);
    res.status(500).json({ error: 'Failed to update pending invoice' });
  }
});

app.delete('/api/pending-invoices/:id', async (req, res) => {
  try {
    const index = pendingInvoices.findIndex(i => i.id === req.params.id || i.ID === req.params.id);
    if (index !== -1) {
      pendingInvoices.splice(index, 1);
      res.json({ success: true, message: 'Pending invoice deleted' });
    } else {
      res.status(404).json({ error: 'Pending invoice not found' });
    }
  } catch (error) {
    console.error('Delete pending invoice error:', error);
    res.status(500).json({ error: 'Failed to delete pending invoice' });
  }
});

app.post('/api/pending-invoices/:id/timbrar', async (req, res) => {
  try {
    const index = pendingInvoices.findIndex(i => i.id === req.params.id || i.ID === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Pending invoice not found' });
    }

    const pendingInvoice = pendingInvoices[index];

    if (!pacConfig) {
      return res.status(400).json({ error: 'PAC no configurado. Configura en Settings.' });
    }

    const xmlBase64 = pendingInvoice.XML_Base64 || pendingInvoice.xmlBase64;
    if (!xmlBase64) {
      return res.status(400).json({ error: 'XML no disponible. Genera el CFDI primero.' });
    }

    const result = await timbrarConPAC(xmlBase64);

    if (result.success) {
      const userId = pendingInvoice.userId || req.headers['x-user-id'] as string || 'default';
      const user = users.find(u => u.id === userId);
      const driveFolderId = user?.driveFolderId || '';

      const timbradaInvoice = {
        id: pendingInvoice.ID || pendingInvoice.id || `INV-${Date.now()}`,
        userId,
        fecha: pendingInvoice.Fecha || pendingInvoice.fecha,
        serie: pendingInvoice.Serie || pendingInvoice.serie || 'F',
        folio: pendingInvoice.Folio || pendingInvoice.folio || String(Date.now()).slice(-6),
        uuid: result.uuid,
        emisor: pendingInvoice.emisor || { rfc: pendingInvoice.RFC_Emisor, nombre: pendingInvoice.Nombre_Emisor },
        receptor: pendingInvoice.receptor || { rfc: pendingInvoice.RFC_Receptor, nombre: pendingInvoice.Nombre_Receptor },
        usoCFDI: pendingInvoice.UsoCFDI || pendingInvoice.usoCFDI,
        metodoPago: pendingInvoice.MetodoPago || pendingInvoice.metodoPago,
        formaPago: pendingInvoice.FormaPago || pendingInvoice.formaPago,
        regimenFiscal: pendingInvoice.RegimenFiscal || pendingInvoice.regimenFiscal,
        subtotal: pendingInvoice.Subtotal || pendingInvoice.subtotal,
        iva: pendingInvoice.IVA || pendingInvoice.iva,
        total: pendingInvoice.Total || pendingInvoice.total,
        status: 'TIMBRADA',
        pdfUrl: '',
        xmlUrl: '',
        xmlContent: result.xmlTimbrado,
        fechaCreacion: pendingInvoice.fechaCreacion,
        fechaTimbrado: result.fechaTimbrado,
      };

      // 1. Guardar LOCALMENTE
      const localPaths = saveInvoiceLocally(userId, timbradaInvoice, Buffer.from(result.xmlTimbrado, 'base64').toString('utf-8'));
      console.log(`[TIMBRAR] Factura guardada localmente:`, localPaths);

      // 2. Guardar en GOOGLE DRIVE (si hay folder del usuario)
      if (driveFolderId) {
        try {
          // Guardar XML en Drive
          const xmlDriveResult = await callGoogleScript('saveXmlToDrive', {
            xmlBase64: result.xmlTimbrado,
            serie: timbradaInvoice.serie,
            folio: timbradaInvoice.folio,
            uuid: result.uuid,
            userFolderId: driveFolderId
          });
          console.log(`[TIMBRAR] XML guardado en Google Drive:`, xmlDriveResult);

          // Guardar PDF si existe
          if (pendingInvoice.pdfBase64) {
            await callGoogleScript('savePdfToDrive', {
              pdfBase64: pendingInvoice.pdfBase64,
              serie: timbradaInvoice.serie,
              folio: timbradaInvoice.folio,
              userFolderId: driveFolderId
            });
          }
        } catch (driveError) {
          console.log(`[TIMBRAR] Error guardando en Drive (no crítico):`, driveError);
        }
      }

      // 3. Guardar en GOOGLE SHEETS
      pendingInvoices.splice(index, 1);
      invoices.push(timbradaInvoice);
      await callGoogleScript('saveInvoice', timbradaInvoice);

      return res.json({
        success: true,
        data: timbradaInvoice,
        localPaths,
        mensaje: 'Factura timbrada y guardada exitosamente'
      });
    } else {
      return res.status(400).json({ success: false, mensaje: result.mensaje });
    }
  } catch (error) {
    console.error('Timbrar pending invoice error:', error);
    res.status(500).json({ error: 'Failed to timbrar pending invoice' });
  }
});

// ============ GOOGLE DRIVE PDF UPLOAD ============
app.post('/api/invoices/:id/upload-pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const { pdfBase64, filename } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ error: 'PDF es requerido' });
    }

    const invoice = invoices.find(i => i.id === id || i.ID === id) ||
      pendingInvoices.find(i => i.id === id || i.ID === id);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoiceId = invoice.ID || invoice.id;
    const pdfFilename = filename || `factura_${invoiceId}_${Date.now()}.pdf`;

    const gsResult = await callGoogleScript('uploadPDF', {
      invoiceId: invoiceId,
      pdfBase64: pdfBase64,
      filename: pdfFilename,
    });

    if (gsResult?.success || gsResult?.fileUrl) {
      const url = gsResult.fileUrl || gsResult.url;

      if (invoices.find(i => i.id === id || i.ID === id)) {
        const idx = invoices.findIndex(i => i.id === id || i.ID === id);
        invoices[idx].PDF_Url = url;
        await callGoogleScript('saveInvoice', invoices[idx]);
      }

      res.json({ success: true, url, filename: pdfFilename });
    } else {
      res.json({
        success: true,
        url: `local:${pdfFilename}`,
        filename: pdfFilename,
        message: 'PDF guardado localmente (Google Drive no configurado)'
      });
    }
  } catch (error) {
    console.error('Upload PDF error:', error);
    res.status(500).json({ error: 'Failed to upload PDF' });
  }
});

app.post('/api/invoices/upload-xml', async (req, res) => {
  try {
    const { uuid, xmlBase64, filename } = req.body;

    if (!xmlBase64) {
      return res.status(400).json({ error: 'XML es requerido' });
    }

    const xmlFilename = filename || `cfdi_${uuid || Date.now()}.xml`;

    const gsResult = await callGoogleScript('uploadXML', {
      uuid: uuid,
      xmlBase64: xmlBase64,
      filename: xmlFilename,
    });

    if (gsResult?.success || gsResult?.fileUrl) {
      const url = gsResult.fileUrl || gsResult.url;
      res.json({ success: true, url, filename: xmlFilename });
    } else {
      const certsDir = path.join(process.cwd(), 'invoices');
      if (!fs.existsSync(certsDir)) {
        fs.mkdirSync(certsDir, { recursive: true });
      }
      const xmlPath = path.join(certsDir, xmlFilename);
      fs.writeFileSync(xmlPath, Buffer.from(xmlBase64, 'base64'));
      res.json({
        success: true,
        url: `local:${xmlFilename}`,
        filename: xmlFilename,
        message: 'XML guardado localmente'
      });
    }
  } catch (error) {
    console.error('Upload XML error:', error);
    res.status(500).json({ error: 'Failed to upload XML' });
  }
});

// ============ OCR DOCUMENT UPLOAD ============
app.post('/api/ocr/upload', async (req, res) => {
  try {
    const { userId, documentType, imageBase64, fileName, extractedData } = req.body;

    if (!userId || !imageBase64) {
      return res.status(400).json({ error: 'userId e imageBase64 son requeridos' });
    }

    // Guardar en Google Drive
    const gsResult = await callGoogleScript('saveOcrDocumentToDrive', {
      userId,
      documentType: documentType || 'unknown',
      imageBase64,
      fileName: fileName || `OCR_${Date.now()}`,
      extractedData
    });

    if (gsResult?.success || gsResult?.url) {
      res.json({
        success: true,
        url: gsResult.url,
        id: gsResult.id,
        message: 'Documento OCR guardado exitosamente'
      });
    } else {
      // Guardado local como fallback
      const ocrDir = path.join(DATA_DIR, 'users', userId, 'ocr');
      if (!fs.existsSync(ocrDir)) {
        fs.mkdirSync(ocrDir, { recursive: true });
      }

      const timestamp = Date.now();
      const safeFileName = fileName ? fileName.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.-]/g, '_') : `OCR_${timestamp}`;
      const fullFileName = `${safeFileName}_${timestamp}.jpg`;
      const filePath = path.join(ocrDir, fullFileName);

      // Decodificar base64 y guardar
      const base64Data = imageBase64.replace(/^data:image\/(jpeg|png|jpg);base64,/, '');
      fs.writeFileSync(filePath, base64Data, 'base64');

      res.json({
        success: true,
        url: `local:${fullFileName}`,
        path: filePath,
        message: 'Documento OCR guardado localmente'
      });
    }
  } catch (error) {
    console.error('Upload OCR error:', error);
    res.status(500).json({ error: 'Failed to upload OCR document' });
  }
});

// ============ GET OCR DOCUMENTS ============
app.get('/api/ocr/documents', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || req.query.userId as string;

    if (!userId) {
      return res.status(400).json({ error: 'userId es requerido' });
    }

    const gsResult = await callGoogleScript('getOcrDocuments', { userId });

    if (gsResult?.data) {
      res.json({ success: true, documents: gsResult.data });
    } else {
      res.json({ success: true, documents: [] });
    }
  } catch (error) {
    console.error('Get OCR documents error:', error);
    res.json({ success: true, documents: [] });
  }
});

// ============ COMPANY ENDPOINTS ============
app.get('/api/company', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || req.body?.userId;
    console.log('[API /company] Buscando datos de empresa para userId:', userId);
    const gsResult = await callGoogleScript('getCompanyData', { userId: userId || '' });
    console.log('[API /company] Resultado del Google Script:', JSON.stringify(gsResult));
    if (gsResult?.data) {
      // Mapear campos camelCase (Google Script) → PascalCase (frontend)
      const mappedData = {
        Nombre: gsResult.data.nombre || gsResult.data.Nombre || '',
        RFC: gsResult.data.rfc || gsResult.data.RFC || '',
        Calle: gsResult.data.calle || gsResult.data.Calle || '',
        NumeroExt: gsResult.data.numeroExt || gsResult.data.NumeroExt || '',
        NumeroInt: gsResult.data.numeroInt || gsResult.data.NumeroInt || '',
        Colonia: gsResult.data.colonia || gsResult.data.Colonia || '',
        Municipio: gsResult.data.municipio || gsResult.data.Municipio || '',
        Estado: gsResult.data.estado || gsResult.data.Estado || '',
        Pais: gsResult.data.pais || gsResult.data.Pais || 'México',
        CP: gsResult.data.cp || gsResult.data.CP || '',
        Email: gsResult.data.email || gsResult.data.Email || '',
        Telefono: gsResult.data.telefono || gsResult.data.Telefono || '',
        RegimenFiscal: gsResult.data.regimenFiscal || gsResult.data.RegimenFiscal || ''
      };
      console.log('[API /company] Datos mapeados devueltos:', mappedData);
      return res.json(mappedData);
    }
    console.log('[API /company] Google Script no devolvió datos, retornando vacío');
    // Si Google Script no devuelve datos, retornar vacío (no datos demo)
    res.json({
      Nombre: '',
      RFC: '',
      Calle: '',
      NumeroExt: '',
      NumeroInt: '',
      Colonia: '',
      Municipio: '',
      Estado: '',
      Pais: 'México',
      CP: '',
      Email: '',
      Telefono: '',
      RegimenFiscal: ''
    });
  } catch (error) {
    console.error('[API /company] Error:', error);
    // En caso de error, retornar vacío
    res.json({
      Nombre: '',
      RFC: '',
      Calle: '',
      NumeroExt: '',
      NumeroInt: '',
      Colonia: '',
      Municipio: '',
      Estado: '',
      Pais: 'México',
      CP: '',
      Email: '',
      Telefono: '',
      RegimenFiscal: ''
    });
  }
});

app.post('/api/company', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || req.body?.userId;
    Object.assign(companyData, { ...req.body, userId });

    // Mapear campos PascalCase (frontend) → camelCase (Google Script)
    const gsData = {
      userId: userId || companyData.userId || '',
      nombre: req.body.Nombre || companyData.Nombre || '',
      rfc: req.body.RFC || companyData.RFC || '',
      calle: req.body.Calle || companyData.Calle || '',
      numeroExt: req.body.NumeroExt || companyData.NumeroExt || '',
      numeroInt: req.body.NumeroInt || companyData.NumeroInt || '',
      colonia: req.body.Colonia || companyData.Colonia || '',
      municipio: req.body.Municipio || companyData.Municipio || '',
      estado: req.body.Estado || companyData.Estado || '',
      pais: req.body.Pais || companyData.Pais || 'México',
      cp: req.body.CP || companyData.CP || '',
      email: req.body.Email || companyData.Email || '',
      telefono: req.body.Telefono || companyData.Telefono || '',
      regimenFiscal: req.body.RegimenFiscal || companyData.RegimenFiscal || ''
    };

    console.log('[SHEETS] Guardando datos de empresa:', gsData);
    const gsResult = await callGoogleScript('saveCompanyData', gsData);

    // Verificar si hubo error de duplicado
    if (gsResult?.error) {
      console.error('[SHEETS] Error:', gsResult.error);
      return res.status(409).json({
        error: gsResult.error,
        duplicate: true
      });
    }

    if (gsData.rfc && userId) {
      try {
        await callGoogleScript('updateUserRFC', {
          email: gsData.email,
          rfc: gsData.rfc,
          nombreEmpresa: gsData.nombre || ''
        });
        console.log(`[SHEETS] RFC ${gsData.rfc} vinculado al usuario ${userId}`);
      } catch (e) {
        console.log(`[SHEETS] Error actualizando RFC en Usuarios: ${e}`);
      }
    }

    res.json({
      success: true,
      data: companyData,
      action: gsResult?.data?.action || 'saved'
    });
  } catch (error) {
    console.error('Save company error:', error);
    const errorMessage = error.message || 'Failed to save company data';
    const isDuplicate = errorMessage.includes('ya está registrado') || errorMessage.includes('duplicado');

    res.status(isDuplicate ? 409 : 500).json({
      error: errorMessage,
      duplicate: isDuplicate
    });
  }
});

// ============ CSD SETUP ============
app.post('/api/setup/save-csd', upload.fields([
  { name: 'cer', maxCount: 1 },
  { name: 'key', maxCount: 1 }
]), (req, res) => {
  try {
    const { password } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!files['cer'] || !files['key']) {
      return res.status(400).json({ error: 'Faltan archivos' });
    }

    const cerPath = files['cer'][0].path;
    const keyPath = files['key'][0].path;
    const certsDir = path.join(process.cwd(), 'certs');

    if (cerPath !== path.join(certsDir, 'csd.cer')) {
      fs.copyFileSync(cerPath, path.join(certsDir, 'csd.cer'));
      fs.unlinkSync(cerPath);
    }
    if (keyPath !== path.join(certsDir, 'csd.key')) {
      fs.copyFileSync(keyPath, path.join(certsDir, 'csd.key'));
      fs.unlinkSync(keyPath);
    }

    process.env.CSD_CER_FILE = path.join(certsDir, 'csd.cer');
    process.env.CSD_KEY_FILE = path.join(certsDir, 'csd.key');
    process.env.CSD_PASSWORD = password;

    res.json({ success: true, message: 'CSD guardado correctamente' });
  } catch (error) {
    console.error('Error saving CSD:', error);
    res.status(500).json({ error: 'Error al guardar CSD' });
  }
});

app.get('/api/setup/status', (_req, res) => {
  const certsDir = path.join(process.cwd(), 'certs');
  const cerPath = path.join(certsDir, 'csd.cer');
  const keyPath = path.join(certsDir, 'csd.key');

  res.json({
    csdConfigured: fs.existsSync(cerPath) && fs.existsSync(keyPath),
    cerExists: fs.existsSync(cerPath),
    keyExists: fs.existsSync(keyPath)
  });
});

// ============ CSD CONFIG ENDPOINT ============
/**
 * Endpoint para guardar configuración de CSD con rutas personalizadas
 */
app.post('/api/csd/config', async (req, res) => {
  try {
    const { cerPath, keyPath, password } = req.body;

    if (!cerPath || !keyPath || !password) {
      return res.status(400).json({
        error: 'Rutas y contraseña son requeridas',
        fields: ['cerPath', 'keyPath', 'password']
      });
    }

    // Verificar que los archivos existen
    if (!fs.existsSync(cerPath)) {
      return res.status(400).json({ error: `Archivo .cer no encontrado: ${cerPath}` });
    }
    if (!fs.existsSync(keyPath)) {
      return res.status(400).json({ error: `Archivo .key no encontrado: ${keyPath}` });
    }

    // Validar que el certificado es válido
    try {
      const certData = fs.readFileSync(cerPath, 'utf-8');
      const forgeCert = forge.pki.certificateFromPem(certData);
      const serialNumber = forgeCert.serialNumber;
      const notAfter = forgeCert.validity.notAfter;
      const isExpired = new Date() > notAfter;

      if (isExpired) {
        return res.status(400).json({
          error: 'El certificado está expirado',
          expiredDate: notAfter.toISOString()
        });
      }

      // Guardar configuración
      process.env.CSD_CER_FILE = cerPath;
      process.env.CSD_KEY_FILE = keyPath;
      process.env.CSD_PASSWORD = password;

      res.json({
        success: true,
        message: 'CSD configurado correctamente',
        certificate: {
          serialNumber,
          validUntil: notAfter.toISOString(),
          daysUntilExpiration: Math.floor((notAfter.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        }
      });
    } catch (certError: any) {
      return res.status(400).json({
        error: 'El archivo .cer no es un certificado válido',
        details: certError.message
      });
    }
  } catch (error: any) {
    console.error('[CSD Config] Error:', error);
    res.status(500).json({ error: 'Error al configurar CSD' });
  }
});

// ============ TEST CSD ENDPOINT ============
/**
 * Endpoint para probar el sellado con el CSD configurado
 */
app.post('/api/csd/test', async (req, res) => {
  try {
    const cerPath = process.env.CSD_CER_FILE || path.join(process.cwd(), 'certs', 'csd.cer');
    const keyPath = process.env.CSD_KEY_FILE || path.join(process.cwd(), 'certs', 'csd.key');
    const csdPassword = process.env.CSD_PASSWORD;

    if (!fs.existsSync(cerPath) || !fs.existsSync(keyPath)) {
      return res.status(400).json({
        success: false,
        message: 'CSD no configurado. Sube los archivos en Configuración.'
      });
    }

    if (!csdPassword) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña del CSD no configurada.'
      });
    }

    // Generar CFDI de prueba
    const xmlGenerator = await import('./src/lib/xml-generator');
    const xmlSinSello = xmlGenerator.generarCFDI({
      emisor: { rfc: 'XAXX010101000', nombre: 'Test', regimenFiscal: '612' },
      receptor: { rfc: 'XEXX010101000', nombre: 'Test', regimenFiscal: '616', usoCFDI: 'G01', domicilioFiscalReceptor: '06600' },
      conceptos: [{ claveProdServ: '01010101', cantidad: 1, claveUnidad: 'H87', descripcion: 'Test', valorUnitario: 100, importe: 100, objetoImp: '02' }],
      formaPago: '01',
      metodoPago: 'PUE',
      moneda: 'MXN',
      tipoComprobante: 'I',
      lugarExpedicion: '06600'
    });

    const xmlBase64 = Buffer.from(xmlSinSello, 'utf-8').toString('base64');

    // Sellar
    const result = await sellarCFDI(xmlBase64, cerPath, keyPath, csdPassword);

    if (result.success) {
      res.json({
        success: true,
        message: 'Sellado de prueba exitoso',
        noCertificado: result.noCertificado,
        selloLength: result.sello?.length
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Error al sellar: ' + result.error
      });
    }
  } catch (error: any) {
    console.error('[CSD Test] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al probar CSD'
    });
  }
});

// ============ CFDI GENERATE ENDPOINT ============
app.post('/api/cfdi/generate', async (req, res) => {
  try {
    const {
      serie, folio, fecha, rfcEmisor, nombreEmisor, regimenFiscalEmisor,
      rfcReceptor, nombreReceptor, usoCFDI, formaPago, metodoPago,
      moneda, tipoComprobante, lugarExpedicion, items
    } = req.body;

    const subtotal = items.reduce((acc: number, item: any) => acc + (item.cantidad * item.valorUnitario), 0);
    const iva = subtotal * 0.16;
    const total = subtotal + iva;
    const folioFinal = folio || String(Date.now()).slice(-6);
    const fechaFinal = fecha || new Date().toISOString().slice(0, 19);

    let itemsXML = '';
    items.forEach((item: any) => {
      const importe = item.cantidad * item.valorUnitario;
      itemsXML += `
    <cfdi:Concepto ClaveProdServ="${item.claveProdServ}" Cantidad="${item.cantidad}" ClaveUnidad="${item.claveUnidad}" Descripcion="${item.descripcion}" ValorUnitario="${item.valorUnitario}" Importe="${importe}" ObjetoImp="${item.objetoImp}">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="${importe}" Impuesto="002" TasaOcuota="0.160000" TipoFactor="Tasa" Importe="${importe * 0.16}"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>`;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd" Version="4.0" Serie="${serie || 'F'}" Folio="${folioFinal}" Fecha="${fechaFinal}" FormaPago="${formaPago}" NoCertificado="" Certificado="" SubTotal="${subtotal}" Moneda="${moneda || 'MXN'}" Total="${total}" TipoDeComprobante="${tipoComprobante || 'I'}" MetodoPago="${metodoPago}" Exportacion="01" LugarExpedicion="${lugarExpedicion || '00000'}">
  <cfdi:Emisor Rfc="${rfcEmisor}" Nombre="${nombreEmisor}" RegimenFiscal="${regimenFiscalEmisor}"/>
  <cfdi:Receptor Rfc="${rfcReceptor}" Nombre="${nombreReceptor}" UsoCFDI="${usoCFDI}"/>
  <cfdi:Conceptos>${itemsXML}
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="${iva}">
    <cfdi:Traslados>
      <cfdi:Traslado Base="${subtotal}" Impuesto="002" TasaOcuota="0.160000" TipoFactor="Tasa" Importe="${iva}"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
</cfdi:Comprobante>`;

    res.json({
      success: true,
      xml,
      xmlBase64: Buffer.from(xml, 'utf8').toString('base64'),
      subtotal,
      iva,
      total,
      folio: folioFinal
    });
  } catch (error: any) {
    console.error('[CFDI Generate] Error:', error);
    res.status(500).json({ error: error.message || 'Error generando CFDI' });
  }
});

// ============ CFDI SIGN ENDPOINT ============
app.post('/api/cfdi/sign', async (req, res) => {
  try {
    const { xmlBase64 } = req.body;
    if (!xmlBase64) {
      return res.status(400).json({ error: 'XML en base64 es requerido' });
    }

    const cerPath = process.env.CSD_CER_FILE || path.join(process.cwd(), 'certs', 'csd.cer');
    const keyPath = process.env.CSD_KEY_FILE || path.join(process.cwd(), 'certs', 'csd.key');
    const csdPassword = process.env.CSD_PASSWORD;

    if (!fs.existsSync(cerPath) || !fs.existsSync(keyPath)) {
      return res.status(400).json({
        error: 'CSD no configurado',
        message: 'Sube los archivos .cer y .key en Configuración > Perfil del Emisor'
      });
    }

    if (!csdPassword) {
      return res.status(400).json({
        error: 'Contraseña del CSD no configurada'
      });
    }

    const result = await sellarCFDI(xmlBase64, cerPath, keyPath, csdPassword);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Guardar XML firmado en disco
    const certsDir = path.join(process.cwd(), 'invoices');
    if (!fs.existsSync(certsDir)) {
      fs.mkdirSync(certsDir, { recursive: true });
    }
    const xmlFilename = `cfdi-firmado-${Date.now()}.xml`;
    const xmlPath = path.join(certsDir, xmlFilename);
    fs.writeFileSync(xmlPath, result.xmlSellado);

    res.json({
      success: true,
      xmlSellado: result.xmlSellado,
      xmlBase64: result.xmlBase64,
      sello: result.sello,
      noCertificado: result.noCertificado,
      cadenaOriginal: result.cadenaOriginal,
      filename: xmlFilename
    });
  } catch (error: any) {
    console.error('[CFDI Sign] Error:', error);
    res.status(500).json({ error: error.message || 'Error firmando CFDI' });
  }
});

app.get('/api/setup/parse-cert', async (req, res) => {
  const { filename } = req.query;
  if (!filename) {
    return res.status(400).json({ error: 'Filename required' });
  }

  const certPath = path.join(process.cwd(), 'certs', filename as string);
  if (!fs.existsSync(certPath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  try {
    const certData = fs.readFileSync(certPath);
    const forge = await import('node-forge');
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(certData));
    const cert = forge.pki.certificateFromAsn1(asn1);

    const subject = cert.subject.attributes;
    let rfc = '';
    let nombre = '';

    subject.forEach((attr: any) => {
      if (attr.shortName === 'CN') {
        nombre = attr.value || '';
      }
    });

    const issuer = cert.issuer.attributes;
    issuer.forEach((attr: any) => {
      if (attr.name === 'emailAddress' || attr.shortName === 'E') {
        const email = attr.value || '';
        const rfcMatch = email.match(/([A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3})/i);
        if (rfcMatch) rfc = rfcMatch[1].toUpperCase();
      }
    });

    res.json({
      rfc: rfc || 'No encontrado',
      nombre: nombre || 'No encontrado',
      validity: {
        from: cert.validity.notBefore.toISOString(),
        to: cert.validity.notAfter.toISOString(),
        valid: new Date() >= cert.validity.notBefore && new Date() <= cert.validity.notAfter
      },
      serialNumber: cert.serialNumber
    });
  } catch (error) {
    console.error('Error parsing cert:', error);
    res.status(500).json({ error: 'Error parsing certificate' });
  }
});

// ============ AUTH ENDPOINTS ============
const users: any[] = [
  {
    id: 'USR-DEMO-001',
    name: 'Usuario Demo',
    email: 'demo@myconta.ai',
    password: 'demo123',
    verified: true,
    googleId: undefined,
    createdAt: new Date().toISOString()
  }
];
const verificationCodes: Record<string, { code: string; expires: number }> = {};

app.post('/api/auth/signup', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ error: 'El email ya está registrado' });
  }

  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  verificationCodes[email] = {
    code: verificationCode,
    expires: Date.now() + 15 * 60 * 1000
  };

  const newUser = {
    id: `USR-${Date.now()}`,
    name,
    email,
    password,
    verified: false,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);

  console.log(`[AUTH] Verification code for ${email}: ${verificationCode}`);

  // Enviar email con código de verificación
  callGoogleScript('sendVerificationEmail', {
    email,
    nombre: name,
    codigo: verificationCode
  }).then(result => {
    console.log(`[EMAIL] Código de verificación enviado a ${email}:`, result?.data || result);
  }).catch(error => {
    console.log(`[EMAIL] Error enviando código de verificación (no crítico): ${error.message}`);
  });

  // Registrar usuario en Google Sheets (datasheet)
  callGoogleScript('createUser', {
    userId: newUser.id,
    email: email,
    name: name,
    googleId: '',
    driveFolderId: '',
    driveFolderUrl: '',
    password: password
  }).then(result => {
    console.log(`[DATASHEET] Usuario ${name} registrado en Google Sheets:`, result?.data || result);
  }).catch(error => {
    console.log(`[DATASHEET] Error registrando usuario (no crítico): ${error.message}`);
  });

  // Crear carpeta de usuario en Google Drive (incluye carpeta "Documentos OCR")
  callGoogleScript('createUserFolder', {
    userId: newUser.id,
    userName: name,
    email: email
  }).then(folderResult => {
    console.log(`[DRIVE] Carpeta creada para usuario ${name}:`, folderResult?.data);
    // Actualizar el usuario con los datos del folder creado
    if (folderResult?.data) {
      newUser.driveFolderId = folderResult.data.userFolderId || '';
      newUser.driveFolderUrl = folderResult.data.userFolderUrl || '';

      // Actualizar en Google Sheets con los IDs de Drive
      callGoogleScript('updateUser', {
        email: email,
        driveFolderId: newUser.driveFolderId,
        driveFolderUrl: newUser.driveFolderUrl
      }).then(() => {
        console.log(`[DATASHEET] Usuario actualizado con Drive Folder ID`);
      }).catch(err => {
        console.log(`[DATASHEET] Error actualizando Drive Folder ID: ${err.message}`);
      });
    }
  }).catch(error => {
    console.log(`[DRIVE] Error creando carpeta (no crítico): ${error.message}`);
  });

  res.json({
    success: true,
    verificationCode,
    message: 'Usuario registrado. Se ha enviado un código de verificación.'
  });
});

app.post('/api/auth/verify', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email y código son requeridos' });
  }

  const verification = verificationCodes[email];
  if (!verification) {
    return res.status(400).json({ error: 'Código no encontrado. Solicita uno nuevo.' });
  }

  if (Date.now() > verification.expires) {
    delete verificationCodes[email];
    return res.status(400).json({ error: 'El código ha expirado. Solicita uno nuevo.' });
  }

  if (verification.code !== code) {
    return res.status(400).json({ error: 'Código incorrecto' });
  }

  const user = users.find(u => u.email === email);
  if (user) {
    user.verified = true;

    // Actualizar en Google Sheets con verified = true y Drive Folder IDs si existen
    try {
      const updateData: any = {
        email: email,
        verified: 'true'
      };

      if (user.driveFolderId) {
        updateData.driveFolderId = user.driveFolderId;
      }
      if (user.driveFolderUrl) {
        updateData.driveFolderUrl = user.driveFolderUrl;
      }

      await callGoogleScript('updateUser', updateData);
      console.log(`[DATASHEET] Usuario ${email} verificado y actualizado en Google Sheets`);
    } catch (error) {
      console.log(`[DATASHEET] Error actualizando usuario verificado (no crítico): ${error.message}`);
    }
  }

  delete verificationCodes[email];

  res.json({ success: true, message: 'Email verificado exitosamente' });
});

app.post('/api/auth/resend-verification', async (req, res) => {
  const { email, name } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email es requerido' });
  }

  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  if (user.verified) {
    return res.json({ success: true, message: 'El usuario ya está verificado' });
  }

  // Generar nuevo código de verificación
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  verificationCodes[email] = {
    code: verificationCode,
    expires: Date.now() + 15 * 60 * 1000
  };

  console.log(`[VERIFICATION] Nuevo código para ${email}: ${verificationCode}`);

  // Enviar email con código de verificación
  callGoogleScript('sendVerificationEmail', {
    email,
    nombre: name || user.name,
    codigo: verificationCode
  }).then(result => {
    console.log(`[EMAIL] Nuevo código de verificación enviado a ${email}:`, result?.data || result);
  }).catch(error => {
    console.log(`[EMAIL] Error enviando código (no crítico): ${error.message}`);
  });

  res.json({
    success: true,
    verificationCode, // Para debug, remover en producción
    message: 'Código de verificación reenviado'
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  let user = users.find(u => u.email === email);

  // Si no existe en memoria, buscar en Google Sheets
  if (!user) {
    try {
      const gsResult = await callGoogleScript('getUser', { email });
      if (gsResult?.data) {
        const d = gsResult.data;
        user = {
          id: d.UserID || d.userId || `USR-${Date.now()}`,
          name: d.Nombre || d.nombre || email.split('@')[0],
          email,
          password: d.Password || d.password || '',
          verified: true, // Usuarios de Sheets se consideran verificados
          googleId: d.GoogleID || d.googleId || '',
          driveFolderId: d.DriveFolderID || d.driveFolderId || '',
          driveFolderUrl: d.DriveFolderUrl || d.driveFolderUrl || '',
          createdAt: d.FechaRegistro || d.fechaAlta || new Date().toISOString()
        };
        users.push(user);
        console.log(`[AUTH] Usuario recuperado desde Google Sheets: ${email}`);
      }
    } catch (error) {
      console.error(`[LOGIN] Error buscando en Sheets:`, error.message);
    }
  }

  // Si el usuario sigue sin existir, crearlo automáticamente con verificación
  if (!user) {
    console.log(`[LOGIN] Usuario no encontrado, creando cuenta automáticamente para: ${email}`);

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes[email] = {
      code: verificationCode,
      expires: Date.now() + 15 * 60 * 1000
    };

    const newUser = {
      id: `USR-${Date.now()}`,
      name: email.split('@')[0],
      email,
      password,
      verified: false,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);

    console.log(`[LOGIN] Verification code for ${email}: ${verificationCode}`);

    // Enviar código de verificación por email
    callGoogleScript('sendVerificationEmail', {
      email,
      nombre: newUser.name,
      codigo: verificationCode
    }).then(result => {
      console.log(`[EMAIL] Código de verificación enviado a ${email}:`, result?.data || result);
    }).catch(error => {
      console.log(`[EMAIL] Error enviando código (no crítico): ${error.message}`);
    });

    // Crear folder y subfolders en Drive
    callGoogleScript('createUserFolder', {
      userId: newUser.id,
      userName: newUser.name,
      email: email
    }).then(folderResult => {
      console.log(`[DRIVE] Carpeta creada para nuevo usuario desde login:`, folderResult?.data);
      if (folderResult?.data) {
        newUser.driveFolderId = folderResult.data.userFolderId || '';
        newUser.driveFolderUrl = folderResult.data.userFolderUrl || '';

        // Actualizar en Google Sheets con los IDs de Drive
        callGoogleScript('updateUser', {
          email: email,
          driveFolderId: newUser.driveFolderId,
          driveFolderUrl: newUser.driveFolderUrl
        }).then(() => {
          console.log(`[DATASHEET] Usuario actualizado con Drive Folder ID`);
        }).catch(err => {
          console.log(`[DATASHEET] Error actualizando Drive Folder ID: ${err.message}`);
        });
      }
    }).catch(error => {
      console.log(`[DRIVE] Error creando carpeta (no crítico): ${error.message}`);
    });

    // Registrar en Google Sheets con TODOS los datos necesarios
    callGoogleScript('createUser', {
      userId: newUser.id,
      email: email,
      name: newUser.name,
      googleId: '',
      driveFolderId: '',
      driveFolderUrl: '',
      password: password
    }).then(result => {
      console.log(`[SHEETS] Usuario auto-creado registrado:`, result?.data || result);
    }).catch(error => {
      console.log(`[SHEETS] Error registrando usuario (no crítico): ${error.message}`);
    });

    // Devolver señal de que necesita verificación
    return res.json({
      success: true,
      needsVerification: true,
      verificationCode, // Para debug, remover en producción
      user: { id: newUser.id, name: newUser.name, email: newUser.email },
      message: 'Usuario creado automáticamente. Por favor verifica tu email.'
    });
  }

  // Verificar credenciales para usuarios existentes
  if (user.password !== password) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  if (!user.verified) {
    return res.status(401).json({
      error: 'Email no verificado',
      needsVerification: true,
      user: { id: user.id, name: user.name, email: user.email }
    });
  }

  // Usuario existente y verificado: login normal
  res.json({
    success: true,
    user: { id: user.id, name: user.name, email: user.email }
  });
});

app.post('/api/auth/google-signup', async (req, res) => {
  const { email, name, googleToken } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: 'Email y nombre son requeridos' });
  }

  let user = users.find(u => u.email === email);
  let isNewUser = false;

  if (!user) {
    // Generar password automático
    const autoPassword = generateAutoPassword();

    user = {
      id: `USR-${Date.now()}`,
      name,
      email,
      password: autoPassword,
      verified: true,
      googleId: googleToken ? `google_${Date.now()}` : undefined,
      createdAt: new Date().toISOString()
    };
    users.push(user);
    isNewUser = true;
    console.log(`[AUTH] New Google user registered: ${email} (password auto-generado)`);
  } else {
    console.log(`[AUTH] Google user logged in: ${email}`);
  }

  if (isNewUser) {
    try {
      console.log(`[DRIVE] Creando carpeta de usuario en Google Drive para: ${name}`);
      const folderResult = await callGoogleScript('createUserFolder', {
        userId: user.id,
        userName: name,
        email: email
      });
      console.log(`[DRIVE] Carpeta creada exitosamente:`, folderResult);

      const folderData = folderResult.data || folderResult;
      user.driveFolderId = folderData.userFolderId;
      user.driveFolderUrl = folderData.userFolderUrl;

      console.log(`[SHEETS] Creando/actualizando usuario en Google Sheets para: ${email}`);

      const createResult = await callGoogleScript('createUser', {
        userId: user.id,
        email: email,
        name: name,
        googleId: user.googleId || '',
        driveFolderId: user.driveFolderId || '',
        driveFolderUrl: user.driveFolderUrl || '',
        password: autoPassword
      });

      if (createResult.data?.existing) {
        console.log(`[SHEETS] Usuario ya existe, actualizando DriveFolder...`);
        await callGoogleScript('updateUser', {
          email: email,
          googleId: user.googleId || '',
          driveFolderId: user.driveFolderId || '',
          driveFolderUrl: user.driveFolderUrl || '',
          nombre: name,
          password: autoPassword
        });
      }
    } catch (error) {
      console.error(`[GOOGLE SIGNUP] Error:`, error.message);
    }

    res.json({
      success: true,
      isNewUser: true,
      autoPassword: autoPassword,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } else {
    res.json({
      success: true,
      isNewUser: false,
      user: { id: user.id, name: user.name, email: user.email }
    });
  }
});

// Google Login: verifica si el usuario existe y lo devuelve (crea folders si faltan)
app.post('/api/auth/google-login', async (req, res) => {
  const { email, name, googleToken } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: 'Email y nombre son requeridos' });
  }

  let user = users.find(u => u.email === email);
  let isNewUser = false;
  let autoPassword = '';

  // Si no existe en memoria, buscar en Google Sheets
  if (!user) {
    try {
      const gsResult = await callGoogleScript('getUser', { email });
      if (gsResult?.data) {
        const d = gsResult.data;
        user = {
          id: d.UserID || d.userId || `USR-${Date.now()}`,
          name: d.Nombre || d.nombre || name,
          email,
          password: d.Password || d.password || '',
          verified: true,
          googleId: d.GoogleID || d.googleId || `google_${Date.now()}`,
          driveFolderId: d.DriveFolderID || d.driveFolderId || '',
          driveFolderUrl: d.DriveFolderUrl || d.driveFolderUrl || '',
          createdAt: d.FechaRegistro || d.fechaAlta || new Date().toISOString()
        };
        users.push(user);
        console.log(`[AUTH] Usuario recuperado desde Google Sheets: ${email}`);
      }
    } catch (error) {
      console.error(`[GOOGLE LOGIN] Error buscando en Sheets:`, error.message);
    }
  }

  // Si sigue sin existir, crearlo como usuario nuevo completo
  if (!user) {
    autoPassword = generateAutoPassword();
    isNewUser = true;

    user = {
      id: `USR-${Date.now()}`,
      name,
      email,
      password: autoPassword,
      verified: true,
      googleId: `google_${Date.now()}`,
      driveFolderId: '',
      driveFolderUrl: '',
      createdAt: new Date().toISOString()
    };
    users.push(user);

    console.log(`[GOOGLE LOGIN] Usuario nuevo, creando carpeta en Drive...`);
    try {
      const folderResult = await callGoogleScript('createUserFolder', {
        userId: user.id,
        userName: name,
        email: email
      });
      if (folderResult?.data) {
        user.driveFolderId = folderResult.data.userFolderId || '';
        user.driveFolderUrl = folderResult.data.userFolderUrl || '';
      }

      await callGoogleScript('createUser', {
        userId: user.id,
        email,
        name,
        googleId: user.googleId,
        driveFolderId: user.driveFolderId,
        driveFolderUrl: user.driveFolderUrl,
        password: autoPassword
      });
      console.log(`[GOOGLE LOGIN] Usuario creado con carpeta: ${email}`);
    } catch (error) {
      console.error(`[GOOGLE LOGIN] Error creando usuario:`, error.message);
    }

    return res.json({
      success: true,
      isNewUser: true,
      autoPassword: autoPassword,
      user: { id: user.id, name: user.name, email: user.email }
    });
  }

  // Usuario existente: verificar si tiene carpeta, si no, crearla
  if (!user.driveFolderId || user.driveFolderId === '') {
    console.log(`[GOOGLE LOGIN] Usuario ${email} sin carpeta, creando...`);
    try {
      const folderResult = await callGoogleScript('createUserFolder', {
        userId: user.id,
        userName: user.name,
        email: email
      });
      if (folderResult?.data) {
        user.driveFolderId = folderResult.data.userFolderId || '';
        user.driveFolderUrl = folderResult.data.userFolderUrl || '';
      }

      // Actualizar en Google Sheets
      await callGoogleScript('updateUser', {
        email: email,
        driveFolderId: user.driveFolderId,
        driveFolderUrl: user.driveFolderUrl
      });
      console.log(`[GOOGLE LOGIN] Carpeta creada para usuario existente: ${email}`);
    } catch (error) {
      console.error(`[GOOGLE LOGIN] Error creando carpeta:`, error.message);
    }
  }

  return res.json({
    success: true,
    isNewUser: false,
    user: { id: user.id, name: user.name, email: user.email }
  });
});

// ============ EMAIL ENDPOINTS ============

app.post('/api/email/welcome', async (req, res) => {
  const { email, name } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email es requerido' });
  }

  console.log(`[Email] Enviando email de bienvenida a: ${email}`);

  const result = await callGoogleScript('sendWelcomeEmail', {
    email,
    nombre: name || 'Usuario',
    tipo: 'bienvenida'
  });

  if (result.success) {
    res.json({ success: true, message: 'Email de bienvenida enviado' });
  } else {
    console.log(`[Email] Error enviando email (no crítico): ${result.error}`);
    res.json({ success: true, message: 'Email de bienvenida en cola', warning: result.error });
  }
});

app.post('/api/email/invoice', async (req, res) => {
  const { email, nombre, folio, serie, total, receptor, fecha } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email es requerido' });
  }

  console.log(`[Email] Enviando notificación de factura a: ${email}`);

  const result = await callGoogleScript('sendWelcomeEmail', {
    email,
    nombre: nombre || 'Cliente',
    tipo: 'factura',
    folio,
    serie,
    total,
    receptor,
    fecha
  });

  if (result.success) {
    res.json({ success: true, message: 'Email de factura enviado' });
  } else {
    console.log(`[Email] Error enviando email de factura: ${result.error}`);
    res.json({ success: true, message: 'Notificación en cola', warning: result.error });
  }
});

app.get('/api/email/test', async (_req, res) => {
  const result = await callGoogleScript('testGmail');
  res.json(result);
});

// ============ HEALTH CHECK ============
app.get('/api/health', async (_req, res) => {
  let ollamaStatus = { available: false, error: 'Not checked' };

  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      ollamaStatus = { available: true, error: null };
    } else {
      ollamaStatus = { available: false, error: `Status: ${response.status}` };
    }
  } catch (error: any) {
    ollamaStatus = { available: false, error: error.message };
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ollama: {
      host: OLLAMA_HOST,
      model: OLLAMA_MODEL,
      ...ollamaStatus
    },
    googleScriptConfigured: !!GOOGLE_SCRIPT_URL,
    stats: {
      clients: clients.length,
      products: products.length,
      invoices: invoices.length
    }
  });
});

// ============ PAC CONFIGURATION ============
interface PACConfig {
  provider: string;
  mode: 'sandbox' | 'production';
  user: string;
  password: string;
  rfcEmisor: string;
  cerPath: string;
  keyPath: string;
  csdPassword: string;
}

let pacConfig: PACConfig | null = null;

const PAC_ENDPOINTS = {
  sandbox: 'https://testing.solucionfactible.com/ws/services/Timbrado',
  production: 'https://solucionfactible.com/ws/services/Timbrado'
};

const SOAP_NAMESPACE = 'http://timbrado.ws.cfdi.solucionfactible.com';

async function timbrarConPAC(xmlBase64: string): Promise<any> {
  if (!pacConfig || !pacConfig.user || !pacConfig.password) {
    throw new Error('Configuración PAC no encontrada. Configura tu PAC en Settings.');
  }

  const endpoint = PAC_ENDPOINTS[pacConfig.mode];

  // LIMPIEZA DE BASE64: Eliminar saltos de línea y caracteres invisibles
  const cleanXmlBase64 = xmlBase64.replace(/\r?\n|\r/g, '').trim();

  console.log('[PAC Timbrado] Endpoint:', endpoint);
  console.log('[PAC Timbrado] Usuario:', pacConfig.user);
  console.log('[PAC Timbrado] XML Base64 length:', cleanXmlBase64.length);
  console.log('[PAC Timbrado] XML Base64 (primeros 100 chars):', cleanXmlBase64.substring(0, 100));

  const soapRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="${SOAP_NAMESPACE}">
  <soapenv:Header/>
  <soapenv:Body>
    <ws:timbrar>
      <ws:usuario>${pacConfig.user}</ws:usuario>
      <ws:password>${pacConfig.password}</ws:password>
      <ws:cfdiBase64>${cleanXmlBase64}</ws:cfdiBase64>
    </ws:timbrar>
  </soapenv:Body>
</soapenv:Envelope>`;

  try {
    console.log('[PAC Timbrado] Enviando request SOAP...');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': ''
      },
      body: soapRequest
    });

    console.log('[PAC Timbrado] Response status:', response.status, response.statusText);
    const responseText = await response.text();
    console.log('[PAC Timbrado] Response body:', responseText.substring(0, 500) + '...');

    const uuidMatch = responseText.match(/<uuid>([^<]+)<\/uuid>/i);
    const xmlTimbradoMatch = responseText.match(/<xmlTimbrado>([^<]+)<\/xmlTimbrado>/i);
    const fechaTimbradoMatch = responseText.match(/<fechaTimbrado>([^<]+)<\/fechaTimbrado>/i);
    const statusMatch = responseText.match(/<status>([^<]+)<\/status>/i);
    const mensajeMatch = responseText.match(/<mensaje>([^<]+)<\/mensaje>/i);

    if (uuidMatch && uuidMatch[1]) {
      return {
        success: true,
        uuid: uuidMatch[1],
        xmlTimbrado: xmlTimbradoMatch ? xmlTimbradoMatch[1] : '',
        fechaTimbrado: fechaTimbradoMatch ? fechaTimbradoMatch[1] : new Date().toISOString(),
        status: statusMatch ? statusMatch[1] : '200',
        mensaje: mensajeMatch ? mensajeMatch[1] : 'Timbrado exitoso'
      };
    } else {
      // Extraer faultstring si existe
      const faultMatch = responseText.match(/<faultstring>([^<]+)<\/faultstring>/i);
      const faultString = faultMatch ? faultMatch[1] : 'Error desconocido';

      console.error('[PAC Timbrado] Error en respuesta:', faultString);

      return {
        success: false,
        uuid: null,
        xmlTimbrado: null,
        fechaTimbrado: null,
        status: '500',
        mensaje: faultString,
        rawResponse: responseText.substring(0, 1000)
      };
    }
  } catch (error: any) {
    console.error('[PAC Timbrado] Error de conexión:', error);
    return {
      success: false,
      uuid: null,
      xmlTimbrado: null,
      fechaTimbrado: null,
      status: '500',
      mensaje: error.message || 'Error de conexión con PAC',
      details: error.toString()
    };
  }
}

async function cancelarConPAC(uuid: string, rfcEmisor: string): Promise<any> {
  if (!pacConfig || !pacConfig.user || !pacConfig.password) {
    throw new Error('Configuración PAC no encontrada');
  }

  const endpoint = PAC_ENDPOINTS[pacConfig.mode];

  const soapRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="${SOAP_NAMESPACE}">
  <soapenv:Header/>
  <soapenv:Body>
    <ws:cancelar>
      <ws:usuario>${pacConfig.user}</ws:usuario>
      <ws:password>${pacConfig.password}</ws:password>
      <ws:uuids>${uuid}</ws:uuids>
      <ws:rfcEmisor>${rfcEmisor}</ws:rfcEmisor>
    </ws:cancelar>
  </soapenv:Body>
</soapenv:Envelope>`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': ''
      },
      body: soapRequest
    });

    const responseText = await response.text();

    const folioMatch = responseText.match(/<folio>([^<]+)<\/folio>/i);
    const estatusMatch = responseText.match(/<estatusUUID>([^<]+)<\/estatusUUID>/i);
    const statusMatch = responseText.match(/<status>([^<]+)<\/status>/i);

    if (folioMatch && folioMatch[1] === uuid) {
      return {
        success: true,
        uuid: uuid,
        estatus: estatusMatch ? estatusMatch[1] : 'Cancelado',
        status: statusMatch ? statusMatch[1] : '200',
        mensaje: 'Cancelación exitosa'
      };
    } else {
      return {
        success: false,
        uuid: uuid,
        estatus: null,
        status: '500',
        mensaje: 'Error al cancelar'
      };
    }
  } catch (error: any) {
    return {
      success: false,
      uuid: uuid,
      estatus: null,
      status: '500',
      mensaje: error.message || 'Error de conexión con PAC'
    };
  }
}

app.get('/api/pac/config', (req, res) => {
  if (!pacConfig) {
    return res.json({ configured: false });
  }
  return res.json({
    configured: true,
    provider: pacConfig.provider,
    mode: pacConfig.mode,
    user: pacConfig.user,
    rfcEmisor: pacConfig.rfcEmisor
  });
});

app.post('/api/pac/config', (req, res) => {
  const { provider, mode, user, password, rfcEmisor, cerPath, keyPath, csdPassword } = req.body;

  if (!provider || !mode || !user || !password) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  pacConfig = {
    provider,
    mode,
    user,
    password,
    rfcEmisor: rfcEmisor || '',
    cerPath: cerPath || '',
    keyPath: keyPath || '',
    csdPassword: csdPassword || ''
  };

  res.json({ success: true, message: 'Configuración PAC guardada' });
});

app.post('/api/pac/test', async (req, res) => {
  const { user, password, mode } = req.body;

  if (!user || !password) {
    return res.status(400).json({ error: 'Usuario y password son requeridos' });
  }

  const endpoint = PAC_ENDPOINTS[mode || 'sandbox'];
  console.log('[PAC Test] Probando conexión:', endpoint, 'usuario:', user);

  const soapRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="${SOAP_NAMESPACE}">
  <soapenv:Header/>
  <soapenv:Body>
    <ws:timbrar>
      <ws:usuario>${user}</ws:usuario>
      <ws:password>${password}</ws:password>
      <ws:cfdiBase64>PCFET0NUWVBFIHN2YyxyPjxjZnYyOENGRiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9jZmQvMy4wIiBWZXJzaW9uPSIzLjAjIj48a2luZiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9jZmQvMy4wIiB0ZXN0PSIxIj48Q0ZGSSBTZXJpZU49IjEyMzQ1Njc4OTAiPjxFbWlzb3IgUlBDPSIxMjM0NTY3ODkwIiBOb21icmVuPSJURVNUIj48UmVjaXBpZW50ZSBSUEM9IlRFU1QyMCIgTm9tYnJlPSJURVNUIj48Q29uY2VwdG8gQ3VyclRyYW5zZmVyZW50ZT0iMCIgRGlzY3VlbnRhPSIxMDAiIElVU09SPSIxLjIiPjxJbXB1ZXN0bz48SW1wSW1wbnQ+DQogIDxEaW1wdG9SZWY+TjA8L0RpbXB0b1JlZj4NCiAgPENhbnRpZGFkPkhvbGEgQ2FudGlkYWQ8L0NhbnRpZGFkPg0KICA8TW9uZWRhUj4xMi40PC9Nb25lZGFSPg0KICA8VG90YWw+MTIuNDwvVG90YWw+DQogIDxNZXRpb2RvVHJhbnNmZXJlbnRlPlllczwvTWV0b2RvVHJhbnNmZXJlbnRlPg0KICA8VGllem9SZWY+MzwvVGllem9SZWY+DQogIDxJbXB1ZXN0bz4NCiAgPC9JbXB1ZXN0bz4NCjwvQ29uY2VwdG8+PC9SZWNpcGllbnRlPjxFbWlzb3IgUlBDPSIxMjM0NTY3ODkwIj48Q29uY2VwdG8gQ3VyclRyYW5zZmVyZW50ZT0iMCIgRGlzY3VlbnRhPSIxMDAiIElVU09SPSIxLjIiPjxJbXB1ZXN0bz48SW1wSW1wbnQ+DQogIDxEaW1wdG9SZWY+TjA8L0RpbXB0b1JlZj4NCiAgPENhbnRpZGFkPkhvbGEgQ2FudGlkYWQ8L0NhbnRpZGFkPg0KICA8TW9uZWRhUj4xMi40PC9Nb25lZGFSPg0KICA8VG90YWw+MTIuNDwvVG90YWw+DQogIDxNZXRpb2RvVHJhbnNmZXJlbnRlPlllczwvTWV0b2RvVHJhbnNmZXJlbnRlPg0KICA8VGllem9SZWY+MzwvVGllem9SZWY+DQogIDxJbXB1ZXN0bz4NCiAgPC9JbXB1ZXN0bz4NCjwvQ29uY2VwdG8+PC9FbWlzb3I+PFRyYW5zZmVyZW5jaWEgVHlwZUNmZGlDbGllbnRlPSJQdWFnbyIgUGFnbz0iMDAwMCIgRm9ybWFDdWwwMT0iMTIgMjQgMjAyNSI+DQo8L1RyYW5zZmVyZW5jaWE+PC9LRU5GPjwvQ0ZGST48L0tJTkY+PC9DRkZSPg==</ws:cfdiBase64>
    </ws:timbrar>
  </soapenv:Body>
</soapenv:Envelope>`;

  try {
    console.log('[PAC Test] Enviando request SOAP...');
    console.log('[PAC Test] Endpoint:', endpoint);
    console.log('[PAC Test] SOAP request preview:', soapRequest.substring(0, 300) + '...');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': ''
      },
      body: soapRequest,
      // Agregar timeout
      signal: AbortSignal.timeout(30000)
    });

    console.log('[PAC Test] Response status:', response.status, response.statusText);
    const responseText = await response.text();
    console.log('[PAC Test] Response body:', responseText);

    if (responseText.includes('<uuid>')) {
      return res.json({
        success: true,
        message: 'Conexión exitosa con PAC',
        mode: mode || 'sandbox'
      });
    } else if (responseText.includes('uuid') === false && responseText.includes('faultstring')) {
      const faultMatch = responseText.match(/<faultstring>([^<]+)<\/faultstring>/i);
      return res.json({
        success: false,
        message: faultMatch ? faultMatch[1] : 'Credenciales inválidas',
        mode: mode || 'sandbox'
      });
    } else if (responseText.includes('status')) {
      const statusMatch = responseText.match(/<status>([^<]+)<\/status>/i);
      const mensajeMatch = responseText.match(/<mensaje>([^<]+)<\/mensaje>/i);
      if (statusMatch && statusMatch[1] !== '200') {
        return res.json({
          success: false,
          message: mensajeMatch ? mensajeMatch[1] : 'Error en timbrado',
          mode: mode || 'sandbox'
        });
      }
    } else {
      return res.json({
        success: false,
        message: 'Error en la conexión - respuesta inesperada',
        mode: mode || 'sandbox',
        rawResponse: responseText.substring(0, 500)
      });
    }
  } catch (error: any) {
    console.error('[PAC Test] Error:', error);
    console.error('[PAC Test] Error name:', error.name);
    console.error('[PAC Test] Error message:', error.message);
    console.error('[PAC Test] Error stack:', error.stack);
    return res.json({
      success: false,
      message: error.message || 'Error de conexión',
      details: error.toString(),
      name: error.name
    });
  }
});

// ============ TIMBRADO CON SELLADO AUTOMÁTICO ============
/**
 * Endpoint principal de timbrado con sellado automático
 * Recibe XML sin sello, lo sella, y lo envía al PAC
 */
app.post('/api/pac/timbrar', async (req, res) => {
  const { xmlBase64, autoSell = true } = req.body;

  if (!xmlBase64) {
    return res.status(400).json({ error: 'XML en Base64 es requerido' });
  }

  if (!pacConfig) {
    return res.status(400).json({ error: 'PAC no configurado. Configura en Settings.' });
  }

  try {
    let xmlParaTimbrar = xmlBase64;

    // Si autoSell está activado, sellar el XML primero
    if (autoSell) {
      console.log('[Timbrado] Sellado automático activado...');

      // Rutas de CSD (ajustar según configuración del usuario)
      const cerPath = process.env.CSD_CER_FILE || path.join(process.cwd(), 'certs', 'csd.cer');
      const keyPath = process.env.CSD_KEY_FILE || path.join(process.cwd(), 'certs', 'csd.key');
      const csdPassword = process.env.CSD_PASSWORD;

      // Verificar que existe el CSD
      if (!fs.existsSync(cerPath) || !fs.existsSync(keyPath)) {
        return res.status(400).json({
          success: false,
          mensaje: 'CSD no configurado. Sube los archivos .cer y .key en Configuración.',
          autoSell: false,
          hint: 'Puedes enviar autoSell=false para timbrar XML ya sellado'
        });
      }

      if (!csdPassword) {
        return res.status(400).json({
          success: false,
          mensaje: 'Contraseña del CSD no configurada.'
        });
      }

      // Sellar el CFDI
      const selladoResult = await sellarCFDI(xmlBase64, cerPath, keyPath, csdPassword);

      if (!selladoResult.success) {
        return res.status(400).json({
          success: false,
          mensaje: 'Error al sellar CFDI: ' + selladoResult.error
        });
      }

      console.log('[Timbrado] CFDI sellado exitosamente');
      console.log('[Timbrado] No. Certificado:', selladoResult.noCertificado);
      console.log('[Timbrado] Sello:', selladoResult.sello?.substring(0, 50) + '...');

      xmlParaTimbrar = selladoResult.xmlSellado!;
    }

    // Enviar al PAC
    const result = await timbrarConPAC(xmlParaTimbrar);
    return res.json(result);
  } catch (error: any) {
    console.error('[Timbrado] Error:', error);
    return res.status(500).json({
      success: false,
      mensaje: error.message || 'Error al timbrar'
    });
  }
});

// ============ TIMBRADO SIMPLIFICADO (JSON → PAC arma XML) ============
/**
 * Endpoint alternativo donde envías los datos en JSON y el PAC genera el XML
 * Esto es más fácil pero requiere confiar los datos al PAC
 */
app.post('/api/pac/timbrar-json', async (req, res) => {
  const {
    rfcEmisor,
    nombreEmisor,
    regimenFiscalEmisor,
    rfcReceptor,
    nombreReceptor,
    regimenFiscalReceptor,
    usoCFDI,
    formaPago,
    metodoPago,
    moneda,
    tipoComprobante,
    lugarExpedicion,
    conceptos
  } = req.body;

  // Validaciones mínimas
  if (!rfcEmisor || !rfcReceptor || !conceptos || conceptos.length === 0) {
    return res.status(400).json({
      success: false,
      mensaje: 'Faltan datos requeridos (RFC emisor, RFC receptor, conceptos)'
    });
  }

  if (!pacConfig) {
    return res.status(400).json({
      success: false,
      mensaje: 'PAC no configurado. Configura en Settings.'
    });
  }

  try {
    // Generar XML básico (sin sello)
    const xmlGenerator = await import('./src/lib/xml-generator');
    const xmlSinSello = await xmlGenerator.generarCFDI({
      emisor: {
        rfc: rfcEmisor,
        nombre: nombreEmisor,
        regimenFiscal: regimenFiscalEmisor
      },
      receptor: {
        rfc: rfcReceptor,
        nombre: nombreReceptor,
        regimenFiscal: regimenFiscalReceptor,
        usoCFDI: usoCFDI,
        domicilioFiscalReceptor: lugarExpedicion
      },
      conceptos,
      formaPago,
      metodoPago,
      moneda,
      tipoComprobante,
      lugarExpedicion
    });

    // Convertir a base64
    const xmlBase64 = Buffer.from(xmlSinSello, 'utf-8').toString('base64');

    // Enviar al PAC
    const result = await timbrarConPAC(xmlBase64);

    if (result.success) {
      return res.json({
        success: true,
        uuid: result.uuid,
        xmlTimbrado: result.xmlTimbrado,
        fechaTimbrado: result.fechaTimbrado,
        selloDigital: result.sello,
        mensaje: 'Factura timbrada exitosamente'
      });
    } else {
      return res.json({
        success: false,
        mensaje: result.mensaje || 'Error al timbrar'
      });
    }

  } catch (error: any) {
    console.error('[Timbrado JSON] Error:', error);
    return res.status(500).json({
      success: false,
      mensaje: error.message || 'Error al procesar timbrado'
    });
  }
});

app.post('/api/pac/cancelar', async (req, res) => {
  const { uuid } = req.body;

  if (!uuid) {
    return res.status(400).json({ error: 'UUID es requerido' });
  }

  if (!pacConfig) {
    return res.status(400).json({ error: 'PAC no configurado. Configura en Settings.' });
  }

  try {
    const rfcEmisor = pacConfig.rfcEmisor || companyData.rfc;
    const result = await cancelarConPAC(uuid, rfcEmisor);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      mensaje: error.message || 'Error al cancelar'
    });
  }
});

// ============ SAT RFC LOOKUP ============
const SAT_MOCK_DATA: Record<string, any> = {
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
  },
  'GUGO781110E30': {
    rfc: 'GUGO781110E30',
    nombre: 'GUSTAVO HERNANDEZ GOMEZ',
    estado: 'Ciudad de México',
    municipio: 'Iztapalapa',
    cp: '09400',
    colonia: 'Lomas de San Lorenzo',
    calle: 'Calle Principal',
    numeroExt: '123',
    numeroInt: 'A',
    regimenFiscal: '612 - Personas Físicas con Actividad Empresarial',
    situacion: 'Activo'
  },
  'ABC123456T1': {
    rfc: 'ABC123456T1',
    nombre: 'MI EMPRESA S.A. DE C.V.',
    estado: 'Ciudad de México',
    municipio: 'Cuauhtémoc',
    cp: '06600',
    colonia: 'Centro',
    calle: 'Av. Insurgentes',
    numeroExt: '100',
    numeroInt: '',
    regimenFiscal: '601 - General de Ley Personas Morales',
    situacion: 'Activo'
  },
  'PEGA800101H1': {
    rfc: 'PEGA800101H1',
    nombre: 'JUAN PEREZ GARCIA',
    estado: 'Ciudad de México',
    municipio: 'Benito Juarez',
    cp: '03100',
    colonia: 'Del Valle',
    calle: 'Av. Coyoacan',
    numeroExt: '456',
    numeroInt: 'B',
    regimenFiscal: '612 - Personas Físicas con Actividad Empresarial',
    situacion: 'Activo'
  },
  'GUIM980220L20': {
    rfc: 'GUIM980220L20',
    nombre: 'ODIN GUEVARA GUERRERO',
    estado: 'Ciudad de México',
    municipio: 'Iztapalapa',
    cp: '09420',
    colonia: 'San Lorenzo',
    calle: 'Av. Javier Rojo Gomez',
    numeroExt: '1234',
    numeroInt: '',
    regimenFiscal: '612 - Personas Físicas con Actividad Empresarial',
    situacion: 'Activo'
  }
};

async function consultaSATReal(rfc: string): Promise<any> {
  const SAT_API_URL = process.env.SAT_API_URL;
  const SAT_API_KEY = process.env.SAT_API_KEY;

  if (!SAT_API_URL || !SAT_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(`${SAT_API_URL}/rfc/${rfc}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SAT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      return {
        rfc: data.rfc || rfc,
        nombre: data.nombre || data.razon_social || '',
        estado: data.estado || '',
        municipio: data.municipio || '',
        cp: data.cp || data.codigo_postal || '',
        colonia: data.colonia || data.localidad || '',
        calle: data.calle || '',
        numeroExt: data.numero_exterior || '',
        numeroInt: data.numero_interior || '',
        regimenFiscal: data.regimen_fiscal || '',
        situacion: data.situacion || data.status || 'Activo'
      };
    }
  } catch (error) {
    console.error('Error consultando SAT:', error);
  }

  return null;
}

app.get('/api/sat-lookup', async (req, res) => {
  const { rfc } = req.query;

  if (!rfc || typeof rfc !== 'string') {
    return res.status(400).json({ error: 'RFC requerido' });
  }

  const rfcLimpio = rfc.toUpperCase().replace(/[^A-Z0-9]/g, '');

  const satData = await consultaSATReal(rfcLimpio);
  if (satData) {
    return res.json(satData);
  }

  if (SAT_MOCK_DATA[rfcLimpio]) {
    return res.json(SAT_MOCK_DATA[rfcLimpio]);
  }

  const rfcMatch = rfcLimpio.match(/^([A-Z&Ñ]{3,4})([0-9]{6})([A-Z0-9]{3})$/);
  if (rfcMatch) {
    const esPersonaFisica = rfcLimpio.length === 13;
    return res.json({
      rfc: rfcLimpio,
      nombre: esPersonaFisica ? 'CONTRIBUYENTE PERSONA FÍSICA' : 'CONTRIBUYENTE PERSONA MORAL',
      estado: 'México',
      municipio: '',
      cp: '',
      colonia: '',
      calle: '',
      regimenFiscal: esPersonaFisica ? '612 - Personas Físicas con Actividad Empresarial' : '601 - General de Ley Personas Morales',
      situacion: 'Activo'
    });
  }

  return res.json({ error: 'RFC no encontrado', rfc: rfcLimpio });
});

// ============ PDF GENERATION ============
app.post('/api/invoices/generate-pdf', async (req, res) => {
  try {
    const invoice = req.body;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #333; padding: 20px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .company-info h1 { font-size: 18px; color: #1a365d; }
        .company-info p { font-size: 10px; color: #666; }
        .invoice-title { text-align: right; }
        .invoice-title h2 { font-size: 24px; color: #1a365d; }
        .invoice-title p { font-size: 10px; color: #666; }
        .invoice-details { display: flex; justify-content: space-between; margin: 20px 0; }
        .details-box { width: 48%; border: 1px solid #ddd; padding: 10px; border-radius: 5px; }
        .details-box h4 { background: #f5f5f5; padding: 5px 10px; margin: -10px -10px 10px -10px; font-size: 11px; }
        .details-box p { margin: 3px 0; font-size: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #1a365d; color: white; padding: 10px; text-align: left; font-size: 10px; }
        td { padding: 8px 10px; border-bottom: 1px solid #ddd; font-size: 10px; }
        .totals { text-align: right; margin-top: 20px; }
        .totals p { margin: 5px 0; font-size: 12px; }
        .totals .total { font-size: 16px; font-weight: bold; color: #1a365d; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 9px; color: #666; text-align: center; }
        .uuid { background: #f5f5f5; padding: 10px; margin-top: 20px; border-radius: 5px; font-family: monospace; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          <h1>${invoice.emisor?.nombre || 'EMPRESA'}</h1>
          <p>RFC: ${invoice.emisor?.rfc || 'XXXX000000XXX'}</p>
          <p>Régimen: ${invoice.emisor?.regimenFiscal || '601'}</p>
        </div>
        <div class="invoice-title">
          <h2>FACTURA</h2>
          <p><strong>Serie:</strong> ${invoice.serie || 'F'}</p>
          <p><strong>Folio:</strong> ${invoice.folio || '000001'}</p>
          <p><strong>Fecha:</strong> ${new Date(invoice.fecha || Date.now()).toLocaleDateString('es-MX')}</p>
        </div>
      </div>
      
      <div class="invoice-details">
        <div class="details-box">
          <h4>EMISOR</h4>
          <p><strong>${invoice.emisor?.nombre || 'EMPRESA'}</strong></p>
          <p>RFC: ${invoice.emisor?.rfc || 'XXXX000000XXX'}</p>
        </div>
        <div class="details-box">
          <h4>RECEPTOR</h4>
          <p><strong>${invoice.receptor?.nombre || 'CLIENTE'}</strong></p>
          <p>RFC: ${invoice.receptor?.rfc || 'XAXX010101000'}</p>
          <p>Uso CFDI: ${invoice.receptor?.usoCFDI || 'G03'}</p>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Cantidad</th>
            <th>Descripción</th>
            <th>Valor Unitario</th>
            <th>Importe</th>
          </tr>
        </thead>
        <tbody>
          ${(invoice.items || []).map((item: any) => `
          <tr>
            <td>${item.cantidad}</td>
            <td>${item.descripcion}</td>
            <td>$${Number(item.valorUnitario || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
            <td>$${Number(item.importe || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="totals">
        <p><strong>Subtotal:</strong> $${Number(invoice.subtotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
        <p><strong>IVA (16%):</strong> $${Number(invoice.iva || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
        <p class="total"><strong>TOTAL:</strong> $${Number(invoice.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</p>
      </div>
      
      ${invoice.uuid ? `
      <div class="uuid">
        <strong>UUID:</strong> ${invoice.uuid}<br>
        <small>Este documento es una representación impresa de un CFDI</small>
      </div>
      ` : ''}
      
      <div class="footer">
        <p>My Conta AI - Sistema de Facturación Electrónica</p>
        <p>Este documento no es un CFDI válido hasta ser timbrado por un PAC autorizado</p>
      </div>
    </body>
    </html>
    `;

    res.json({ success: true, html: htmlContent });
  } catch (error) {
    console.error('Generate PDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// ============ DESCARGA DE FACTURAS ============
app.get('/api/invoices/:id/download-xml', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string || 'default';

    const invoice = invoices.find(i => (i.id === id || i.ID === id) && (!userId || userId === 'default' || i.userId === userId));

    if (!invoice) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    if (!invoice.xmlContent) {
      return res.status(400).json({ error: 'XML no disponible para esta factura' });
    }

    const xmlContent = Buffer.isBuffer(invoice.xmlContent)
      ? invoice.xmlContent.toString('utf-8')
      : Buffer.from(invoice.xmlContent, 'base64').toString('utf-8');

    const filename = `${invoice.serie || 'F'}${invoice.folio || invoice.id}_${invoice.uuid || 'sin-uuid'}.xml`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(xmlContent);
  } catch (error) {
    console.error('Download XML error:', error);
    res.status(500).json({ error: 'Failed to download XML' });
  }
});

app.get('/api/invoices/:id/download-json', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string || 'default';

    const invoice = invoices.find(i => (i.id === id || i.ID === id) && (!userId || userId === 'default' || i.userId === userId));

    if (!invoice) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    const filename = `${invoice.serie || 'F'}${invoice.folio || invoice.id}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(invoice);
  } catch (error) {
    console.error('Download JSON error:', error);
    res.status(500).json({ error: 'Failed to download JSON' });
  }
});

// ============ LISTA DE FACTURAS LOCALES ============
app.get('/api/invoices/local/list', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'default';
    const userDir = path.join(DATA_DIR, 'users', userId, 'facturas');

    if (!fs.existsSync(userDir)) {
      return res.json({ success: true, files: [] });
    }

    const files = fs.readdirSync(userDir)
      .filter(f => f.endsWith('.xml') || f.endsWith('.json'))
      .map(f => {
        const filePath = path.join(userDir, f);
        const stats = fs.statSync(filePath);
        return {
          filename: f,
          path: filePath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      });

    res.json({ success: true, files, userId });
  } catch (error) {
    console.error('List local invoices error:', error);
    res.status(500).json({ error: 'Failed to list local invoices' });
  }
});

// ============ START SERVER ============
app.listen(PORT, () => {
  console.log(`🚀 My Conta AI Backend running on http://localhost:${PORT}`);
  console.log(`🤖 Ollama Assistant: ${OLLAMA_HOST} (model: ${OLLAMA_MODEL})`);
  console.log(`📊 Google Script URL: ${GOOGLE_SCRIPT_URL || 'Not configured (using local storage)'}`);
});
