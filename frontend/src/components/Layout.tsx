import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function Layout() {
  return (
    <div className="app-canvas min-h-screen">
      <Sidebar />
      <div className="min-h-screen lg:pl-[264px]">
        <Navbar />
        <main
          id="main-content"
          data-reveal="up"
          className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-7 sm:py-9 xl:px-10"
        >
          <Outlet />
        </main>
        <footer className="px-4 pb-6 text-center text-[11px] leading-5 text-slate-400 sm:px-7 lg:text-left xl:px-10">
          HISAAB helps you understand a bill. Findings are prompts to verify, not accusations.
        </footer>
      </div>
    </div>
  );
}
