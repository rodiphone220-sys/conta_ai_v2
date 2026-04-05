import { useState, useRef, useEffect, ChangeEvent } from "react";
import { motion } from "motion/react";
import { 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  FileKey,
  FileCheck,
  ArrowRight,
  ArrowLeft,
  X
} from "lucide-react";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import forge from "node-forge";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface SetupWizardProps {
  onComplete: () => void;
}

interface CertificateData {
  rfc: string;
  nombre: string;
  validity: {
    from: string;
    to: string;
    valid: boolean;
  };
  serialNumber: string;
  rfcManuallyEntered?: boolean;
}

interface SatCompanyData {
  rfc: string;
  nombre: string;
  estado: string;
  municipio: string;
  cp: string;
  colonia: string;
  calle: string;
  numeroExt: string;
  numeroInt: string;
  regimenFiscal: string;
  situacion: string;
}

interface CompanyFormData {
  nombre: string;
  rfc: string;
  calle: string;
  numeroExt: string;
  numeroInt: string;
  colonia: string;
  municipio: string;
  estado: string;
  pais: string;
  cp: string;
  email: string;
  telefono: string;
  regimenFiscal: string;
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [cerFile, setCerFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [processing, setProcessing] = useState(false);
  const [satLoading, setSatLoading] = useState(false);
  const [certData, setCertData] = useState<CertificateData | null>(null);
  const [satData, setSatData] = useState<SatCompanyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [companyForm, setCompanyForm] = useState<CompanyFormData>({
    nombre: "",
    rfc: "",
    calle: "",
    numeroExt: "",
    numeroInt: "",
    colonia: "",
    municipio: "",
    estado: "",
    pais: "México",
    cp: "",
    email: "",
    telefono: "",
    regimenFiscal: "",
  });
  
  const cerInputRef = useRef<HTMLInputElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);

  const handleGoBack = () => {
    setStep(1);
  };

  const isValidRFC = (rfc: string) => {
    if (!rfc) return false;
    const cleanRFC = rfc.replace(/[^A-Z0-9&Ñ]/gi, '');
    return cleanRFC.length >= 12 && cleanRFC.length <= 13 && /^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/i.test(cleanRFC);
  };

  const currentRFC = companyForm.rfc || certData?.rfc || "";
  const isFormComplete = cerFile && keyFile && password && isValidRFC(currentRFC);

