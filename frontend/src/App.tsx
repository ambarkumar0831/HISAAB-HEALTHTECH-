import { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate, Outlet } from "react-router-dom";
import Lenis from "lenis";
import { Loader2 } from "lucide-react";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import AuditResults from "./pages/AuditResults";
import History from "./pages/History";
import Benchmarks from "./pages/Benchmarks";
import About from "./pages/About";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import GetStarted from "./pages/GetStarted";
import DemoAudit from "./pages/DemoAudit";
import Layout from "./components/Layout";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

function ProtectedWorkspace() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mint-50">
        <Loader2 className="h-8 w-8 animate-spin text-deep-sage" aria-label="Checking your session" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

function ScrollExperience() {
  const { pathname } = useLocation();

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nativeScroll = reducedMotion || window.matchMedia("(pointer: coarse)").matches;
    const lenis = nativeScroll
      ? null
      : new Lenis({
          autoRaf: true,
          anchors: { offset: -84 },
          lerp: 0.1,
          smoothWheel: true,
          wheelMultiplier: 0.9,
        });

    lenis?.scrollTo(0, { immediate: true });

    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (reducedMotion || !("IntersectionObserver" in window)) {
      targets.forEach((target) => target.classList.add("is-visible"));
      return () => lenis?.destroy();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -48px 0px" }
    );

    targets.forEach((target) => observer.observe(target));
    targets.forEach((target) => {
      const { top, bottom } = target.getBoundingClientRect();
      if (top < window.innerHeight && bottom > 0) {
        target.classList.add("is-visible");
        observer.unobserve(target);
      }
    });

    return () => {
      observer.disconnect();
      lenis?.destroy();
    };
  }, [pathname]);

  return null;
}

function ScrollProgress() {
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
        progressRef.current?.style.setProperty("transform", `scaleX(${progress})`);
      });
    };

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return <div ref={progressRef} aria-hidden="true" className="scroll-progress" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollExperience />
        <ScrollProgress />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/sample" element={<DemoAudit />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<GetStarted />} />
          <Route path="/get-started" element={<GetStarted />} />

          <Route element={<ProtectedWorkspace />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/about" element={<About />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/audit/:id" element={<AuditResults />} />
              <Route path="/history" element={<History />} />
              <Route path="/benchmarks" element={<Benchmarks />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/demo-audit" element={<DemoAudit />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
