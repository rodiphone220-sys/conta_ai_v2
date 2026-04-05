import React, { useState, useEffect, useRef } from "react";
import { 
  Shield, 
  Settings, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Save,
  X,
  TestTube,
  Key,
  User,
  Globe,
  Building2,
  Copy,
  ExternalLink,
  Info,
  Upload,
  FileCheck,
  FileX
} from "lucide-react";
import { cn } from "../lib/utils";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

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

const TEST_CREDENTIALS = {
  user: 'testing@solucionfactible.com',
  password: 'timbrado.SF.16672'
};

export function PACSettings() {
  const [config, setConfig] = useState<PACConfig>({
    provider: 'solucion_factible',
    mode: 'sandbox',
    user: '',
    password: '',
    rfcEmisor: '',
    cerPath: 'certs/csd.cer',
    keyPath: 'certs/csd.key',
    csdPassword: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showCsdPassword, setShowCsdPassword] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [cerFile, setCerFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const cerInputRef = useRef<HTMLInputElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pac/config`);
      const data = await response.json();
      
      if (data.configured) {
        setConfig(prev => ({
          ...prev,
          provider: data.provider || 'solucion_factible',
          mode: data.mode || 'sandbox',
          user: data.user || '',
          rfcEmisor: data.rfcEmisor || ''
        }));
      }
    } catch (error) {
      console.error('Error loading PAC config:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTestCredentials = () => {
    setConfig(prev => ({
      ...prev,
      user: TEST_CREDENTIALS.user,
      password: TEST_CREDENTIALS.password
    }));
    toast.success('Credenciales de prueba cargadas');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  const handleCerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCerFile(file);
      setConfig(prev => ({ ...prev, cerPath: file.name }));
    }
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setKeyFile(file);
      setConfig(prev => ({ ...prev, keyPath: file.name }));
    }
  };

  const handleUploadCSD = async () => {
    if (!cerFile || !keyFile) {
      toast.error('Sube ambos archivos (.cer y .key)');
      return;
    }

    if (!config.csdPassword) {
      toast.error('Ingresa la contraseña CSD');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('cer', cerFile);
      formData.append('key', keyFile);
      formData.append('password', config.csdPassword);

      const response = await fetch(`${API_URL}/api/setup/save-csd`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        toast.success('CSD subido correctamente');
      } else {
        toast.error('Error al subir CSD');
      }
    } catch (error) {
      toast.error('Error al subir CSD');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!config.user || !config.password) {
      toast.error('Usuario y contraseña PAC son requeridos');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/pac/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        toast.success('Configuración guardada', {
          description: 'Tu configuración PAC ha sido guardada exitosamente'
        });
      } else {
        toast.error('Error al guardar');
      }
    } catch (error) {
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!config.user || !config.password) {
      toast.error('Ingresa usuario y contraseña para probar');
      return;
    }

    setTesting(true);
    setTestResult(null);
    
    try {
      const response = await fetch(`${API_URL}/api/pac/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: config.user,
          password: config.password,
          mode: config.mode
        })
      });

      const data = await response.json();
      setTestResult(data);

      if (data.success) {
        toast.success('Conexión exitosa', {
          description: `Conectado al PAC en modo ${data.mode}`
        });
      } else {
        toast.error('Error de conexión', {
          description: data.message
        });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Error de conexión' });
      toast.error('Error al probar conexión');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center">
          <Shield className="w-6 h-6 text-brand-primary" />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold text-brand-dark">Configuración PAC</h2>
          <p className="text-sm text-brand-dark/50">Configura tu proveedor de timbrado (Solución Factible)</p>
        </div>
      </div>

      {config.mode === 'sandbox' && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
              <TestTube className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-emerald-800">Modo Sandbox (Pruebas Gratuitas)</h4>
              <p className="text-sm text-emerald-600 mt-1">
                Usa el modo sandbox para probar sin costo. Solo pagarás al timbrar en producción.
              </p>
              <button
                onClick={loadTestCredentials}
                className="mt-3 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Cargar credenciales de prueba
              </button>
            </div>
          </div>
        </div>
      )}

      {config.mode === 'production' && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <h4 className="font-semibold text-red-800">Modo Producción (Timbrado Real)</h4>
              <p className="text-sm text-red-600 mt-1">
                Las facturas timbradas en este modo tienen costo. Usa las credenciales que te proporcionó Solución Factible.
              </p>
              <a
                href="https://solucionfactible.com/timbrado/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Obtener credenciales de producción
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-brand-dark/60 uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              Proveedor PAC
            </label>
            <select
              value={config.provider}
              onChange={(e) => setConfig(prev => ({ ...prev, provider: e.target.value }))}
              className="w-full p-3 mt-1 bg-white border border-brand-dark/10 rounded-xl focus:border-brand-primary focus:outline-none text-sm"
            >
              <option value="solucion_factible">Solución Factible</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-brand-dark/60 uppercase tracking-wider flex items-center gap-1">
              <Globe className="w-3 h-3" />
              Modo
            </label>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, mode: 'sandbox' }))}
                className={cn(
                  "flex-1 p-3 rounded-xl font-semibold text-sm transition-all",
                  config.mode === 'sandbox'
                    ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-500"
                    : "bg-white border border-brand-dark/10 text-brand-dark/50 hover:border-brand-primary/50"
                )}
              >
                Sandbox
              </button>
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, mode: 'production' }))}
                className={cn(
                  "flex-1 p-3 rounded-xl font-semibold text-sm transition-all",
                  config.mode === 'production'
                    ? "bg-red-100 text-red-700 border-2 border-red-500"
                    : "bg-white border border-brand-dark/10 text-brand-dark/50 hover:border-brand-primary/50"
                )}
              >
                Producción
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-brand-dark/60 uppercase tracking-wider flex items-center gap-1">
            <User className="w-3 h-3" />
            Usuario PAC
          </label>
          <input
            type="text"
            value={config.user}
            onChange={(e) => setConfig(prev => ({ ...prev, user: e.target.value }))}
            placeholder="Usuario de Solución Factible"
            className="w-full p-3 mt-1 bg-white border border-brand-dark/10 rounded-xl focus:border-brand-primary focus:outline-none text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-brand-dark/60 uppercase tracking-wider flex items-center gap-1">
            <Key className="w-3 h-3" />
            Contraseña PAC
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={config.password}
              onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Contraseña de Solución Factible"
              className="w-full p-3 mt-1 bg-white border border-brand-dark/10 rounded-xl focus:border-brand-primary focus:outline-none text-sm pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-dark/40 hover:text-brand-dark/60"
            >
              {showPassword ? <X className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-brand-dark/60 uppercase tracking-wider">
            RFC Emisor
          </label>
          <input
            type="text"
            value={config.rfcEmisor}
            onChange={(e) => setConfig(prev => ({ ...prev, rfcEmisor: e.target.value.toUpperCase() }))}
            placeholder="RFC de tu empresa"
            className="w-full p-3 mt-1 bg-white border border-brand-dark/10 rounded-xl focus:border-brand-primary focus:outline-none text-sm font-mono"
            maxLength={13}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-brand-dark/60 uppercase tracking-wider">
              CSD .cer
            </label>
            <input
              type="file"
              ref={cerInputRef}
              onChange={handleCerChange}
              accept=".cer"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => cerInputRef.current?.click()}
              className={cn(
                "w-full p-3 mt-1 border-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2",
                cerFile 
                  ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                  : "bg-white border-brand-dark/10 text-brand-dark/50 hover:border-brand-primary hover:text-brand-primary"
              )}
            >
              {cerFile ? (
                <>
                  <FileCheck className="w-4 h-4" />
                  {cerFile.name}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Seleccionar .cer
                </>
              )}
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-brand-dark/60 uppercase tracking-wider">
              CSD .key
            </label>
            <input
              type="file"
              ref={keyInputRef}
              onChange={handleKeyChange}
              accept=".key"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => keyInputRef.current?.click()}
              className={cn(
                "w-full p-3 mt-1 border-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2",
                keyFile 
                  ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                  : "bg-white border-brand-dark/10 text-brand-dark/50 hover:border-brand-primary hover:text-brand-primary"
              )}
            >
              {keyFile ? (
                <>
                  <FileCheck className="w-4 h-4" />
                  {keyFile.name}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Seleccionar .key
                </>
              )}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-brand-dark/60 uppercase tracking-wider">
            Contraseña CSD
          </label>
          <div className="relative">
            <input
              type={showCsdPassword ? "text" : "password"}
              value={config.csdPassword}
              onChange={(e) => setConfig(prev => ({ ...prev, csdPassword: e.target.value }))}
              placeholder="Contraseña de tu CSD"
              className="w-full p-3 mt-1 bg-white border border-brand-dark/10 rounded-xl focus:border-brand-primary focus:outline-none text-sm pr-10"
            />
            <button
              type="button"
              onClick={() => setShowCsdPassword(!showCsdPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-dark/40 hover:text-brand-dark/60"
            >
              {showCsdPassword ? <X className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {testResult && (
        <div className={cn(
          "p-4 rounded-xl border flex items-center gap-3",
          testResult.success 
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-red-50 border-red-200 text-red-700"
        )}>
          {testResult.success ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span className="text-sm font-medium">{testResult.message}</span>
        </div>
      )}

      {(cerFile || keyFile) && (
        <button
          onClick={handleUploadCSD}
          disabled={uploading || !cerFile || !keyFile || !config.csdPassword}
          className="w-full flex items-center justify-center gap-2 p-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-all disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Subiendo CSD...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Subir Archivos CSD
            </>
          )}
        </button>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleTest}
          disabled={testing}
          className="flex-1 flex items-center justify-center gap-2 p-4 bg-white border-2 border-brand-primary text-brand-primary rounded-2xl font-bold hover:bg-brand-primary hover:text-white transition-all disabled:opacity-50"
        >
          {testing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Probando...
            </>
          ) : (
            <>
              <TestTube className="w-5 h-5" />
              Probar Conexión
            </>
          )}
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 p-4 bg-brand-primary text-white rounded-2xl font-bold hover:bg-brand-primary/90 transition-all disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Guardar Configuración
            </>
          )}
        </button>
      </div>

      <div className="p-4 bg-brand-dark/5 rounded-xl space-y-3">
        <h4 className="font-semibold text-brand-dark text-sm flex items-center gap-2">
          <Info className="w-4 h-4" />
          Información del PAC
        </h4>
        <div className="text-xs text-brand-dark/60 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-semibold">Proveedor:</span>
              <p>Solución Factible</p>
            </div>
            <div>
              <span className="font-semibold">LCO actualizada:</span>
              <p>31/mar./2026</p>
            </div>
          </div>
          <div className="border-t border-brand-dark/10 pt-2 mt-2">
            <span className="font-semibold">Webservices:</span>
            <div className="mt-1 space-y-1 font-mono">
              <p className="flex items-center gap-2">
                <span>Sandbox:</span>
                <code className="bg-white px-2 py-0.5 rounded text-[10px]">
                  testing.solucionfactible.com/ws/services/Timbrado
                </code>
              </p>
              <p className="flex items-center gap-2">
                <span>Producción:</span>
                <code className="bg-white px-2 py-0.5 rounded text-[10px]">
                  solucionfactible.com/ws/services/Timbrado
                </code>
              </p>
            </div>
          </div>
          <div className="border-t border-brand-dark/10 pt-2 mt-2">
            <span className="font-semibold">Métodos disponibles:</span>
            <ul className="mt-1 grid grid-cols-2 gap-1">
              <li>• timbrar</li>
              <li>• timbrarBase64</li>
              <li>• cancelar</li>
              <li>• cancelarBase64</li>
              <li>• enviarSolicitudCancelacion</li>
              <li>• cancelarPorNotaCredito</li>
            </ul>
          </div>
          <a
            href="https://solucionfactible.com/ws/services/Timbrado?wsdl"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-brand-primary hover:underline mt-2"
          >
            <ExternalLink className="w-3 h-3" />
            Ver WSDL
          </a>
        </div>
      </div>
    </div>
  );
}
