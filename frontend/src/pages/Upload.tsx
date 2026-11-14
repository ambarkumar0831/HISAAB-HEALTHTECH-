import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  FileCheck2,
  FileText,
  Image,
  FileText as FilePdf,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload as UploadIcon,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { auditApi } from "../services/api";
import type { BillExtraction } from "../types";

const MAX_SIZE_MB = 10;

type Step = "idle" | "uploading" | "extracting" | "review" | "analyzing" | "done" | "error";

export default function Upload() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [progress, setProgress] = useState(0);
  const [extraction, setExtraction] = useState<BillExtraction | null>(null);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const ext = file?.name.split(".").pop()?.toLowerCase();
  const isImage = ext === "jpg" || ext === "jpeg" || ext === "png";
  const isPdf = ext === "pdf";
  const isProcessing = step === "uploading" || step === "extracting" || step === "analyzing";

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  useEffect(() => {
    if (!cameraOpen) return;

    let active = true;
    let stream: MediaStream | null = null;
    setCameraLoading(true);
    setCameraReady(false);
    setCameraError(null);

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera access is unavailable in this browser. Choose an image file instead.");
        setCameraLoading(false);
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (cameraFailure: unknown) {
        if (!active) return;
        if (cameraFailure instanceof DOMException && cameraFailure.name === "NotAllowedError") {
          setCameraError("Camera permission was denied. Allow camera access in your browser settings, then try again.");
        } else if (cameraFailure instanceof DOMException && cameraFailure.name === "NotFoundError") {
          setCameraError("No camera was found. Choose an image file instead.");
        } else if (cameraFailure instanceof DOMException && cameraFailure.name === "NotReadableError") {
          setCameraError("The camera is already in use by another app. Close it and try again.");
        } else if (cameraFailure instanceof DOMException && cameraFailure.name === "SecurityError") {
          setCameraError("Camera access requires localhost or a secure HTTPS connection.");
        } else {
          setCameraError("Could not open the camera. Check browser permissions or choose an image file instead.");
        }
      } finally {
        if (active) setCameraLoading(false);
      }
    };

    void startCamera();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCameraOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      active = false;
      window.removeEventListener("keydown", closeOnEscape);
      stream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [cameraOpen]);

  const acceptFile = (selectedFile?: File) => {
    if (!selectedFile) return;
    const extension = selectedFile.name.split(".").pop()?.toLowerCase();
    if (!extension || !["jpg", "jpeg", "png", "pdf"].includes(extension)) {
      setError("Choose a PDF, JPG, JPEG, or PNG file.");
      return;
    }
    if (selectedFile.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`This file is larger than ${MAX_SIZE_MB} MB. Choose a smaller file.`);
      return;
    }
    setFile(selectedFile);
    setError(null);
    setExtraction(null);
    setAuditId(null);
    setStep("idle");
    setProgress(0);
  };

  const closeCamera = () => {
    setCameraOpen(false);
    setCameraReady(false);
    setCameraError(null);
  };

  const openCamera = () => {
    setCameraError(null);
    setCameraOpen(true);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("Could not prepare the photo. Please try again or choose an image file.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((photoBlob) => {
      if (!photoBlob) {
        setCameraError("Could not capture the photo. Please try again.");
        return;
      }

      const photo = new File([photoBlob], `bill-photo-${Date.now()}.jpg`, { type: "image/jpeg" });
      acceptFile(photo);
      closeCamera();
    }, "image/jpeg", 0.92);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    acceptFile(event.target.files?.[0]);
    event.currentTarget.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (!isProcessing) acceptFile(event.dataTransfer.files?.[0]);
  };

  const removeFile = () => {
    if (isProcessing) return;
    setFile(null);
    setError(null);
    setExtraction(null);
    setAuditId(null);
    setStep("idle");
    setProgress(0);
  };

  const runAudit = async () => {
    if (!file || isProcessing) return;
    setError(null);

    let activeAuditId = auditId;
    let activeExtraction = extraction;

    try {
      if (!activeAuditId) {
        setStep("uploading");
        setProgress(10);
        const upload = await auditApi.upload(file);
        activeAuditId = upload.audit_id;
        setAuditId(activeAuditId);
      }

      if (!activeExtraction) {
        setStep("extracting");
        setProgress(40);
        const result = await auditApi.extract(activeAuditId);
        activeExtraction = result.extraction;
        setExtraction(activeExtraction);
        setStep("review");
        setProgress(100);
        return;
      }

      setStep("analyzing");
      setProgress(70);
      await auditApi.confirm(activeAuditId, activeExtraction);
      await auditApi.analyze(activeAuditId);
      setProgress(100);
      setStep("done");
      navigate(`/audit/${activeAuditId}`);
    } catch (processingError: unknown) {
      setStep("error");
      setError(
        processingError instanceof Error
          ? processingError.message
          : "Bill processing failed. Please try again.",
      );
      setProgress(0);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-dark-teal via-[#174c48] to-[#477c69] px-6 py-7 text-white shadow-[0_24px_70px_-44px_rgba(18,59,59,0.65)] sm:px-9 sm:py-9">
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border border-white/10" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-2 -top-9 h-44 w-44 rounded-full border border-white/10" aria-hidden="true" />
        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#d9efe3]">
              <Sparkles size={13} />
              A clearer bill, one step at a time
            </span>
            <h1 className="mt-4 font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">
              New Bill Audit
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
              Add a bill to check its calculations, review possible questions, and decide what to ask next.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start rounded-2xl border border-white/15 bg-white/10 px-3.5 py-3 text-xs text-white/80 sm:self-auto">
            <FileCheck2 size={17} className="text-[#d9efe3]" />
            <span><strong className="text-white">Step {extraction ? 2 : 1}</strong> of 3 · {extraction ? "Confirm details" : "Add your bill"}</span>
          </div>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[0.82fr_1.18fr]">
        <aside className="space-y-5">
          <section className="rounded-[1.7rem] border border-[#e4ece5] bg-white p-6 shadow-[0_18px_50px_-42px_rgba(18,59,59,0.45)] sm:p-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eaf4ed] text-deep-sage">
              <FileCheck2 size={21} />
            </div>
            <h2 className="mt-4 font-serif text-xl font-bold text-dark-teal">What happens next?</h2>
            <ol className="mt-5 space-y-4">
              {[
                { number: "01", title: "Add a bill", description: "Choose an image or PDF to review." },
                { number: "02", title: "Check the details", description: "Extraction and arithmetic checks run separately." },
                { number: "03", title: "Review and ask", description: "Use any prompts to clarify details with your provider." },
              ].map((item, index) => (
                <li key={item.number} className="flex gap-3.5">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${index === 0 ? "bg-dark-teal text-white" : "bg-[#f1f5f1] text-slate-500"}`}>
                    {item.number}
                  </span>
                  <div className="pt-0.5">
                    <p className="text-sm font-semibold text-dark-teal">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-[1.7rem] border border-[#e4ece5] bg-[#f7faf6] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-deep-sage shadow-sm">
                <LockKeyhole size={17} />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-dark-teal">A note about your file</h2>
                <p className="mt-1.5 text-xs leading-5 text-slate-600">
                  You can preview it here before processing. When you start, it is sent to this prototype&apos;s backend and stored on its local filesystem—not Supabase Storage.
                </p>
                <p className="mt-2 text-xs font-semibold leading-5 text-deep-sage">
                  Use synthetic data only. Do not upload a real patient bill.
                </p>
              </div>
            </div>
          </section>
        </aside>

        <section className="rounded-[1.7rem] border border-[#e4ece5] bg-white p-4 shadow-[0_22px_65px_-48px_rgba(18,59,59,0.45)] sm:p-7">
          <div className="flex flex-col justify-between gap-2 border-b border-[#edf1ed] pb-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-serif text-xl font-bold text-dark-teal">Add a bill to review</h2>
              <p className="mt-1 text-xs text-slate-500">PDF, JPG, JPEG, or PNG · up to {MAX_SIZE_MB} MB</p>
            </div>
            <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-[#f2f6f1] px-3 py-1.5 text-[10px] font-semibold text-slate-600 sm:self-auto">
              <ShieldCheck size={13} className="text-deep-sage" />
              Preview stays local
            </span>
          </div>

          <div
            onDragEnter={(event) => {
              event.preventDefault();
              if (!isProcessing) setIsDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              if (!isProcessing) event.dataTransfer.dropEffect = "copy";
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDrop={handleDrop}
            className={`mt-5 rounded-[1.4rem] border-2 border-dashed p-4 text-center transition-colors sm:p-6 ${
              isDragging
                ? "border-deep-sage bg-[#f1f8f2]"
                : "border-[#dfe8df] bg-[#fbfcfa] hover:border-[#9bb8a4]"
            }`}
          >
            {file ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#e7eee7] bg-white p-3 text-left sm:p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eff5ef] text-deep-sage">
                      {isPdf ? <FilePdf size={21} /> : isImage ? <Image size={21} /> : <FileText size={21} />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-dark-teal">{file.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB · Ready to review</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    disabled={isProcessing}
                    aria-label="Remove selected file"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-sage disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>

                {preview && isImage && (
                  <img
                    src={preview}
                    alt={`Local preview of ${file.name}`}
                    className="mx-auto max-h-72 rounded-xl border border-[#e5ece5] bg-white object-contain"
                  />
                )}
                {preview && isPdf && (
                  <iframe
                    title={`Local PDF preview of ${file.name}`}
                    src={preview}
                    className="h-72 w-full rounded-xl border border-[#e5ece5] bg-white"
                  />
                )}

                {!extraction && <div className="rounded-xl bg-[#f1f6f1] px-3.5 py-3 text-left">
                  <p className="flex items-center gap-2 text-xs font-semibold text-dark-teal">
                    <CheckCircle2 size={15} className="shrink-0 text-deep-sage" />
                    File selected—processing has not started yet.
                  </p>
                  <p className="mt-1 pl-[23px] text-[11px] leading-5 text-slate-600">
                    Starting the review sends the file to the configured backend for extraction and analysis.
                  </p>
                </div>}

                {extraction && (
                  <section className="space-y-4 rounded-2xl border border-[#dfe8df] bg-[#fbfcfa] p-4 text-left sm:p-5" aria-labelledby="confirm-extraction-title">
                    <div>
                      <h3 id="confirm-extraction-title" className="font-serif text-lg font-bold text-dark-teal">
                        Confirm the extracted bill details
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        Check these values against the original. The review will not run until you confirm them.
                      </p>
                      {extraction.extraction_method === "TESSERACT" && (
                        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
                          Gemini extraction failed, so fallback OCR was used. Please verify every extracted value against the original bill before continuing.
                        </p>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {([
                        ["subtotal", "Billed subtotal"],
                        ["discount", "Discount"],
                        ["tax", "Tax"],
                        ["grand_total", "Billed final total"],
                      ] as const).map(([field, label]) => (
                        <label key={field} className="text-xs font-semibold text-slate-700">
                          {label}
                          <input
                            type="number"
                            step="0.01"
                            value={extraction[field] ?? ""}
                            onChange={(event) => {
                              const value = event.currentTarget.value;
                              setExtraction((current) => current
                                ? { ...current, [field]: value === "" ? null : Number(value) }
                                : current);
                            }}
                            className="mt-1.5 min-h-10 w-full rounded-lg border border-[#dfe8df] bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-deep-sage focus:ring-2 focus:ring-deep-sage/20"
                          />
                        </label>
                      ))}
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-[#e5ece5] bg-white">
                      <table className="w-full min-w-[690px] text-left text-xs">
                        <thead className="bg-[#f4f8f3] text-[10px] uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-3 py-2.5">Item</th>
                            <th className="px-3 py-2.5">Qty</th>
                            <th className="px-3 py-2.5">Unit price</th>
                            <th className="px-3 py-2.5">Billed total</th>
                            <th className="px-3 py-2.5"><span className="sr-only">Remove</span></th>
                          </tr>
                        </thead>
                        <tbody>
                          {extraction.items.map((item, index) => (
                            <tr key={`${index}-${item.item_name || "item"}`} className="border-t border-[#edf1ed]">
                              <td className="px-2 py-2">
                                <input
                                  aria-label={`Item ${index + 1} description`}
                                  value={item.item_name ?? ""}
                                  onChange={(event) => {
                                    const value = event.currentTarget.value;
                                    setExtraction((current) => current ? {
                                      ...current,
                                      items: current.items.map((row, rowIndex) =>
                                        rowIndex === index ? { ...row, item_name: value } : row),
                                    } : current);
                                  }}
                                  className="min-h-9 w-full rounded-lg border border-[#e1e9e1] px-2.5 text-xs outline-none focus:border-deep-sage"
                                />
                              </td>
                              {(["quantity", "unit_price", "total"] as const).map((field) => (
                                <td key={field} className="px-2 py-2">
                                  <input
                                    aria-label={`Item ${index + 1} ${field.replace("_", " ")}`}
                                    type="number"
                                    step="0.01"
                                    value={item[field] ?? ""}
                                    onChange={(event) => {
                                      const value = event.currentTarget.value;
                                      setExtraction((current) => current ? {
                                        ...current,
                                        items: current.items.map((row, rowIndex) =>
                                          rowIndex === index
                                            ? { ...row, [field]: value === "" ? null : Number(value) }
                                            : row),
                                      } : current);
                                    }}
                                    className="min-h-9 w-24 rounded-lg border border-[#e1e9e1] px-2 text-right text-xs outline-none focus:border-deep-sage"
                                  />
                                </td>
                              ))}
                              <td className="px-2 py-2 text-right">
                                <button
                                  type="button"
                                  aria-label={`Remove item ${index + 1}`}
                                  onClick={() => setExtraction((current) => current
                                    ? { ...current, items: current.items.filter((_, rowIndex) => rowIndex !== index) }
                                    : current)}
                                  className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {extraction.items.length === 0 && (
                            <tr><td colSpan={5} className="px-3 py-5 text-center text-slate-500">No extracted items. Add one if the bill has itemized charges.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExtraction((current) => current
                        ? { ...current, items: [...current.items, { item_name: "", quantity: null, unit_price: null, total: null }] }
                        : current)}
                      className="text-xs font-semibold text-deep-sage hover:text-dark-teal"
                    >
                      + Add missing bill item
                    </button>

                    {extraction.uncertain_fields.length > 0 && (
                      <fieldset className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                        <legend className="px-1 text-xs font-semibold text-amber-900">Confirm unclear extracted fields</legend>
                        <p className="mb-2 text-[11px] leading-5 text-amber-900/80">Unconfirmed fields will be included as review prompts.</p>
                        <div className="flex flex-wrap gap-2">
                          {extraction.uncertain_fields.map((field) => (
                            <label key={field} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[11px] text-slate-700">
                              <input
                                type="checkbox"
                                checked={false}
                                onChange={() => setExtraction((current) => current
                                  ? { ...current, uncertain_fields: current.uncertain_fields.filter((value) => value !== field) }
                                  : current)}
                                className="accent-[#477c69]"
                              />
                              I verified {field.replaceAll("_", " ")}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    )}
                  </section>
                )}

                {!isProcessing && (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <label htmlFor="bill-file" className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold text-deep-sage transition hover:bg-[#eff5ef] focus-within:ring-2 focus-within:ring-deep-sage">
                      <FileText size={15} />
                      Choose a different file
                      <input
                        id="bill-file"
                        type="file"
                        className="sr-only"
                        onChange={handleFileChange}
                        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={openCamera}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold text-deep-sage transition hover:bg-[#eff5ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-sage"
                    >
                      <Camera size={15} />
                      Take a new photo
                    </button>
                  </div>
                )}

                {isProcessing && (
                  <div>
                    <div
                      role="progressbar"
                      aria-label="Bill processing progress"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={progress}
                      className="h-2 overflow-hidden rounded-full bg-slate-100"
                    >
                      <div className="h-full rounded-full bg-deep-sage transition-[width] duration-300" style={{ width: `${progress}%` }} />
                    </div>
                    <p role="status" className="mt-2 text-xs text-slate-500">
                      {step === "uploading" ? "Uploading file…" : step === "extracting" ? "Extracting bill details…" : "Checking the confirmed details…"}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void runAudit()}
                  disabled={isProcessing}
                  className="btn-primary min-h-12 w-full justify-center py-3 disabled:cursor-wait disabled:opacity-60"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {step === "uploading" ? "Uploading…" : step === "extracting" ? "Extracting…" : "Checking…"}
                    </>
                  ) : extraction ? (
                    "Confirm details and run checks"
                  ) : (
                    step === "error" ? "Resume extraction" : "Upload and extract details"
                  )}
                </button>
              </div>
            ) : (
              <>
                <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${isDragging ? "bg-white text-deep-sage" : "bg-[#eaf3eb] text-deep-sage"}`}>
                  <UploadIcon size={24} />
                </span>
                <p className="mt-4 font-serif text-lg font-bold text-dark-teal">
                  {isDragging ? "Drop your bill to preview" : "Drag and drop your bill here"}
                </p>
                <p className="mx-auto mt-1.5 max-w-sm text-xs leading-5 text-slate-500">
                  Your file is only previewed in this browser until you choose to start the review.
                </p>
                <div className="my-5 flex items-center gap-3">
                  <span className="h-px flex-1 bg-[#e8eee8]" />
                  <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-400">or choose a source</span>
                  <span className="h-px flex-1 bg-[#e8eee8]" />
                </div>
                <div className="mx-auto grid w-full max-w-xl gap-3 sm:grid-cols-2">
                  <label htmlFor="bill-file" className="btn-outline min-h-11 w-full cursor-pointer justify-center py-3">
                    <FileText size={17} />
                    Browse files
                    <input
                      id="bill-file"
                      type="file"
                      className="sr-only"
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={openCamera}
                    className="btn-outline min-h-11 w-full justify-center py-3"
                  >
                    <Camera size={17} />
                    Take a photo
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-2 text-[10px] font-medium text-slate-500">
                  {["PDF", "JPG", "JPEG", "PNG"].map((format) => (
                    <span key={format} className="rounded-full border border-[#e5ece5] bg-white px-2.5 py-1">{format}</span>
                  ))}
                  <span className="rounded-full border border-[#e5ece5] bg-white px-2.5 py-1">Max {MAX_SIZE_MB} MB</span>
                </div>
              </>
            )}
          </div>

          {error && (
            <div role="alert" className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4">
              <p className="text-sm leading-5 text-red-700">{error}</p>
            </div>
          )}
        </section>
      </div>

      {cameraOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCamera();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="camera-title"
            aria-describedby="camera-help"
            className="flex h-[min(90dvh,48rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2 id="camera-title" className="font-serif text-xl font-bold text-dark-teal">
                  Take a bill photo
                </h2>
                <p id="camera-help" className="mt-1 text-xs leading-5 text-slate-500">
                  Fit the full page in the frame and keep the text in focus.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCamera}
                aria-label="Close camera"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-dark-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-sage"
              >
                <X size={18} />
              </button>
            </header>

            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-slate-950">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={() => setCameraReady(true)}
                className="max-h-full max-w-full object-contain"
              />
              {cameraLoading && (
                <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/80 text-sm text-white">
                  <Loader2 size={24} className="animate-spin" />
                  Starting camera…
                </div>
              )}
              {cameraError && (
                <p role="alert" className="absolute inset-x-4 bottom-4 rounded-xl bg-white px-4 py-3 text-sm leading-5 text-rose-700 shadow-lg">
                  {cameraError}
                </p>
              )}
            </div>

            <footer className="flex shrink-0 flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button type="button" onClick={closeCamera} className="btn-outline min-h-10 justify-center py-2.5">
                Cancel
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                disabled={!cameraReady || cameraLoading || Boolean(cameraError)}
                className="btn-primary min-h-10 justify-center py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Camera size={16} />
                Take photo
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