  const lookupSatData = async (rfc: string): Promise<boolean> => {
    setSatLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/sat-lookup?rfc=${encodeURIComponent(rfc)}`);
      const data = await response.json();
      
      if (data && !data.error) {
        setSatData(data);
        
        setCompanyForm(prev => ({
          ...prev,
          nombre: data.nombre || prev.nombre,
          rfc: data.rfc || rfc,
          calle: data.calle || prev.calle,
          numeroExt: data.numeroExt || prev.numeroExt,
          numeroInt: data.numeroInt || prev.numeroInt,
          colonia: data.colonia || prev.colonia,
          municipio: data.municipio || prev.municipio,
          estado: data.estado || prev.estado,
          cp: data.cp || prev.cp,
          regimenFiscal: data.regimenFiscal || prev.regimenFiscal,
        }));
        
        toast.success("Datos del SAT verificados", {
          description: `RFC: ${data.rfc} - ${data.nombre}`,
        });
        return true;
      } else {
        toast.warning("RFC no encontrado en el SAT", {
          description: "Ingresa los datos manualmente",
        });
        return false;
      }
    } catch (err) {
      console.error("SAT lookup error:", err);
      toast.error("Error al consultar el SAT");
      return false;
    } finally {
      setSatLoading(false);
    }
  };

  const parseCertificate = async (file: File): Promise<CertificateData | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          const der = forge.util.createBuffer(new Uint8Array(data));
          const asn1 = forge.asn1.fromDer(der);
          const cert = forge.pki.certificateFromAsn1(asn1);
          
          const subject = cert.subject.attributes;
          const issuer = cert.issuer.attributes;
          
          let rfc = "";
          let nombre = "";
          
          subject.forEach((attr: any) => {
            if (attr.shortName === "OID.1.2.840.113549.1.9.1" || attr.name === "emailAddress") {
              const email = attr.value;
              const rfcMatch = email?.match(/([A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3})/i);
              if (rfcMatch) rfc = rfcMatch[1].toUpperCase();
            }
            if (attr.shortName === "CN") {
              nombre = attr.value || "";
            }
          });
          
          if (!rfc) {
            const issuerEmail = issuer.find((a: any) => a.name === "emailAddress");
            if (issuerEmail) {
              const rfcMatch = issuerEmail.value?.match(/([A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3})/i);
              if (rfcMatch) rfc = rfcMatch[1].toUpperCase();
            }
          }
          
          const now = new Date();
          const validFrom = cert.validity.notBefore;
          const validTo = cert.validity.notAfter;
          
          setCertData({
            rfc: rfc || "RFC no encontrado en certificado",
            nombre: nombre || "Nombre no encontrado",
            validity: {
              from: validFrom.toISOString(),
              to: validTo.toISOString(),
              valid: now >= validFrom && now <= validTo
            },
            serialNumber: cert.serialNumber || ""
          });
          
          resolve(certData);
        } catch (err) {
          console.error("Error parsing certificate:", err);
          resolve(null);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleCerUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith(".cer")) {
      toast.error("Archivo inválido", { description: "Selecciona un archivo .cer" });
      return;
    }
    
    setCerFile(file);
    setProcessing(true);
    setError(null);
    setSatData(null);
    
    try {
      const data = await parseCertificate(file);
      if (data) {
        const rfcToLookup = data.rfc && data.rfc.length >= 12 ? data.rfc : null;
        
        if (rfcToLookup) {
          setCompanyForm(prev => ({ ...prev, rfc: rfcToLookup, nombre: data.nombre }));
          await lookupSatData(rfcToLookup);
        } else {
          toast.warning("Certificado cargado", { description: "No se pudo extraer el RFC. Ingrésalo manualmente." });
        }
      } else {
        toast.warning("Certificado cargado", { description: "No se pudo extraer el RFC automáticamente" });
      }
    } catch (err) {
      setError("Error al procesar el certificado");
    } finally {
      setProcessing(false);
    }
  };

  const handleKeyUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const ext = file.name.toLowerCase().split('.').pop();
    if (ext !== 'key' && ext !== 'sdg') {
      toast.error("Archivo inválido", { description: "Selecciona un archivo .key o .sdg" });
      return;
    }
    
    setKeyFile(file);
  };

  const handleValidate = async () => {
    if (!cerFile || !keyFile || !password) {
      toast.error("Completa todos los campos");
      return;
    }
    
    const rfcToUse = companyForm.rfc || certData?.rfc;
    
    if (!rfcToUse || rfcToUse.length < 12) {
      toast.error("Ingresa un RFC válido para continuar");
      return;
    }
    
    setStep(2);
  };

  const performSatLookup = async () => {
    setProcessing(true);
    setError(null);
    
    try {
      const rfcToLookup = companyForm.rfc || certData?.rfc;
      
      if (rfcToLookup && rfcToLookup.length >= 12) {
        const success = await lookupSatData(rfcToLookup);
        if (!success) {
          setCompanyForm(prev => ({
            ...prev,
            rfc: rfcToLookup
          }));
        }
      }
      
      setStep(3);
    } catch {
      setError("Error al procesar los archivos");
      setStep(3);
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    if (step === 2) {
      performSatLookup();
    }
  }, [step]);

  const handleSaveAndComplete = async () => {
    if (!certData) {
      toast.error("Error", { description: "No hay datos del certificado" });
      return;
    }
    
    setProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append("cer", cerFile!);
      formData.append("key", keyFile!);
      formData.append("password", password);
      
      const response = await fetch(`${API_URL}/api/setup/save-csd`, {
        method: "POST",
        body: formData
      });
      
      const companyData = {
        Nombre: companyForm.nombre,
        RFC: companyForm.rfc,
        Calle: companyForm.calle,
        NumeroExt: companyForm.numeroExt,
        NumeroInt: companyForm.numeroInt,
        Colonia: companyForm.colonia,
        Municipio: companyForm.municipio,
        Estado: companyForm.estado,
        Pais: companyForm.pais,
        CP: companyForm.cp,
        Email: companyForm.email,
        Telefono: companyForm.telefono,
        RegimenFiscal: companyForm.regimenFiscal,
        Certificado: cerFile?.name || "",
        LlavePrivada: keyFile?.name || "",
        satVerified: !!satData,
      };
      
      localStorage.setItem("companyData", JSON.stringify(companyData));
      localStorage.setItem("csdConfigured", "true");
      
      if (response.ok) {
        toast.success("CSD guardado", { description: "Configuración completada" });
      } else {
        toast.success("Configuración guardada", { description: "Empresa configurada exitosamente" });
      }
      onComplete();
    } catch {
      toast.error("Error al guardar");
    } finally {
      setProcessing(false);
    }
  };

  const handleLookupSat = async () => {
    if (companyForm.rfc && companyForm.rfc.length >= 12) {
      await lookupSatData(companyForm.rfc);
    } else {
      toast.error("Ingresa un RFC válido");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-brand-light w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden"
      >
        <div className="p-6 bg-gradient-to-r from-brand-primary to-brand-primary/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-white">Configuración Inicial</h2>
                <p className="text-white/70 text-sm">Configura tu CSD para facturación</p>
              </div>
            </div>
            <button onClick={onComplete} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {step === 1 && (
            <>
              <div className="flex gap-2 mb-4">
                <div className="flex-1 h-2 bg-brand-primary rounded-full" />
                <div className="flex-1 h-2 bg-brand-dark/10 rounded-full" />
              </div>

              <div className="space-y-4">
                <div className={cn(
                  "border-2 rounded-2xl p-6 text-center transition-colors cursor-pointer",
                  cerFile ? "border-emerald-500 bg-emerald-50" : "border-dashed border-brand-dark/20 hover:border-brand-primary/50"
                )} onClick={() => cerInputRef.current?.click()}>
                  <input 
                    ref={cerInputRef}
                    type="file" 
                    accept=".cer"
                    onChange={handleCerUpload}
                    className="hidden"
                  />
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <FileCheck className={cn(
                      "w-8 h-8",
                      cerFile ? "text-emerald-500" : "text-brand-dark/30"
                    )} />
                    {cerFile && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                  </div>
                  <p className={cn(
                    "font-semibold",
                    cerFile ? "text-emerald-700" : "text-brand-dark"
                  )}>
                    {cerFile ? "Certificado cargado" : "1. Subir archivo .cer"}
                  </p>
                  <p className="text-sm text-brand-dark/50 mt-1">Certificado de Sello Digital</p>
                </div>

                <div className={cn(
                  "border-2 rounded-2xl p-6 text-center transition-colors cursor-pointer",
                  keyFile ? "border-emerald-500 bg-emerald-50" : "border-dashed border-brand-dark/20 hover:border-brand-primary/50"
                )} onClick={() => keyInputRef.current?.click()}>
                  <input 
                    ref={keyInputRef}
                    type="file" 
                    accept=".key"
                    onChange={handleKeyUpload}
                    className="hidden"
                  />
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <FileKey className={cn(
                      "w-8 h-8",
                      keyFile ? "text-emerald-500" : "text-brand-dark/30"
                    )} />
                    {keyFile && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                  </div>
                  <p className={cn(
                    "font-semibold",
                    keyFile ? "text-emerald-700" : "text-brand-dark"
                  )}>
                    {keyFile ? "Llave privada cargada" : "2. Subir archivo .key"}
                  </p>
                  <p className="text-sm text-brand-dark/50 mt-1">Llave Privada</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">
                    3. Contraseña del CSD
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña de tu CSD"
                    className="w-full p-3 bg-white border border-brand-dark/10 rounded-xl focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 text-brand-dark"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    {error}
                  </div>
                )}

                {certData && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-emerald-700 font-bold">
                      <CheckCircle2 className="w-5 h-5" />
                      Certificado procesado
                    </div>
                    <div className="text-sm text-emerald-600 space-y-1">
                      <p><strong>Nombre:</strong> {certData.nombre}</p>
                      <p className="flex items-center gap-2">
                        <strong>Validez:</strong> 
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-bold",
                          certData.validity.valid ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                        )}>
                          {certData.validity.valid ? "Válido" : "Expirado"}
                        </span>
                      </p>
                    </div>
                    
                    <div className="space-y-2 pt-2 border-t border-emerald-200">
                      <label className="text-xs text-brand-dark/60 font-semibold">
                        4. Ingresa tu RFC (requerido):
                      </label>
                      <input
                        type="text"
                        value={companyForm.rfc || certData.rfc || ""}
                        onChange={(e) => {
                          const rfc = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 13);
                          setCertData(prev => prev ? { ...prev, rfc, rfcManuallyEntered: true } : null);
                          setCompanyForm(prev => ({ ...prev, rfc }));
                        }}
                        placeholder="Ej: GUGO781110E30"
                        className="w-full p-3 bg-white border border-brand-dark/20 rounded-xl focus:border-brand-primary focus:outline-none font-mono text-sm"
                        maxLength={13}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-4">
                <div className="flex gap-2 text-sm">
                  <div className={cn("flex items-center gap-1", cerFile ? "text-emerald-600" : "text-brand-dark/40")}>
                    {cerFile ? <CheckCircle2 className="w-4 h-4" /> : <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-xs">1</span>}
                    Certificado
                  </div>
                  <div className={cn("flex items-center gap-1", keyFile ? "text-emerald-600" : "text-brand-dark/40")}>
                    {keyFile ? <CheckCircle2 className="w-4 h-4" /> : <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-xs">2</span>}
                    Llave
                  </div>
                  <div className={cn("flex items-center gap-1", password ? "text-emerald-600" : "text-brand-dark/40")}>
                    {password ? <CheckCircle2 className="w-4 h-4" /> : <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-xs">3</span>}
                    Contraseña
                  </div>
                  <div className={cn("flex items-center gap-1", certData?.rfc && certData.rfc.length >= 12 ? "text-emerald-600" : "text-brand-dark/40")}>
                    {certData?.rfc && certData.rfc.length >= 12 ? <CheckCircle2 className="w-4 h-4" /> : <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-xs">4</span>}
                    RFC
                  </div>
                </div>

                <button
                  onClick={handleValidate}
                  disabled={!isFormComplete || processing}
                  className={cn(
                    "w-full p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all",
                    isFormComplete 
                      ? "bg-brand-primary text-white hover:bg-brand-primary/90 shadow-3d hover-3d active:scale-95" 
                      : "bg-brand-dark/10 text-brand-dark/40 cursor-not-allowed"
                  )}
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      Validar y Continuar
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex gap-2 mb-4">
                <div className="flex-1 h-2 bg-brand-primary rounded-full" />
                <div className="flex-1 h-2 bg-brand-primary rounded-full" />
                <div className="flex-1 h-2 bg-brand-dark/10 rounded-full" />
              </div>

              <div className="text-center space-y-6 py-8">
                <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
                </div>
                <div>
                  <h3 className="text-xl font-display font-bold text-brand-dark">Consultando SAT</h3>
                  <p className="text-brand-dark/60 mt-2">
                    Buscando datos del RFC: <span className="font-mono font-bold">{companyForm.rfc || certData?.rfc}</span>
                  </p>
                </div>
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                    {error}
                  </div>
                )}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="flex gap-2 mb-4">
                <div className="flex-1 h-2 bg-brand-primary rounded-full" />
                <div className="flex-1 h-2 bg-brand-primary rounded-full" />
                <div className="flex-1 h-2 bg-brand-primary rounded-full" />
              </div>

              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-brand-primary/10 rounded-full flex items-center justify-center">
                  <Shield className="w-4 h-4 text-brand-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-brand-dark">Datos de tu Empresa</h3>
                  <p className="text-xs text-brand-dark/50">
                    {satData ? "Datos verificados con el SAT" : "Ingresa los datos de tu empresa"}
                  </p>
                </div>
                {satData && (
                  <span className="ml-auto px-2 py-1 bg-emerald-100 text-emerald-600 text-xs font-bold rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Verificado SAT
                  </span>
                )}
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-brand-dark/60 uppercase tracking-wider">RFC</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={companyForm.rfc}
                        onChange={(e) => {
                          const rfc = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 13);
                          setCompanyForm(prev => ({ ...prev, rfc }));
                        }}
                        className="flex-1 p-3 bg-white border border-brand-dark/10 rounded-xl focus:border-brand-primary focus:outline-none font-mono text-sm"
                        placeholder="RFC de la empresa"
                      />
                      <button
                        onClick={handleLookupSat}
                        disabled={satLoading || companyForm.rfc.length < 12}
                        className="px-4 bg-brand-primary text-white rounded-xl font-semibold text-sm hover:bg-brand-primary/90 disabled:opacity-50"
                      >
                        {satLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verificar SAT"}
                      </button>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-brand-dark/60 uppercase tracking-wider">Razón Social / Nombre</label>
                    <input
                      type="text"
                      value={companyForm.nombre}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, nombre: e.target.value }))}
                      className="w-full p-3 bg-white border border-brand-dark/10 rounded-xl focus:border-brand-primary focus:outline-none text-sm"
                      placeholder="Nombre o razón social"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-brand-dark/60 uppercase tracking-wider">Calle</label>
                    <input
                      type="text"
                      value={companyForm.calle}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, calle: e.target.value }))}
                      className="w-full p-3 bg-white border border-brand-dark/10 rounded-xl focus:border-brand-primary focus:outline-none text-sm"
                      placeholder="Nombre de la calle"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-brand-dark/60 uppercase tracking-wider">No. Exterior</label>
                    <input
                      type="text"
                      value={companyForm.numeroExt}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, numeroExt: e.target.value }))}
                      className="w-full p-3 bg-white border border-brand-dark/10 rounded-xl focus:border-brand-primary focus:outline-none text-sm"
                      placeholder="Ext."
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-brand-dark/60 uppercase tracking-wider">No. Interior</label>
                    <input
                      type="text"
                      value={companyForm.numeroInt}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, numeroInt: e.target.value }))}
                      className="w-full p-3 bg-white border border-brand-dark/10 rounded-xl focus:border-brand-primary focus:outline-none text-sm"
                      placeholder="Int."
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-brand-dark/60 uppercase tracking-wider">Colonia</label>
                    <input
                      type="text"
                      value={companyForm.colonia}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, colonia: e.target.value }))}
                      className="w-full p-3 bg-white border border-brand-dark/10 rounded-xl focus:border-brand-primary focus:outline-none text-sm"
                      placeholder="Colonia"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-brand-dark/60 uppercase tracking-wider">C.P.</label>
                    <input
                      type="text"
                      value={companyForm.cp}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, cp: e.target.value.replace(/\D/g, '').slice(0, 5) }))}
                      className="w-full p-3 bg-white border border-brand-dark/10 rounded-xl focus:border-brand-primary focus:outline-none text-sm"
                      placeholder="Código postal"
                      maxLength={5}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-brand-dark/60 uppercase tracking-wider">Municipio</label>
                    <input
                      type="text"
                      value={companyForm.municipio}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, municipio: e.target.value }))}
                      className="w-full p-3 bg-white border border-brand-dark/10 rounded-xl focus:border-brand-primary focus:outline-none text-sm"
                      placeholder="Municipio"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-brand-dark/60 uppercase tracking-wider">Estado</label>
                    <input
                      type="text"
                      value={companyForm.estado}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, estado: e.target.value }))}
                      className="w-full p-3 bg-white border border-brand-dark/10 rounded-xl focus:border-brand-primary focus:outline-none text-sm"
                      placeholder="Estado"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-brand-dark/60 uppercase tracking-wider">Régimen Fiscal</label>
                    <select
                      value={companyForm.regimenFiscal}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, regimenFiscal: e.target.value }))}
                      className="w-full p-3 bg-white border border-brand-dark/10 rounded-xl focus:border-brand-primary focus:outline-none text-sm"
                    >
                      <option value="">Selecciona el régimen fiscal</option>
                      <option value="601 - General de Ley Personas Morales">601 - General de Ley Personas Morales</option>
                      <option value="603 - Personas Morales con Fines No Lucrativos">603 - Personas Morales con Fines No Lucrativos</option>
                      <option value="605 - Sueldos y Salarios e Ingresos Asimilados a Salarios">605 - Sueldos y Salarios e Ingresos Asimilados a Salarios</option>
                      <option value="606 - Arrendamiento">606 - Arrendamiento</option>
                      <option value="608 - Demás ingresos">608 - Demás ingresos</option>
                      <option value="609 - Consolidación">609 - Consolidación</option>
                      <option value="610 - Residentes del Extranjero">610 - Residentes del Extranjero</option>
                      <option value="611 - Ingresos por Dividendos">611 - Ingresos por Dividendos</option>
                      <option value="612 - Personas Físicas con Actividad Empresarial">612 - Personas Físicas con Actividad Empresarial</option>
                      <option value="614 - Incorporación Fiscal">614 - Incorporación Fiscal</option>
                      <option value="615 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras">615 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-brand-dark/60 uppercase tracking-wider">Email</label>
                    <input
                      type="email"
                      value={companyForm.email}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full p-3 bg-white border border-brand-dark/10 rounded-xl focus:border-brand-primary focus:outline-none text-sm"
                      placeholder="email@ejemplo.com"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-brand-dark/60 uppercase tracking-wider">Teléfono</label>
                    <input
                      type="tel"
                      value={companyForm.telefono}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, telefono: e.target.value }))}
                      className="w-full p-3 bg-white border border-brand-dark/10 rounded-xl focus:border-brand-primary focus:outline-none text-sm"
                      placeholder="55 1234 5678"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleGoBack}
                  className="px-6 py-4 border border-brand-dark/20 rounded-2xl font-semibold text-brand-dark/60 hover:bg-brand-dark/5 transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSaveAndComplete}
                  disabled={processing || !companyForm.nombre || !companyForm.rfc}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 rounded-2xl font-bold transition-all",
                    processing || !companyForm.nombre || !companyForm.rfc
                      ? "bg-brand-dark/10 text-brand-dark/40 cursor-not-allowed"
                      : "bg-brand-primary text-white hover:bg-brand-primary/90 shadow-3d"
                  )}
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      {satData ? "Guardar y Continuar" : "Guardar Datos"}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
