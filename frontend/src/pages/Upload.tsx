import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload as UploadIcon, FileText, Image, FileText as FilePdf, Trash2, RefreshCw, Loader2, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { auditApi } from "../services/api";
import type { BillExtraction } from "../types";

const MAX_SIZE_MB = 10;

type Step = "idle" | "uploading" | "extracting" | "analyzing" | "done" | "error";

export default function Upload() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [progress, setProgress] = useState(0);
  const [extraction, setExtraction] = useState<BillExtraction | null>(null);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ext = file?.name.split(".").pop()?.toLowerCase();
  const isImage = ext === "jpg" || ext === "jpeg" || ext === "png";
  const isPdf = ext === "pdf";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!["jpg", "jpeg", "png", "pdf"].includes(f.name.split(".").pop()!.toLowerCase())) {
      setError("Only JPG, JPEG, PNG, or PDF files are allowed.");
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Max ${MAX_SIZE_MB}MB.`);
      return;
    }
    setFile(f);
    setError(null);
    setPreview(URL.createObjectURL(f));
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    setExtraction(null);
    setAuditId(null);
    setStep("idle");
  };

  const runAudit = async () => {
    if (!file) return;
    setError(null);
    setStep("uploading");
    setProgress(10);

    try {
      const res = await auditApi.upload(file);
      setAuditId(res.audit_id);
      setStep("extracting");
      setProgress(40);

      const ex = await auditApi.extract(res.audit_id);
      setExtraction(ex.extraction);
      setStep("analyzing");
      setProgress(70);

      // Auto-run analysis
      const analysis = await auditApi.analyze(res.audit_id);
      setProgress(100);
      setStep("done");

      navigate(`/audit/${res.audit_id}`);
    } catch (e: any) {
      setStep("error");
      setError(e.message || "Audit failed. Please try again.");
      setProgress(0);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-dark-teal">New Bill Audit</h1>
        <p className="text-slate-600 mt-1">Upload a hospital bill (PDF, JPG, PNG) to begin auditing.</p>
      </div>

      <div className="card">
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center transition-colors hover:border-deep-sage/50">
          {file ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isPdf ? (
                    <FilePdf className="w-8 h-8 text-red-500" />
                  ) : isImage ? (
                    <Image className="w-8 h-8 text-blue-500" />
                  ) : (
                    <FileText className="w-8 h-8 text-slate-500" />
                  )}
                  <div className="text-left">
                    <p className="font-medium text-slate-800">{file.name}</p>
                    <p className="text-xs text-slate-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button onClick={removeFile} className="text-red-500 hover:text-red-700">
                  <Trash2 size={18} />
                </button>
              </div>
              {preview && isImage && (
                <img src={preview} alt="Preview" className="rounded-lg border border-slate-200 max-h-64 object-contain mx-auto" />
              )}
              <button onClick={runAudit} disabled={step === "uploading" || step === "extracting" || step === "analyzing"}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                {step === "idle" ? "Start Bill Audit" : (
                  <>
                    <Loader2 className="animate-spin w-5 h-5" />
                    {step === "uploading" ? "Uploading..." : step === "extracting" ? "Extracting..." : "Analyzing..."}
                  </>
                )}
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-3 text-deep-sage mb-2">
                <UploadIcon className="w-8 h-8 text-deep-sage" />
                <span className="text-lg font-semibold">Drag &amp; drop your bill here</span>
              </div>
              <p className="text-slate-500 text-sm mb-6">
                Supports PDF, JPG, JPEG, PNG (max {MAX_SIZE_MB}MB)
              </p>
              <label className="btn-outline w-full py-4 flex items-center justify-center gap-2 cursor-pointer">
                <FileText size={18} />
                Browse files
                <input type="file" hidden onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" />
              </label>
            </>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-4 border border-red-100">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      {extraction && auditId && step === "done" && (
        <div className="card bg-green-50 border-green-100">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 className="text-green-600 w-5 h-5" />
            <h3 className="font-semibold text-dark-teal">Extraction Complete</h3>
          </div>
          <p className="text-sm text-slate-600 mb-3">
            Method: <span className="font-mono text-xs bg-white px-2 py-1 rounded text-deep-sage">{extraction.extraction_method}</span>
          </p>
          <p className="text-sm text-slate-600">
            Hospital: <span className="font-medium">{extraction.hospital_name || "—"}</span> •{" "}
            Bill: <span className="font-medium">{extraction.bill_number || "—"}</span>
          </p>
          <Link to={`/audit/${auditId}`} className="mt-4 inline-block text-deep-sage font-medium hover:underline">
            View Audit Results →
          </Link>
        </div>
      )}
    </div>
  );
}
