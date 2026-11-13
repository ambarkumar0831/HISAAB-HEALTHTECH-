import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  Check,
  Copy,
  FileText,
  Info,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { formatRupees, sampleBillItems, sampleBillLinesToVerify, sampleBillTotal } from "../data/sampleBill";

const initialQuestion =
  "Could you help me understand the two lab panel entries dated 12 May 2025? Were these separate tests, and could you share the order or result details for each? Thank you.";

export default function DemoAudit() {
  const { session } = useAuth();
  const location = useLocation();
  const isPublicSample = location.pathname === "/sample";
  const [question, setQuestion] = useState(initialQuestion);
  const [copyMessage, setCopyMessage] = useState("");

  const copyQuestion = async () => {
    try {
      await navigator.clipboard.writeText(question);
      setCopyMessage("Question copied.");
    } catch {
      setCopyMessage("Copy is unavailable here. You can select and copy the text.");
    }
  };

  return (
    <div className={isPublicSample ? "min-h-screen bg-ivory text-slate-900" : "space-y-7"}>
      {isPublicSample && (
        <>
          <a className="skip-link" href="#sample-main">Skip to sample review</a>
          <header className="sticky top-0 z-30 border-b border-[#e5ece6] bg-[#f7faf6]/90 backdrop-blur-xl">
            <nav aria-label="Sample navigation" className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5 sm:px-8">
              <Link to="/" className="inline-flex items-center gap-2.5 rounded-xl text-dark-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-sage">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-dark-teal font-bold text-white">₹</span>
                <span className="font-serif text-lg font-bold tracking-tight">HISAAB</span>
              </Link>
              <Link to={session ? "/dashboard" : "/signup"} className="btn-primary !min-h-10 !rounded-xl !px-4 !py-2 text-xs">
                {session ? "Open workspace" : "Create workspace"} <ArrowRight size={14} />
              </Link>
            </nav>
          </header>
        </>
      )}

      <main id="sample-main" className={isPublicSample ? "app-canvas min-h-[calc(100vh-68px)] px-5 py-9 sm:px-8 sm:py-12" : "mx-auto max-w-6xl"}>
        <div className="mx-auto max-w-6xl space-y-7">
          {!isPublicSample && (
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-xs font-semibold text-deep-sage transition hover:text-dark-teal">
              <span aria-hidden="true">←</span> Back to workspace
            </Link>
          )}

          <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#dcebe0] bg-white/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-deep-sage">
                <FileText size={13} /> Fictional sample · no patient record
              </div>
              <h1 className="mt-4 text-3xl font-serif tracking-tight text-dark-teal sm:text-4xl">A bill review, with the reasoning in view.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                This hand-built example shows how HISAAB can organize bill details. No document was uploaded, and no OCR, live API, hospital, or rate comparison was used.
              </p>
            </div>
            <Link to={session ? "/upload" : "/signup"} className="btn-primary shrink-0">
              {session ? "Start a bill check" : "Create your workspace"} <ArrowRight size={16} />
            </Link>
          </header>

          <section aria-label="Sample bill summary" className="grid gap-3 sm:grid-cols-3">
            <article className="rounded-2xl border border-[#e5ece6] bg-white p-5 shadow-[0_12px_36px_-30px_rgba(18,59,59,0.5)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Fictional bill total</p>
              <p className="mt-2 font-serif text-3xl font-bold tracking-tight text-dark-teal">{formatRupees(sampleBillTotal)}</p>
              <p className="mt-2 text-xs text-slate-500">Illustrative amount only</p>
            </article>
            <article className="rounded-2xl border border-[#e5ece6] bg-white p-5 shadow-[0_12px_36px_-30px_rgba(18,59,59,0.5)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Arithmetic check</p>
              <p className="mt-2 flex items-center gap-2 font-serif text-2xl font-bold tracking-tight text-dark-teal">
                <Calculator size={19} className="text-deep-sage" /> Line items add up
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">The example’s line totals sum to the stated total.</p>
            </article>
            <article className="rounded-2xl border border-[#f1e2cf] bg-[#fff9f1] p-5 shadow-[0_12px_36px_-30px_rgba(155,102,52,0.35)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#98653b]">Lines to verify</p>
              <p className="mt-2 font-serif text-3xl font-bold tracking-tight text-dark-teal">{sampleBillLinesToVerify}</p>
              <p className="mt-2 text-xs text-slate-600">A possible repeat pattern—not a proven error</p>
            </article>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
            <article className="min-w-0 overflow-hidden rounded-[1.5rem] border border-[#e5ece6] bg-white shadow-[0_18px_50px_-40px_rgba(18,59,59,0.55)]">
              <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-deep-sage">Illustrative inpatient bill</p>
                  <h2 className="mt-1 font-serif text-xl text-dark-teal">Sample line items</h2>
                </div>
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#eef5ef] px-3 py-1.5 text-[10px] font-bold text-deep-sage">
                  <ShieldCheck size={13} /> Synthetic data
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] border-collapse text-left text-xs">
                  <caption className="sr-only">Fictional bill line items, quantities, amounts, and sample review status</caption>
                  <thead>
                    <tr className="bg-[#fbfcf9] text-[10px] uppercase tracking-wide text-slate-500">
                      <th scope="col" className="px-5 py-3 font-semibold">Description</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Date / quantity</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">Amount</th>
                      <th scope="col" className="px-5 py-3 text-right font-semibold">Sample check</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleBillItems.map((item) => (
                      <tr key={item.id} className={`border-t border-slate-100 ${item.possibleRepeat ? "bg-[#fffaf4]" : ""}`}>
                        <th scope="row" className="px-5 py-4 font-semibold text-slate-800">{item.description}</th>
                        <td className="px-4 py-4 text-slate-600">{item.dateAndQuantity}</td>
                        <td className="px-4 py-4 text-right font-semibold tabular-nums text-dark-teal">{formatRupees(item.total)}</td>
                        <td className="px-5 py-4 text-right">
                          {item.possibleRepeat ? (
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#fff0df] px-2.5 py-1.5 text-[10px] font-semibold text-[#8f5e31]">
                              <AlertTriangle size={12} /> Verify pattern
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#edf5ef] px-2.5 py-1.5 text-[10px] font-semibold text-deep-sage">
                              <Check size={12} /> Sample math
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-[#fbfcf9]">
                      <th scope="row" colSpan={2} className="px-5 py-4 text-right font-semibold text-slate-600">Fictional sample total</th>
                      <td className="px-4 py-4 text-right font-serif text-base font-bold tabular-nums text-dark-teal">{formatRupees(sampleBillTotal)}</td>
                      <td className="px-5 py-4" />
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="border-t border-slate-100 px-5 py-4 text-xs leading-5 text-slate-500 sm:px-6">
                The sample totals are internally consistent by design. This screen does not claim that any real bill has been checked.
              </p>
            </article>

            <aside className="space-y-4">
              <section className="rounded-[1.5rem] border border-[#f1e2cf] bg-gradient-to-br from-[#fffaf3] to-white p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ffefd9] text-[#98653b]">
                    <Info size={19} />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#98653b]">Why it was flagged</p>
                    <h2 className="mt-1 font-serif text-xl text-dark-teal">Possible repeat pattern</h2>
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-[#f2e7dc] bg-white/80 p-4 text-xs leading-5 text-slate-600">
                  <p className="font-semibold text-dark-teal">Matched sample details</p>
                  <ul className="mt-2 space-y-1.5">
                    <li>Rows: Lab panel A and Lab panel B</li>
                    <li>Date: 12 May 2025 for both</li>
                    <li>Quantity: 1 each</li>
                    <li>Amount: {formatRupees(4800)} each</li>
                  </ul>
                </div>
                <p className="mt-4 text-xs leading-5 text-slate-600">
                  The descriptions, date, and amount match. This pattern alone cannot tell whether the services were appropriate or repeated in error.
                </p>
                <p className="mt-3 rounded-xl bg-[#fff3e5] p-3 text-xs leading-5 text-[#78593e]">
                  You could verify whether both tests were ordered and performed, and ask for the related order or result details.
                </p>
              </section>

              <section className="rounded-[1.5rem] border border-[#e5e0ed] bg-gradient-to-br from-[#f7f3fb] to-white p-5 sm:p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#75638e]">Rate context</p>
                <h2 className="mt-1 font-serif text-xl text-dark-teal">No rate comparison applied</h2>
                <p className="mt-3 text-xs leading-5 text-slate-600">
                  No published schedule was selected for this fictional example. A reference comparison is meaningful only when its service, location, setting, and effective dates apply.
                </p>
              </section>
            </aside>
          </section>

          <section className="rounded-[1.5rem] border border-[#e5ece6] bg-white p-5 shadow-[0_14px_42px_-34px_rgba(18,59,59,0.5)] sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-deep-sage">Draft a calm follow-up</p>
                <h2 className="mt-1 font-serif text-xl text-dark-teal">Question preview</h2>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">
                  Edit this example before sharing. It is not sent anywhere from this page.
                </p>
              </div>
              <button type="button" onClick={() => void copyQuestion()} className="btn-outline !min-h-10 shrink-0 !px-3 !py-2 text-xs">
                <Copy size={14} /> Copy question
              </button>
            </div>
            <label htmlFor="sample-question" className="sr-only">Editable clarification question</label>
            <textarea
              id="sample-question"
              value={question}
              onChange={(event) => {
                setQuestion(event.target.value);
                setCopyMessage("");
              }}
              rows={4}
              className="mt-4 min-h-28 w-full resize-y rounded-xl border border-slate-200 bg-[#fbfcf9] p-4 text-sm leading-6 text-slate-700 focus:border-deep-sage focus:outline-none focus:ring-2 focus:ring-deep-sage/20"
            />
            <p aria-live="polite" className="mt-2 min-h-5 text-xs text-deep-sage">{copyMessage}</p>
          </section>
        </div>
      </main>
      {isPublicSample && (
        <footer className="border-t border-[#e5ece6] bg-white/70 px-5 py-5 text-center text-[11px] leading-5 text-slate-500 sm:px-8">
          Sample data only. A possible flag is a prompt for human verification, not proof of an error or wrongdoing.
        </footer>
      )}
    </div>
  );
}
