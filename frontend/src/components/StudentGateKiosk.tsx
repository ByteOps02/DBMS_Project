import { useState, useEffect, useRef } from "react";
import { 
  QrCode, 
  AlertTriangle, 
  MapPin, 
  Clock, 
  User, 
  LogOut, 
  LogIn, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  Camera, 
  X,
  Bike,
  CheckCircle2
} from "lucide-react";

import { api } from "../lib/api";
import { toast } from "react-hot-toast";
import { formatIST } from "../lib/dateIST";
import { CustomSelect } from "./ui/CustomSelect";
import { Html5Qrcode } from "html5-qrcode";
import { CAMPUS_GATES } from "../lib/constants";

export function StudentGateKiosk() {
  const [selectedGate, setSelectedGate] = useState<string>(CAMPUS_GATES[0]);

  const [scanInput, setScanInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Quick Vehicle Lookup State
  const [plateQuery, setPlateQuery] = useState("");
  const [vehicleResult, setVehicleResult] = useState<any>(null);
  const [vehicleSearching, setVehicleSearching] = useState(false);
  
  // Last scan result state
  const [lastScan, setLastScan] = useState<{
    success: boolean;
    action: "exit" | "entry";
    movement_type: string;
    message: string;
    expected_in?: string;
    is_overdue?: boolean;
    curfew_delay_minutes?: number;
    strikes?: number;
    is_flagged?: boolean;
    has_extension?: boolean;
    student: {
      id: string;
      roll_number: string;
      name: string;
      phone: string;
      hostel_block: string;
      room_number: string;
      branch: string;
      year: number;
      photo_url?: string | null;
      parent_name: string;
      parent_phone: string;
      status: string;
      late_strike_count?: number;
      is_flagged?: boolean;
    };
  } | null>(null);

  const [recentScans, setRecentScans] = useState<Array<typeof lastScan>>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Play audio chimes
  const playSound = (type: "success" | "warning" | "error" | "siren") => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "success") {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === "warning") {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(370, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === "siren") {
        // High urgency alternating tone
        osc.frequency.setValueAtTime(900, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.2);
        osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.6);
      } else {
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(180, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch {
      // AudioContext unavailable
    }
  };

  // Fast Vehicle Lookup Handler
  const handleVehicleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plateQuery.trim()) return;
    setVehicleSearching(true);
    try {
      const res = await api.vehicles.lookup(plateQuery.trim());
      setVehicleResult(res.pass);
      playSound("success");
      toast.success(`Authorized Vehicle: ${res.pass.license_plate} (${res.pass.owner_name})`);
    } catch (err: unknown) {
      setVehicleResult({ unauthorized: true, plate: plateQuery.trim() });
      playSound("error");
      toast.error(err instanceof Error ? err.message : "Vehicle not authorized");
    } finally {
      setVehicleSearching(false);
    }
  };

  // Keep input focused at all times for hardware laser scanners
  useEffect(() => {
    if (!isCameraActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [lastScan, isCameraActive]);

  const handleScanSubmit = async (value: string) => {
    if (!value || processing) return;
    const clean = value.trim();
    if (!clean) return;

    setProcessing(true);
    setScanInput("");

    try {
      const res = await api.students.scanPass({
        scanData: clean,
        gate: selectedGate
      });

      setLastScan(res);
      setRecentScans((prev) => [res, ...prev.slice(0, 9)]);

      if (res.is_flagged) {
        playSound("siren");
        toast.error(`🚨 HABITUAL DEFAULTER: ${res.student.name} (3/3 Strikes)! Report to Warden.`);
      } else if (res.is_overdue) {
        playSound("warning");
        toast.error(`Late Entry: ${res.student.name} (+${res.curfew_delay_minutes}m)`);
      } else {
        playSound("success");
        toast.success(`${res.action === "exit" ? "Exit" : "Entry"} Approved: ${res.student.name}`);
      }
    } catch (err: unknown) {
      playSound("error");

      const msg = err instanceof Error ? err.message : "Invalid or unrecognized Student ID";
      toast.error(msg);
    } finally {
      setProcessing(false);
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 100);
    }
  };

  // Camera QR Scanner Toggle
  const toggleCamera = async () => {
    if (isCameraActive) {
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          scannerRef.current = null;
        } catch {
          // ignore
        }
      }
      setIsCameraActive(false);
    } else {
      setIsCameraActive(true);
      setTimeout(() => {
        try {
          const scanner = new Html5Qrcode("student-qr-reader");
          scannerRef.current = scanner;
          scanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
              handleScanSubmit(decodedText);
            },
            () => {}
          );
        } catch {
          toast.error("Unable to access camera scanner");
          setIsCameraActive(false);
        }
      }, 300);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Command & Checkpoint Bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-800/40 shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase text-gray-400 dark:text-slate-500 tracking-wider">
                Checkpoint Gate
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live Gate
              </span>
            </div>
            <div className="w-52 sm:w-64 mt-1">
              <CustomSelect
                value={selectedGate}
                onChange={setSelectedGate}
                options={CAMPUS_GATES.map((gate) => ({ value: gate, label: gate }))}

                className="!py-1.5 !px-3 text-xs sm:text-sm font-bold"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`btn btn-sm text-xs font-bold py-2 px-3 shadow-xs ${
              soundEnabled
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                : "btn-secondary"
            }`}
            title="Toggle Audio Feedback"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
            <span>{soundEnabled ? "Audio ON" : "Muted"}</span>
          </button>

          <button
            type="button"
            onClick={toggleCamera}
            className={`btn btn-sm text-xs font-bold py-2 px-3.5 shadow-xs ${
              isCameraActive ? "btn-danger" : "btn-primary"
            }`}
          >
            {isCameraActive ? <X className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
            <span>{isCameraActive ? "Close Camera" : "Camera Scanner"}</span>
          </button>
        </div>
      </div>

      {/* Camera Preview Container if active */}
      {isCameraActive && (
        <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center animate-fadeIn shadow-2xl">
          <div className="relative rounded-2xl overflow-hidden border-2 border-sky-500/50 shadow-inner">
            <div id="student-qr-reader" className="w-full max-w-sm" />
          </div>
          <p className="text-xs text-slate-400 font-medium mt-3 text-center">
            Align Student Pass QR Code within the viewfinder
          </p>
        </div>
      )}

      {/* Main High-Speed Pass Scanner Terminal */}
      <div className="p-1 rounded-3xl bg-gradient-to-r from-sky-500/30 via-indigo-500/30 to-purple-500/30 shadow-xl">
        <div className="p-5 sm:p-6 rounded-[1.4rem] bg-white dark:bg-slate-900 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <QrCode className="w-4 h-4 text-sky-500 animate-pulse" />
              Fast-Track Pass Scanner (QR / Barcode / Roll No)
            </label>
            <span className="hidden sm:inline-flex text-[11px] font-mono text-gray-400">
              Auto-detects Exit & Return
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleScanSubmit(scanInput);
            }}
            className="relative flex items-center"
          >
            <input
              ref={inputRef}
              type="text"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              disabled={processing}
              autoFocus
              placeholder="Scan Pass QR / Barcode or type Roll No (e.g. BT23CSE026)..."
              className="w-full py-3.5 pl-4 pr-32 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm sm:text-base font-mono font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all placeholder:font-sans placeholder:font-normal placeholder:text-gray-400"
            />
            <button
              type="submit"
              disabled={processing || !scanInput.trim()}
              className="absolute right-2 top-2 bottom-2 btn btn-primary !px-5 text-xs sm:text-sm font-bold uppercase tracking-wider shadow-md"
            >
              {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Verify Pass"}
            </button>
          </form>

          <p className="text-xs text-gray-400 dark:text-slate-500 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            Scanner Ready for continuous USB/Bluetooth laser scanner or keyboard entry. Press Enter.
          </p>
        </div>
      </div>

      {/* Quick Vehicle License Plate Lookup Bar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
        <form onSubmit={handleVehicleLookup} className="flex items-center gap-3 flex-1">
          <div className="p-2 rounded-xl bg-purple-600 text-white shrink-0 shadow-sm">
            <Bike className="w-4 h-4" />
          </div>
          <div className="relative flex-1">
            <input
              type="text"
              value={plateQuery}
              onChange={(e) => setPlateQuery(e.target.value.toUpperCase())}
              placeholder="Quick Vehicle Plate Lookup (e.g. MH 31 AB 1234)..."
              className="w-full py-2 pl-3 pr-24 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-800/60 rounded-xl text-xs sm:text-sm font-mono font-bold uppercase outline-none focus:ring-2 focus:ring-purple-500 dark:text-white placeholder:font-sans placeholder:font-normal"
            />
            <button
              type="submit"
              disabled={vehicleSearching || !plateQuery.trim()}
              className="absolute right-1 top-1 bottom-1 px-3.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold uppercase tracking-wider"
            >
              {vehicleSearching ? "..." : "Check"}
            </button>
          </div>
        </form>

        {vehicleResult && (
          <div className="flex items-center gap-2 self-end sm:self-auto text-xs animate-fadeIn">
            {vehicleResult.unauthorized ? (
              <span className="px-3 py-1 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 font-bold flex items-center gap-1.5 border border-red-500/30">
                <AlertTriangle className="w-3.5 h-3.5" /> Unregistered Vehicle ({vehicleResult.plate})
              </span>
            ) : (
              <span className="px-3 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" /> Authorized: {vehicleResult.license_plate} ({vehicleResult.owner_name})
              </span>
            )}
            <button
              onClick={() => { setVehicleResult(null); setPlateQuery(""); }}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>



      {/* Live Scan Verification Result Display */}
      {lastScan && (
        <div
          className={`p-5 sm:p-6 rounded-3xl border-2 shadow-2xl transition-all animate-fadeIn ${
            lastScan.is_overdue
              ? "bg-red-50/90 dark:bg-red-950/40 border-red-500/60"
              : lastScan.action === "exit"
              ? "bg-amber-50/90 dark:bg-amber-950/30 border-amber-500/60"
              : "bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-500/60"
          }`}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 pb-5 border-b border-gray-200/60 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white dark:bg-slate-800 shadow-md border border-gray-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                {lastScan.student.photo_url ? (
                  <img
                    src={lastScan.student.photo_url}
                    alt={lastScan.student.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider ${
                      lastScan.action === "exit"
                        ? "bg-amber-500 text-white"
                        : "bg-emerald-500 text-white"
                    }`}
                  >
                    {lastScan.action === "exit" ? (
                      <>
                        <LogOut className="w-3.5 h-3.5" /> CAMPUS EXIT
                      </>
                    ) : (
                      <>
                        <LogIn className="w-3.5 h-3.5" /> CAMPUS ENTRY
                      </>
                    )}
                  </span>

                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 text-xs font-bold uppercase">
                    {lastScan.movement_type === "hostel_leave" ? "Hostel Leave" : "Day Outing"}
                  </span>
                  
                  {lastScan.is_overdue && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-red-600 text-white text-xs font-black uppercase tracking-wider animate-bounce">
                      <AlertTriangle className="w-3.5 h-3.5" /> LATE ENTRY {lastScan.curfew_delay_minutes ? `(+${lastScan.curfew_delay_minutes}m)` : ""}
                    </span>
                  )}

                  {((lastScan.student as any).is_flagged || (lastScan.student as any).late_strike_count >= 3) ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-purple-600 text-white text-xs font-black uppercase tracking-wider animate-pulse">
                      🚨 HABITUAL DEFAULTER (3/3 Strikes)
                    </span>
                  ) : (lastScan.student as any).late_strike_count > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500 text-white text-xs font-black uppercase tracking-wider">
                      ⚠️ Strike {(lastScan.student as any).late_strike_count}/3
                    </span>
                  ) : null}
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1">
                  {lastScan.student.name}
                </h2>
                <p className="text-xs font-mono font-bold text-gray-600 dark:text-slate-400">
                  {lastScan.student.roll_number} • B.Tech {lastScan.student.branch} (4-Year Degree)
                </p>
              </div>
            </div>

            <div className="text-left md:text-right bg-white/80 dark:bg-slate-900/80 p-3 rounded-2xl border border-gray-200/50 dark:border-slate-800 shadow-xs">
              <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                Expected In-Time / Curfew
              </p>
              <p className="text-base sm:text-lg font-black text-gray-900 dark:text-white flex items-center gap-1.5 md:justify-end">
                <Clock className="w-4 h-4 text-sky-500" />
                {lastScan.expected_in ? formatIST(lastScan.expected_in) : "09:30 PM (IST)"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
            <div className="p-2.5 rounded-xl bg-white/60 dark:bg-slate-900/60">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Hostel & Room</span>
              <p className="font-bold text-gray-900 dark:text-white mt-0.5">
                {lastScan.student.hostel_block}, Rm {lastScan.student.room_number}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/60 dark:bg-slate-900/60">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Student Phone</span>
              <p className="font-mono font-bold text-gray-900 dark:text-white mt-0.5">
                {lastScan.student.phone || "—"}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/60 dark:bg-slate-900/60">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Parent Phone</span>
              <p className="font-mono font-bold text-gray-900 dark:text-white mt-0.5">
                {lastScan.student.parent_phone}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/60 dark:bg-slate-900/60">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Curfew Status</span>
              <p className={`font-bold mt-0.5 ${lastScan.is_overdue ? "text-red-500" : "text-emerald-500"}`}>
                {lastScan.is_overdue ? "Curfew Violated" : "Within Curfew"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Scans Real-time Ticker */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-sky-500" /> Recent Checkpoint Activity
        </h3>

        {recentScans.length === 0 ? (
          <p className="text-xs text-gray-400 py-3 text-center">No student scans recorded yet this session.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800/80">
            {recentScans.map((item, idx) => (
              <div key={idx} className="py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      item?.action === "exit" ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                  />
                  <span className="font-bold text-gray-900 dark:text-white truncate">
                    {item?.student.name}
                  </span>
                  <span className="font-mono text-gray-400">({item?.student.roll_number})</span>
                  <span className="hidden sm:inline text-gray-400">
                    • {item?.student.hostel_block}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      item?.action === "exit"
                        ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                        : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {item?.action}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
