import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import toast from "react-hot-toast";
import {
  CheckCircle,
  ScanLine,
  Printer,
  AlertTriangle,
  MapPin,
  Car,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { BackButton } from "./BackButton";
import { PageHeader } from "./PageHeader";
import { api } from "../lib/api";
import { formatIST } from "../lib/dateIST";
import { useAuthStore } from "../store/auth";
import { CustomSelect } from "./ui/CustomSelect";

import type { Database } from "../lib/database.types";

type Visit = Database["public"]["Tables"]["visits"]["Row"] & {
  visitor: Database["public"]["Tables"]["visitors"]["Row"];
  host: Database["public"]["Tables"]["hosts"]["Row"] | null;
};

const CAMPUS_GATES = ["Main Gate", "North Gate", "South Gate", "Administrative Block"];

interface OptimisticVisit {
  name?: string;
  purpose?: string;
  passType?: string;
  vehicle?: string;
  email?: string;
}

export function ScanQrCode() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [optimisticVisit, setOptimisticVisit] = useState<OptimisticVisit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, isLoading } = useAuthStore();
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  const [currentGate, setCurrentGate] = useState(CAMPUS_GATES[0]);
  const [scannerReady, setScannerReady] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        setError("You must be logged in to scan QR codes");
      } else {
        setError(null);
      }
      setCheckingAuth(false);
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (!isAuthenticated || checkingAuth || visit) return;

    const qrCodeDivId = "qr-reader";
    let scanner: Html5Qrcode | null = null;

    const startScanner = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 50));
        scanner = new Html5Qrcode(qrCodeDivId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 30, 
            qrbox: (viewfinderWidth, viewHeight) => {
              const minEdge = Math.min(viewfinderWidth, viewHeight);
              const size = Math.floor(minEdge * 0.70);
              return { width: size, height: size };
            },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            setScanResult(decodedText);
            if (scanner?.isScanning) {
              scanner.stop().catch(console.error);
            }
          },
          () => {}
        );
        setScannerReady(true);
      } catch (err) {
        console.error("Scanner error", err);
        setError("Camera initialization failed. Please check permissions.");
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current = null;
          })
          .catch(console.error);
      }
    };
  }, [isAuthenticated, checkingAuth, visit, scannerKey]);

  useEffect(() => {
    if (!scanResult || !isAuthenticated) return;

    const processVisit = async () => {
      setError(null);
      setVisit(null);
      setIsVerifying(true);

      try {
        let visitId: string;
        try {
          const parsed = JSON.parse(scanResult);
          visitId = parsed.vId || parsed.visitId;

          setOptimisticVisit({
            name: parsed.n || parsed.name,
            purpose: parsed.p || parsed.purpose,
            passType: parsed.t || parsed.passType,
            vehicle: parsed.v || parsed.vehicle,
            email: parsed.e || parsed.email,
          });
        } catch {
          visitId = scanResult.trim();
        }

        const visitData = await api.visits.get(visitId);
        if (!visitData) throw new Error("Visit record not found in database");

        const visit = visitData as Visit;
        if (visit.visitor?.is_blacklisted) {
          setError(
            `SECURITY ALERT: Visitor is on the campus blacklist. Reason: ${visit.visitor.blacklist_reason || "Security violation"}`
          );
          setVisit(visit);
          return;
        }
        const now = new Date();
        if (
          visit.status !== "approved" &&
          visit.status !== "checked_in" &&
          visit.status !== "completed"
        ) {
          throw new Error(`Invalid status: Visit is currently '${visit.status}'.`);
        }

        if (visit.valid_until && new Date(visit.valid_until) < now) {
          throw new Error("Expired Pass: This visit registration is no longer valid.");
        }
        if (
          visit.status === "approved" ||
          (visit.pass_type === "multi_day" && visit.status === "completed")
        ) {
          const updated = await api.visits.update(visitId, {
            check_in_time: now.toISOString(),
            status: "checked_in",
            entry_gate: currentGate,
            updated_at: now.toISOString(),
          });
          toast.success("Visitor Checked-in successfully");
          setVisit(updated as Visit);
        } else if (visit.status === "checked_in") {
          const updated = await api.visits.update(visitId, {
            check_out_time: now.toISOString(),
            status: "completed",
            exit_gate: currentGate,
            updated_at: now.toISOString(),
          });
          toast.success("Visitor Checked-out successfully");
          setVisit(updated as Visit);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Security verification failed";
        setError(msg);
        toast.error(msg);
      } finally {
        setIsVerifying(false);
      }
    };

    processVisit();
  }, [scanResult, isAuthenticated, currentGate]);

  const handleScanAnother = () => {
    setScanResult(null);
    setVisit(null);
    setOptimisticVisit(null);
    setError(null);
    setScannerReady(false);
    setScannerKey((prev) => prev + 1);
  };

  if (checkingAuth)
    return (
      <div className="p-20 text-center animate-pulse font-black uppercase tracking-widest text-xs text-gray-500">
        Verifying Credentials...
      </div>
    );

  return (
    <div className="px-3 xs:px-4 sm:px-6 lg:px-8 pb-12">
      <div className="max-w-7xl mx-auto print:hidden">
        <BackButton />
        <PageHeader
          icon={ScanLine}
          gradient="from-slate-800 to-slate-900"
          title="Security Scanner"
          description="Instant identity verification and traffic management."
        />
      </div>

      <div className="mt-4 sm:mt-8 max-w-2xl mx-auto space-y-4 sm:space-y-6 print:m-0 print:space-y-0">
        {!visit && !optimisticVisit && (
          <div className="bg-white dark:bg-[#0f172a] p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3 sm:gap-4 transition-all duration-300 print:hidden relative z-50">
            <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-600 dark:text-slate-400">
              <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-[9px] sm:text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-widest mb-0.5 sm:mb-1">
                Current Gate Location
              </label>
              <CustomSelect
                value={currentGate}
                onChange={setCurrentGate}
                options={CAMPUS_GATES.map((g) => ({ value: g, label: g }))}
                className="!p-0 !border-none !bg-transparent !ring-0 text-gray-900 dark:text-white font-bold text-xs sm:text-base w-full overflow-hidden"
              />
            </div>
          </div>
        )}

        {!visit && !optimisticVisit && (
          <div className="bg-slate-950 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden relative w-full max-w-md mx-auto aspect-square shadow-2xl border border-slate-800 ring-4 ring-slate-900/10 dark:ring-slate-900/50 print:hidden">
            <div id="qr-reader" className="w-full h-full [&>video]:object-cover"></div>
            {!scannerReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white gap-4">
                <ScanLine className="w-10 h-10 sm:w-12 sm:h-12 animate-pulse text-indigo-400" />
                <p className="font-bold tracking-widest uppercase text-[9px] sm:text-[10px] opacity-60">
                  Initializing...
                </p>
              </div>
            )}
            {scannerReady && (
              <div className="absolute inset-0 pointer-events-none border-[30px] sm:border-[60px] border-black/30">
                <div className="w-full h-full border-2 border-indigo-500/50 rounded-2xl relative">
                  <div className="absolute top-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-t-4 border-l-4 border-indigo-500 -mt-1 -ml-1"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-t-4 border-r-4 border-indigo-500 -mt-1 -mr-1"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-b-4 border-l-4 border-indigo-500 -mb-1 -ml-1"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-b-4 border-r-4 border-indigo-500 -mb-1 -mr-1"></div>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/10 border-2 border-red-100 dark:border-red-900/30 p-6 rounded-3xl flex items-start gap-4">
            <AlertTriangle className="w-8 h-8 text-red-600 shrink-0" />
            <div>
              <h3 className="font-black text-red-900 dark:text-red-400 uppercase tracking-tight">
                Access Denied
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 font-medium leading-relaxed mt-1">
                {error}
              </p>
              <button
                onClick={handleScanAnother}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                Restart Scanner
              </button>
            </div>
          </div>
        )}

        {(visit || optimisticVisit) && !error && (
          <div id="generated-pass" className="print:m-0 w-full flex justify-center animate-in zoom-in-95 duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border border-slate-200 dark:border-slate-800 w-full shadow-2xl">
              <div
                className={`p-6 sm:p-8 transition-colors duration-500 flex items-center justify-between ${
                  isVerifying
                    ? "bg-gradient-to-r from-slate-600 to-slate-700 animate-pulse"
                    : visit?.status === "checked_in"
                      ? "bg-gradient-to-r from-emerald-500 to-teal-600"
                      : "bg-gradient-to-r from-indigo-500 to-blue-600"
                } text-white`}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  {isVerifying ? (
                    <Clock className="w-7 h-7 sm:w-8 sm:h-8 animate-spin" />
                  ) : visit?.status === "checked_in" ? (
                    <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8" />
                  ) : (
                    <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8" />
                  )}
                  <div>
                    <h2 className="font-black uppercase tracking-widest text-sm sm:text-base">
                      {isVerifying
                        ? "Verifying..."
                        : visit?.status === "checked_in"
                          ? "Checked In"
                          : "Verified"}
                    </h2>
                    <p className="text-[10px] sm:text-xs opacity-80 font-medium">
                      {isVerifying ? "Please wait" : formatIST(new Date().toISOString())}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] sm:text-xs font-black bg-white/20 backdrop-blur-md px-4 py-1.5 sm:py-2 rounded-full uppercase tracking-widest">
                  {(visit?.pass_type || optimisticVisit?.passType || "Single Day").replace("_", " ")}
                </span>
              </div>

              <div className="p-6 sm:p-8 space-y-8">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-8 text-center sm:text-left">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-4xl sm:text-5xl font-black text-slate-300 overflow-hidden shadow-lg border-4 border-white dark:border-slate-800 ring-4 ring-slate-50 dark:ring-slate-900/50 shrink-0">
                    {visit?.visitor?.photo_url ? (
                      <img src={visit.visitor.photo_url} className="w-full h-full object-cover" />
                    ) : (
                      (visit?.visitor?.name || optimisticVisit?.name || "?").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter truncate leading-none mb-3">
                      {visit?.visitor?.name || optimisticVisit?.name}
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-center sm:items-start justify-center sm:justify-start">
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/50">
                        {visit?.visitor?.phone || optimisticVisit?.email || "N/A"}
                      </p>
                      {visit?.visitor?.email && (
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg truncate max-w-full border border-slate-200 dark:border-slate-700/50">
                          {visit.visitor.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-6 border-t border-slate-100 dark:border-slate-800/50">
                  <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 flex flex-col justify-center">
                    <span className="block text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                      Purpose
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 truncate capitalize">
                      {(visit?.purpose || optimisticVisit?.purpose || "").replace("_", " ")}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 flex flex-col justify-center">
                    <span className="block text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                      Host
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                      {visit?.host?.name || "Pending..."}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 flex flex-col justify-center">
                    <span className="block text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                      Vehicle
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 uppercase truncate">
                      <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500 shrink-0" />
                      <span className="truncate">{visit?.vehicle_number || optimisticVisit?.vehicle || "None"}</span>
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 flex flex-col justify-center">
                    <span className="block text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                      Gate
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
                      <span className="truncate">{currentGate}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 print-hide">
                  <button
                    onClick={handleScanAnother}
                    className="flex-1 py-3.5 sm:py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-[11px] active:scale-95 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 focus:ring-4 focus:ring-slate-900/20"
                  >
                    Scan Next Visitor
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-6 py-3.5 sm:py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shadow-sm flex items-center justify-center active:scale-95 border border-slate-200 dark:border-slate-700/50"
                    title="Print Receipt"
                  >
                    <Printer className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
