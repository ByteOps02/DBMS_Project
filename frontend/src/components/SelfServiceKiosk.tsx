import { useState, useRef, useEffect } from "react";
import {
  UserCheck,
  Package,
  Briefcase,
  Crown,
  Camera,
  Printer,
  RefreshCw,
  Clock,
  Sparkles,
  ArrowRight,
  Building,
  RotateCcw,
} from "lucide-react";
import QRCode from "qrcode";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { BackButton } from "./BackButton";

type KioskCategory = "guest" | "courier" | "interview" | "vip";

export function SelfServiceKiosk() {
  const [step, setStep] = useState<"category" | "details" | "photo" | "badge">("category");
  const [category, setCategory] = useState<KioskCategory>("guest");
  const [currentTime, setCurrentTime] = useState("");

  // Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [purpose, setPurpose] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [photoData, setPhotoData] = useState<string | null>(null);

  // Submission & Result
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdVisit, setCreatedVisit] = useState<any | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);


  // Camera video ref
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Live IST Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Camera start / stop
  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 400, height: 400, facingMode: "user" },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      toast.error("Camera access not available or denied.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, 320, 320);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setPhotoData(dataUrl);
      stopCamera();
      toast.success("Visitor photo captured!");
    }
  };

  const handleCategorySelect = (cat: KioskCategory) => {
    setCategory(cat);
    if (cat === "courier") {
      setPurpose("Package / Document Delivery to Reception / Hostel");
    } else if (cat === "interview") {
      setPurpose("Recruitment Interview / Assessment");
    } else if (cat === "vip") {
      setPurpose("Official Academic / BoG Guest Visit");
    } else {
      setPurpose("");
    }
    setStep("details");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !purpose.trim()) {
      toast.error("Please fill in your Name, Phone, and Purpose.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.visits.selfServiceKiosk({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        company: company.trim() || undefined,
        purpose: purpose.trim(),
        category,
        vehicle_number: vehicleNumber.trim() || undefined,
        photo_url: photoData || undefined,
      });

      setCreatedVisit(res.visit);
      try {
        const qrUrl = await QRCode.toDataURL(res.qrPayload, {
          width: 250,
          margin: 2,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
        setQrCodeUrl(qrUrl);
      } catch {
        // fallback
      }
      setStep("badge");
      toast.success("Self check-in completed! Here is your entry badge.");
    } catch (err: any) {
      toast.error(err.message || "Failed to process self check-in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    stopCamera();
    setName("");
    setPhone("");
    setEmail("");
    setCompany("");
    setPurpose("");
    setVehicleNumber("");
    setPhotoData(null);
    setCreatedVisit(null);
    setQrCodeUrl(null);
    setStep("category");
  };


  return (
    <div className="min-h-[85vh] flex flex-col justify-between max-w-5xl mx-auto px-4 sm:px-6 py-6 animate-fadeIn">
      {/* Top Kiosk Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <BackButton />
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-md shrink-0">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                Campus Self-Check-In Kiosk
              </h1>
              <span className="px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 text-xs font-bold uppercase tracking-wider border border-sky-500/20">
                Reception Terminal
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 font-medium mt-0.5">
              Touchscreen fast visitor registration & instant badge printing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm font-mono font-bold text-gray-700 dark:text-slate-300 shadow-inner">
            <Clock className="w-4 h-4 text-sky-500" />
            <span>{currentTime || "IST"}</span>
          </div>

          {step !== "category" && (
            <button
              onClick={handleReset}
              className="btn btn-sm btn-secondary text-xs sm:text-sm font-bold flex items-center gap-1.5 py-2.5 px-3.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Start Over</span>
            </button>
          )}
        </div>
      </div>

      {/* Step 1: Big Touch Category Tiles */}
      {step === "category" && (
        <div className="my-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
              Welcome to Campus! Please select your visit type:
            </h2>
            <p className="text-base text-gray-500 dark:text-slate-400 font-medium">
              Tap an option below to begin instant self-registration
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
            {/* General Guest */}
            <button
              onClick={() => handleCategorySelect("guest")}
              className="group p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-800 hover:border-sky-500 dark:hover:border-sky-500 text-left transition-all duration-300 shadow-sm hover:shadow-2xl hover:-translate-y-1 flex items-start gap-4"
            >
              <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform shadow-xs shrink-0">
                <UserCheck className="w-7 h-7" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                  General Walk-In Visitor
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                  Meeting faculty, students, academic departments, or campus tour.
                </p>
                <div className="pt-1.5 flex items-center gap-1.5 text-sm font-bold text-sky-600 dark:text-sky-400">
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>

            {/* Courier & Delivery */}
            <button
              onClick={() => handleCategorySelect("courier")}
              className="group p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 text-left transition-all duration-300 shadow-sm hover:shadow-2xl hover:-translate-y-1 flex items-start gap-4"
            >
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform shadow-xs shrink-0">
                <Package className="w-7 h-7" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  Courier / Package Drop-Off
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                  Amazon, Flipkart, Swiggy, Speed Post, or logistics parcel delivery.
                </p>
                <div className="pt-1.5 flex items-center gap-1.5 text-sm font-bold text-amber-600 dark:text-amber-400">
                  <span>Fast Drop-Off</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>

            {/* Interview & Recruitment */}
            <button
              onClick={() => handleCategorySelect("interview")}
              className="group p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-500 text-left transition-all duration-300 shadow-sm hover:shadow-2xl hover:-translate-y-1 flex items-start gap-4"
            >
              <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform shadow-xs shrink-0">
                <Briefcase className="w-7 h-7" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  Candidate / Job Interview
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                  Attending recruitment, academic viva, or corporate placement round.
                </p>
                <div className="pt-1.5 flex items-center gap-1.5 text-sm font-bold text-purple-600 dark:text-purple-400">
                  <span>Candidate Entry</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>

            {/* VIP & BoG Dignitary */}
            <button
              onClick={() => handleCategorySelect("vip")}
              className="group p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-transparent dark:bg-slate-900 border-2 border-amber-400/40 hover:border-amber-500 text-left transition-all duration-300 shadow-sm hover:shadow-2xl hover:-translate-y-1 flex items-start gap-4"
            >
              <div className="p-3.5 rounded-2xl bg-amber-500/20 text-amber-500 group-hover:scale-110 transition-transform shadow-xs shrink-0">
                <Crown className="w-7 h-7" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400 transition-colors">
                  VIP & Academic Dignitary
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                  Board of Governors, Guest Speakers, Government Officials, and Corporate Recruiters.
                </p>
                <div className="pt-1.5 flex items-center gap-1.5 text-sm font-bold text-amber-600 dark:text-amber-400">
                  <span>Priority Clearance</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>
          </div>
        </div>
      )}


      {/* Step 2: Form Details & Webcam Capture */}
      {step === "details" && (
        <form onSubmit={handleSubmit} className="my-6 space-y-6 max-w-3xl mx-auto w-full">
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white capitalize">
                  {category === "vip" ? "👑 VIP Dignitary Check-In" : category === "courier" ? "📦 Courier Drop-Off" : "Visitor Information"}
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Please enter your basic contact details for badge generation
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep("category")}
                className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-white underline"
              >
                Change Type
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5">
                  Mobile Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9823456789"
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5">
                  Email Address <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. rajesh@gmail.com"
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5">
                  Company / Organization <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder={category === "courier" ? "e.g. BlueDart / Amazon" : "e.g. TCS / Self"}
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5">
                  Purpose of Visit <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Meeting Dean of Academics / Delivering package to Hostel A"
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5">
                  Vehicle License Plate <span className="text-gray-400">(If driving)</span>
                </label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. MH 31 AB 1234"
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-sm font-mono font-bold uppercase text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Photo Capture Preview Block */}
              <div className="flex flex-col justify-end">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5">
                  Visitor Photo Badge
                </label>
                <div className="flex items-center gap-3">
                  {photoData ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={photoData}
                        alt="Captured"
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoData(null);
                          startCamera();
                        }}
                        className="btn btn-sm btn-secondary text-xs"
                      >
                        Retake Photo
                      </button>
                    </div>
                  ) : isCameraActive ? (
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-black border border-slate-700">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                      </div>
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="btn btn-sm btn-primary text-xs"
                      >
                        Snap Photo
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="btn btn-sm btn-secondary text-xs font-bold flex items-center gap-2 py-3 px-4"
                    >
                      <Camera className="w-4 h-4 text-sky-500" />
                      <span>Take Photo for Badge</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep("category")}
                className="btn btn-secondary px-6"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary px-8 py-3 text-sm font-bold flex items-center gap-2 shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Printing Badge...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Complete & Print Badge</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Step 3: Generated Thermal Badge & QR */}
      {step === "badge" && createdVisit && (
        <div className="my-6 space-y-6 max-w-md mx-auto w-full animate-fadeIn">
          {/* Printable Thermal Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border-2 border-sky-500/40 dark:border-sky-500/30 shadow-2xl space-y-5 print:border-none print:shadow-none">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-black tracking-widest uppercase text-sky-600 dark:text-sky-400">
                  IIIT NAGPUR • CAMPUS PASS
                </span>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">
                  {createdVisit.visitor?.name || name}
                </h3>
              </div>
              <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase ${
                createdVisit.is_vip
                  ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-400/40"
                  : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
              }`}>
                {createdVisit.is_vip ? "👑 VIP GUEST" : "🟢 ACTIVE PASS"}
              </span>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 shadow-inner">
              <div className="p-2 bg-white rounded-xl shadow-md">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="Visitor Pass QR"
                    className="w-36 h-36 object-contain"
                  />
                ) : (
                  <div className="w-36 h-36 flex items-center justify-center text-xs text-gray-400 font-mono">
                    Generating QR...
                  </div>
                )}
              </div>
              <span className="text-[11px] font-mono text-gray-400 font-bold mt-2">
                SCAN AT SECURITY CHECKPOINTS
              </span>
            </div>


            {/* Details */}
            <div className="space-y-2 text-xs text-gray-600 dark:text-slate-300">
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-800">
                <span className="text-gray-400 font-semibold uppercase">Purpose:</span>
                <span className="font-bold text-gray-900 dark:text-white truncate max-w-[200px]">
                  {createdVisit.purpose}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-800">
                <span className="text-gray-400 font-semibold uppercase">Mobile:</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">
                  {createdVisit.visitor?.phone || phone}
                </span>
              </div>
              {vehicleNumber && (
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-800">
                  <span className="text-gray-400 font-semibold uppercase">Vehicle:</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">
                    {vehicleNumber}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-gray-400 font-semibold uppercase">Valid Until:</span>
                <span className="font-bold text-sky-600 dark:text-sky-400">
                  Today, 09:30 PM IST
                </span>
              </div>
            </div>

            {/* Print & Finish Actions */}
            <div className="pt-3 flex flex-col gap-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-lg"
              >
                <Printer className="w-4 h-4" />
                <span>Print Thermal Badge</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="btn btn-secondary w-full text-xs font-bold"
              >
                Done • Next Visitor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
