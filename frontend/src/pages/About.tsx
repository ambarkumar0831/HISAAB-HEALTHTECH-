import { Link } from "react-router-dom";
import { ShieldCheck, FileText, Brain, Scale, Mail, Globe } from "lucide-react";

export default function About() {
  return (
    <div className="max-w-4xl mx-auto space-y-12 px-6">
      <div>
        <h1 className="text-4xl font-serif font-bold text-dark-teal mb-4">About HISAAB</h1>
        <p className="text-lg text-slate-600 leading-relaxed">
          HISAAB — "Audit the Hospital Bill" — is an AI-powered hospital bill auditing platform built
          by team AFTERSHOCK for COLOSSUS 3.0 (HealthTech track).
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="card p-8">
          <h2 className="font-serif text-xl text-dark-teal mb-4 flex items-center gap-2">
            <ShieldCheck size={20} /> Our Mission
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Patients and families often receive hospital bills without understanding individual charges.
            Bills may contain duplicate entries, incorrect arithmetic, unexpected quantities, or
            unexplained miscellaneous charges.
          </p>
          <p className="text-slate-600 leading-relaxed">
            We do not dispute medical care. We help patients understand and verify their hospital bills
            so they can request clarification with confidence.
          </p>
        </div>

        <div className="card p-8">
          <h2 className="font-serif text-xl text-dark-teal mb-4 flex items-center gap-2">
            <FileText size={20} /> How It Works
          </h2>
          <ol className="text-slate-600 space-y-4 leading-relaxed list-decimal list-inside">
            <li>
              <strong>Upload</strong> a hospital bill (PDF, JPG, PNG).
            </li>
            <li>
              <strong>Gemini AI</strong> extracts structured bill information (primary processor).
            </li>
            <li>
              <strong>Tesseract OCR</strong> acts as a fallback if extraction fails.
            </li>
            <li>
              <strong>Python audit engine</strong> independently verifies arithmetic, duplicates, dates,
              and unclear charges.
            </li>
            <li>
              <strong>Benchmark comparison</strong> against published rate schedules (PM-JAY, CGHS, state).
            </li>
            <li>
              <strong>Download</strong> an audit report and a draft grievance appeal letter.
            </li>
          </ol>
        </div>
      </div>

      <div className="card p-8">
        <h2 className="font-serif text-xl text-dark-teal mb-4">What We Check</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { title: "Arithmetic", desc: "Quantity × unit price vs billed total", icon: Scale },
            { title: "Duplicates", desc: "Repeated or similar entries", icon: FileText },
            { title: "Benchmarks", desc: "Vs published rate schedules", icon: Globe },
            { title: "Dates", desc: "Admission/discharge consistency", icon: Mail },
            { title: "Unclear Charges", desc: "Missing or vague entries", icon: Brain },
          ].map((item) => (
            <div key={item.title} className="p-4 rounded-lg border border-slate-100 bg-white">
              <div className="w-8 h-8 rounded bg-misty-blue flex items-center justify-center text-deep-sage mb-3">
                <item.icon size={16} />
              </div>
              <h4 className="font-semibold text-dark-teal">{item.title}</h4>
              <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-dark-teal text-white rounded-2xl p-8 text-center">
        <h3 className="font-serif text-2xl font-bold mb-3">Team AFTERSHOCK</h3>
        <p className="text-sage mb-4">COLOSSUS 3.0 • HealthTech Track • Dr. Ambedkar Institute of Technology, Bengaluru</p>
        <div className="flex justify-center gap-4">
          <Link to="#" className="text-slate-300 hover:text-white">GitHub</Link>
          <Link to="#" className="text-slate-300 hover:text-white">LinkedIn</Link>
        </div>
      </div>
    </div>
  );
}
