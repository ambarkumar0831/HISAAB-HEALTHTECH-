import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  Calculator,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  FileText,
  HeartPulse,
  HelpCircle,
  ListChecks,
  MessageCircle,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { formatRupees, sampleBillItems, sampleBillTotal } from "../data/sampleBill";

const reviewItems = sampleBillItems.map((item) => ({
  name: item.description,
  detail: item.dateAndQuantity,
  amount: formatRupees(item.total),
  flagged: item.possibleRepeat,
  id: item.id,
}));

const steps = [
  {
    number: "01",
    title: "Add a bill",
    description: "Upload a photo or PDF and review the extracted details.",
    icon: ScanLine,
  },
  {
    number: "02",
    title: "Check the details",
    description: "See calculations and why a line may need a closer look.",
    icon: FileCheck2,
  },
  {
    number: "03",
    title: "Ask with confidence",
    description: "Prepare a clear question to review with the hospital team.",
    icon: MessageCircle,
  },
];

const reviewChecks = [
  {
    title: "Check the arithmetic",
    description: "Compare quantities, unit rates, and line totals to help spot calculations worth reviewing.",
    icon: Calculator,
    tone: "bg-[#e9f4ed] text-deep-sage",
  },
  {
    title: "Notice possible repeats",
    description: "See similar entries together. A repeated service can be appropriate, so check the dates and context.",
    icon: ListChecks,
    tone: "bg-[#f1edf8] text-[#75638e]",
  },
  {
    title: "Add helpful context",
    description: "View reference benchmarks when available, with a reminder that rates vary by place and circumstances.",
    icon: ClipboardCheck,
    tone: "bg-[#eaf2f5] text-[#527889]",
  },
  {
    title: "Prepare a follow-up",
    description: "Create a readable summary and a draft letter you can review before deciding what to share.",
    icon: MessageCircle,
    tone: "bg-[#fbf0e5] text-[#a06b38]",
  },
];

const faqs = [
  {
    question: "Does a flag mean the hospital made a mistake?",
    answer:
      "No. A flag is only a prompt to check a bill detail. Repeated services, different rates, or unusual totals can have valid explanations. HISAAB cannot determine intent or replace a conversation with your care team.",
  },
  {
    question: "What can I upload in this preview?",
    answer:
      "The current preview accepts PDF, JPG, and PNG files up to 10 MB. Text extraction can be imperfect, so review the extracted details against your original bill.",
  },
  {
    question: "Are the benchmark comparisons exact prices?",
    answer:
      "No. Reference rates may not apply to your hospital, location, insurance, or treatment. Treat a comparison as context to ask about, not a price guarantee.",
  },
  {
    question: "Is this ready for real patient records?",
    answer:
      "Not yet. This prototype stores uploaded bills and generated reports on the backend's local filesystem, not Supabase Storage. Use synthetic data until private storage, retention, and deployment safeguards are in place.",
  },
];

function Brand() {
  return (
    <Link
      to="/"
      className="group inline-flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-sage focus-visible:ring-offset-2"
      aria-label="HISAAB home"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-dark-teal text-sm font-bold text-white shadow-sm transition-transform group-hover:rotate-[-5deg]">
        ₹
      </span>
      <span>
        <span className="block font-serif text-lg font-bold leading-tight tracking-tight text-dark-teal">HISAAB</span>
        <span className="hidden text-[10px] font-medium tracking-wide text-slate-500 sm:block">Bill clarity, with care</span>
      </span>
    </Link>
  );
}

function BillPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[540px]">
      <div className="hero-orbit pointer-events-none absolute -right-7 -top-8 h-48 w-48 rounded-full bg-lavender/75 blur-3xl" />
      <div className="hero-orbit pointer-events-none absolute -bottom-12 -left-7 h-56 w-56 rounded-full bg-sage/70 blur-3xl [animation-delay:-8s]" />
      <div className="hero-preview-float relative rounded-[1.65rem] border border-white/80 bg-white/70 p-2.5 shadow-[0_32px_100px_-46px_rgba(18,59,59,0.5)] backdrop-blur-md sm:p-3.5">
        <div className="overflow-hidden rounded-[1.2rem] border border-[#e7eee8] bg-[#fffefa]">
          <div className="flex h-10 items-center justify-between border-b border-[#edf1ed] bg-[#fbfcf9] px-4">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="browser-dot h-2.5 w-2.5 rounded-full bg-[#e89b8d]" />
              <span className="browser-dot h-2.5 w-2.5 rounded-full bg-[#eac578]" />
              <span className="browser-dot h-2.5 w-2.5 rounded-full bg-[#8ebc9a]" />
            </div>
            <div className="rounded-full bg-[#f0f3ef] px-16 py-1 text-[9px] tracking-wide text-slate-400 sm:px-20">
              hisaab.health / preview
            </div>
            <span className="w-10" />
          </div>

          <div className="grid gap-5 p-4 sm:grid-cols-[0.86fr_1.14fr] sm:gap-6 sm:p-6">
            <div className="flex flex-col justify-center">
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#eaf4ed] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-deep-sage">
                <span className="h-1.5 w-1.5 rounded-full bg-deep-sage" />
                Bill clarity, with care
              </div>
              <h2 className="mt-4 font-serif text-2xl leading-tight tracking-tight text-dark-teal sm:text-[2rem]">
                Your bill,
                <br />
                explained.
              </h2>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                A patient-friendly review of a synthetic sample bill.
              </p>
              <div className="mt-5 flex items-center gap-2 text-[10px] font-medium text-slate-500">
                <ShieldCheck size={14} className="text-deep-sage" />
                Evidence first. You review every flag.
              </div>
            </div>

            <div className="rounded-2xl border border-[#e9eee9] bg-white p-4 shadow-[0_8px_24px_-22px_rgba(18,59,59,0.5)] sm:p-5">
              <div className="flex items-center justify-between gap-3 border-b border-dashed border-slate-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sage/60 text-dark-teal">
                    <HeartPulse size={16} />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold text-dark-teal">Fictional inpatient bill</p>
                    <p className="mt-0.5 text-[9px] text-slate-400">Synthetic · no patient data</p>
                  </div>
                </div>
                <span className="rounded-full bg-[#eef5ef] px-2.5 py-1 text-[8px] font-bold tracking-wide text-deep-sage">REVIEW</span>
              </div>

              <div className="space-y-0.5 py-2">
                {reviewItems.map((item) => (
                  <div key={item.id} className={`flex items-center justify-between gap-3 rounded-lg px-2.5 py-2.5 ${item.flagged ? "bg-[#fff4ea]" : ""}`}>
                    <div className="min-w-0">
                      <p className={`truncate text-[10px] font-semibold ${item.flagged ? "text-[#8f6340]" : "text-slate-700"}`}>{item.name}</p>
                      <p className="mt-0.5 truncate text-[9px] text-slate-400">{item.detail}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-semibold ${item.flagged ? "text-[#9b6634]" : "text-slate-700"}`}>{item.amount}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-[10px] text-slate-500">Sample total</span>
                <span className="font-serif text-lg font-bold text-dark-teal">{formatRupees(sampleBillTotal)}</span>
              </div>

              <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-[#f1e5d8] bg-[#fffaf4] p-3">
                <HelpCircle size={14} className="mt-0.5 shrink-0 text-[#9b6634]" />
                <p className="text-[9px] leading-4 text-slate-600">
                  Two matching lab-panel lines to verify. A flag is a question—not a conclusion.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-4 left-5 hidden items-center gap-2 rounded-xl border border-white/80 bg-white/90 px-3.5 py-2.5 text-[10px] font-semibold text-slate-600 shadow-lg backdrop-blur sm:flex">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sage/60 text-deep-sage">
            <Check size={12} />
          </span>
          Review ready · you stay in control
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen overflow-hidden bg-ivory text-slate-900">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-white/70 bg-[#f7faf6]/85 backdrop-blur-xl">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8"
        >
          <Brand />
          <div className="hidden items-center gap-8 text-xs font-semibold tracking-wide text-slate-600 md:flex">
            <a href="#how" className="transition-colors hover:text-deep-sage">How it works</a>
            <a href="#checks" className="transition-colors hover:text-deep-sage">What we check</a>
            <a href="#safety" className="transition-colors hover:text-deep-sage">Your care comes first</a>
            <Link to="/sample" className="transition-colors hover:text-deep-sage">Sample review</Link>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="rounded-xl px-3 py-2 text-xs font-semibold text-dark-teal transition hover:bg-white/75 sm:px-4">
              Sign in
            </Link>
            <Link
              to="/signup"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#123733] px-4 py-2 text-xs font-semibold text-white shadow-[0_8px_20px_-12px_rgba(18,55,51,0.65)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0e302c] hover:shadow-[0_12px_28px_-12px_rgba(18,55,51,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#123733] focus-visible:ring-offset-2 sm:px-5"
            >
              Create account <ArrowRight size={15} />
            </Link>
          </div>
        </nav>
      </header>

      <main id="main-content">
        <section className="relative isolate px-5 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-14 lg:pb-24 lg:pt-16">
          <div className="hero-orbit pointer-events-none absolute -right-40 top-0 -z-10 h-[34rem] w-[34rem] rounded-full bg-mint-100/80 blur-3xl" />
          <div className="pointer-events-none absolute -left-48 top-20 -z-10 h-[28rem] w-[28rem] rounded-full bg-lavender/55 blur-3xl" />
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.94fr_1.06fr] lg:gap-10">
            <div data-reveal="left" className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#dcebe0] bg-white/75 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-deep-sage shadow-sm">
                <Sparkles size={13} />
                Patient-first bill review
              </div>
              <h1 className="mt-6 max-w-[650px] font-sans text-[clamp(3.2rem,7.2vw,6rem)] font-semibold leading-[0.98] tracking-[-0.065em] text-dark-teal">
                Make sense of
                <br />
                <span className="font-serif italic font-normal text-deep-sage">every line.</span>
              </h1>
              <p className="mt-6 max-w-lg text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
                Turn a dense hospital bill into a clearer view of its items, calculations, and questions you may want to ask.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/signup"
                  className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#123733] px-6 py-3 font-semibold text-white shadow-[0_12px_28px_-16px_rgba(18,55,51,0.65)] transition-all duration-200 hover:-translate-y-1 hover:bg-[#1b5049] hover:shadow-[0_20px_36px_-16px_rgba(18,55,51,0.48)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#123733] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  Create your workspace <ArrowRight size={17} className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
                </Link>
                <Link to="/sample" className="btn-outline">
                  Try the sample <ArrowRight size={15} />
                </Link>
              </div>
              <a href="#how" className="mt-4 inline-flex min-h-9 items-center gap-2 rounded-lg text-xs font-semibold text-deep-sage transition-colors hover:text-dark-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-sage focus-visible:ring-offset-2">
                See how it works <ArrowDown size={14} />
              </a>
              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 text-[11px] font-medium text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sage/65 text-deep-sage"><Check size={12} /></span>
                  Evidence first
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sage/65 text-deep-sage"><ShieldCheck size={12} /></span>
                  You review every flag
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sage/65 text-deep-sage"><MessageCircle size={11} /></span>
                  Questions, not accusations
                </span>
              </div>
            </div>
            <div className="relative px-1 py-5 sm:px-5 lg:px-0">
              <BillPreview />
            </div>
          </div>
        </section>

        <section className="border-y border-[#e6ede7] bg-white/70 px-5 py-5 sm:px-8">
          <div className="mx-auto grid max-w-7xl gap-4 text-xs sm:grid-cols-3 sm:gap-6">
            {[
              { title: "A second look at the math", detail: "Calculations are checked separately.", icon: Calculator },
              { title: "Context, not a verdict", detail: "A possible issue stays a question.", icon: HelpCircle },
              { title: "You choose what comes next", detail: "Review the details before sharing.", icon: ShieldCheck },
            ].map(({ title, detail, icon: Icon }) => (
              <div key={title} className="flex items-center gap-3 sm:justify-center">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#edf5ef] text-deep-sage">
                  <Icon size={18} />
                </span>
                <span>
                  <span className="block font-semibold text-dark-teal">{title}</span>
                  <span className="mt-1 block text-slate-500">{detail}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="scroll-mt-24 bg-white/75 px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <div data-reveal="up" className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-deep-sage">A simple, patient-first flow</p>
                <h2 className="mt-3 font-serif text-3xl tracking-tight text-dark-teal sm:text-4xl">A clearer view, in three steps.</h2>
              </div>
              <p className="max-w-md text-xs leading-6 text-slate-500 sm:text-sm">
                Every result stays understandable, so you can decide what deserves a follow-up.
              </p>
            </div>
            <div className="mt-9 grid gap-3 md:grid-cols-3">
              {steps.map(({ number, title, description, icon: Icon }, index) => (
                <article
                  key={number}
                  data-reveal="up"
                  style={{ transitionDelay: `${index * 100}ms` }}
                  className="group rounded-2xl border border-[#e5ece6] bg-[#fbfcf9] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#c8dfcf] hover:bg-white hover:shadow-[0_24px_50px_-40px_rgba(18,59,59,0.55)] sm:p-6"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-8 min-w-8 items-center justify-center rounded-xl bg-[#e7f2e9] px-2 text-[10px] font-bold text-deep-sage">{number}</span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-deep-sage shadow-sm transition-transform duration-300 group-hover:rotate-[-5deg] group-hover:scale-105">
                      <Icon size={18} />
                    </span>
                  </div>
                  <h3 className="mt-6 font-serif text-xl text-dark-teal">{title}</h3>
                  <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="checks" className="scroll-mt-24 px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <div data-reveal="up" className="max-w-2xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-deep-sage">A thoughtful first pass</p>
              <h2 className="mt-3 font-serif text-3xl tracking-tight text-dark-teal sm:text-4xl">Useful details, without the overwhelm.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                HISAAB organizes what the bill says and highlights places you may want to verify.
              </p>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {reviewChecks.map(({ title, description, icon: Icon, tone }, index) => (
                <article
                  key={title}
                  data-reveal="up"
                  style={{ transitionDelay: `${index * 70}ms` }}
                  className="group rounded-2xl border border-[#e5ece6] bg-white/80 p-5 shadow-[0_16px_40px_-36px_rgba(18,59,59,0.5)] transition-all duration-300 hover:-translate-y-1 hover:border-[#c8dfcf] hover:shadow-[0_24px_50px_-38px_rgba(18,59,59,0.55)]"
                >
                  <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
                    <Icon size={19} />
                  </span>
                  <h3 className="mt-5 font-serif text-lg text-dark-teal">{title}</h3>
                  <p className="mt-2 text-xs leading-6 text-slate-500">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="safety" className="scroll-mt-24 px-5 pb-16 sm:px-8 sm:pb-20">
          <div data-reveal="scale" className="mx-auto grid max-w-7xl overflow-hidden rounded-[1.75rem] border border-[#dfeae2] bg-gradient-to-br from-[#eef7f0] via-[#f5f8f3] to-[#f1edf7] md:grid-cols-[1fr_auto]">
            <div className="max-w-3xl p-6 sm:p-9 lg:p-12">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-deep-sage">
                <ShieldCheck size={13} />
                The HISAAB approach
              </div>
              <h2 className="mt-5 font-serif text-3xl leading-tight tracking-tight text-dark-teal sm:text-4xl">
                We don&apos;t dispute care.
                <br />
                <span className="text-deep-sage">We help you check the details.</span>
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
                A bill can be confusing without anyone doing anything wrong. HISAAB helps you compare what is written, understand possible discrepancies, and decide whether to ask for clarification.
              </p>
              <div className="mt-6 grid gap-3 text-xs text-slate-600 sm:grid-cols-2">
                <p className="flex items-start gap-2.5 rounded-xl border border-white/80 bg-white/65 p-3.5 leading-5">
                  <Check size={15} className="mt-0.5 shrink-0 text-deep-sage" />
                  Repeated care or different rates can have valid explanations.
                </p>
                <p className="flex items-start gap-2.5 rounded-xl border border-white/80 bg-white/65 p-3.5 leading-5">
                  <Check size={15} className="mt-0.5 shrink-0 text-deep-sage" />
                  You decide what to discuss with your hospital team.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center px-6 pb-7 md:px-10 md:py-10">
              <div className="max-w-xs rounded-2xl border border-white/90 bg-white/75 p-5 shadow-[0_16px_40px_-24px_rgba(18,59,59,0.35)]">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e7f2e9] text-deep-sage">
                  <FileText size={20} />
                </span>
                <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-deep-sage">A note on this preview</p>
                <p className="mt-2 text-xs leading-5 text-slate-600">
                  Uploaded bills and reports are stored on the backend&apos;s local filesystem, not Supabase Storage. Please use synthetic data for now.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 bg-white/75 px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
            <div data-reveal="left">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-deep-sage">Good to know</p>
              <h2 className="mt-3 font-serif text-3xl tracking-tight text-dark-teal sm:text-4xl">A few careful answers.</h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">
                Clear expectations matter when the details are personal.
              </p>
            </div>
            <div className="space-y-3">
              {faqs.map(({ question, answer }, index) => (
                <details
                  key={question}
                  data-reveal="up"
                  style={{ transitionDelay: `${index * 60}ms` }}
                  className="group rounded-2xl border border-[#e5ece6] bg-[#fbfcf9] px-5 py-4 transition-colors open:bg-white"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-dark-teal [&::-webkit-details-marker]:hidden">
                    {question}
                    <ChevronRight size={17} className="shrink-0 text-deep-sage transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="max-w-3xl pt-3 text-xs leading-6 text-slate-500">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:px-8 sm:py-20">
          <div data-reveal="up" className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-2xl bg-dark-teal px-6 py-7 text-white sm:flex-row sm:items-center sm:px-9">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-sage">Clarity starts with a question</p>
              <h2 className="mt-2 font-serif text-2xl tracking-tight sm:text-3xl">Take a calmer, closer look at your bill.</h2>
              <p className="mt-2 max-w-xl text-xs leading-5 text-white/70">Create an account to enter your workspace. Use synthetic data in this preview.</p>
            </div>
            <Link to="/signup" className="group inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-dark-teal shadow-[0_8px_24px_-16px_rgba(0,0,0,0.45)] transition-all duration-200 hover:-translate-y-1 hover:bg-[#dceee2] hover:shadow-[0_16px_30px_-16px_rgba(0,0,0,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-dark-teal motion-reduce:transition-none motion-reduce:hover:translate-y-0">
              Create your workspace <ChevronRight size={16} className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e7ece7] bg-[#f4f8f3] px-5 py-7 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <Brand />
            <span className="hidden h-4 w-px bg-slate-300 sm:block" />
            <span className="hidden sm:inline">Clarity for every line.</span>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link to="/sample" className="transition-colors hover:text-dark-teal">Sample review</Link>
            <Link to="/about" className="transition-colors hover:text-dark-teal">About HISAAB</Link>
            <Link to="/dashboard" className="transition-colors hover:text-dark-teal">Workspace</Link>
            <a href="#how" className="transition-colors hover:text-dark-teal">How it works</a>
            <a href="#checks" className="transition-colors hover:text-dark-teal">What we check</a>
            <a href="#safety" className="transition-colors hover:text-dark-teal">Care &amp; privacy</a>
            <a href="#faq" className="transition-colors hover:text-dark-teal">FAQs</a>
          </div>
          <p className="max-w-sm text-[10px] leading-5 sm:text-right">Not medical, legal, or financial advice. A flagged detail is a prompt to verify, not proof of an error.</p>
        </div>
      </footer>
    </div>
  );
}
