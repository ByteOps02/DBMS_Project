import { useForm } from "react-hook-form";
import { useAuthStore } from "../store/auth";
import { useVisitRegistration, type UnifiedVisitFormData } from "../hooks/useVisitRegistration";

import {
  Camera,
  UserRoundPlus,
  Calendar,
  FileText,
  User,
  QrCode,
  Download,
  ShieldCheck,
  Users,
  Car,
  FileUp,
  AlertTriangle,
  Printer,
} from "lucide-react";
import { BackButton } from "./BackButton";
import { PageHeader } from "./PageHeader";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { CustomSelect } from "./ui/CustomSelect";

export function UnifiedVisitRegistration() {
  const { user } = useAuthStore();
  const formMethods = useForm<UnifiedVisitFormData>({
    defaultValues: {
      passType: "single_day",
      additionalGuests: 0,
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = formMethods;

  const {
    loading,
    errorMessage,
    previewPhoto,
    previewIdProof,
    qrImageUrl,
    lastVisitId,
    isBlacklisted,
    isVisitor,
    handleFilePreview,
    onSubmit,
    handleReset,
    setPreviewPhoto,
    setPreviewIdProof,
    passType,
  } = useVisitRegistration(formMethods);

  const visitDate = watch("visitDate");

  return (
    <div className="pt-6 px-4 sm:px-6 lg:px-8 pb-12 relative">
      {!user && (
        <div className="absolute top-6 right-6 z-50 sm:right-8 lg:right-10 print:hidden">
          <ThemeSwitcher />
        </div>
      )}

      <div className="max-w-7xl mx-auto print:hidden">
        <BackButton to={user ? "/app/dashboard" : "/"} />

        <PageHeader
          icon={UserRoundPlus}
          gradient="from-cyan-500 to-blue-600"
          title={isVisitor || !user ? "Request Visit" : "Register Visit"}
          description={
            isVisitor || !user
              ? "Submit your visit details for campus entry."
              : "Register visitors with ID verification."
          }
        />
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-slate-900 shadow-sm dark:shadow-none rounded-[1.5rem] overflow-hidden border border-slate-200 dark:border-slate-800 print:shadow-none print:border-none">
          <form onSubmit={handleSubmit(onSubmit)} className="p-3 xs:p-4 sm:p-5 print:hidden">
            {errorMessage && (
              <div
                className={`mb-6 rounded-2xl p-3 xs:p-4 flex items-center gap-3 border ${isBlacklisted ? "bg-red-50 border-red-200 text-red-800" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"}`}
              >
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                <p className="text-xs xs:text-sm font-medium">{errorMessage}</p>
              </div>
            )}

            <div className="space-y-6">
              <section>
                <div className="flex items-center gap-2 mb-4 sm:mb-6 border-b border-gray-100 dark:border-slate-800 pb-2">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  <h3 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                    Identity Details
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1 sm:mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      inputMode="text"
                      autoCapitalize="words"
                      autoComplete="name"
                      {...register("name", {
                        required: "Name is required",
                        onChange: (e) => {
                          const val = e.target.value;
                          if (val.length > 0) {
                            e.target.value = val.charAt(0).toUpperCase() + val.slice(1);
                          }
                        },
                      })}
                      disabled={isVisitor}
                      className="block w-full rounded-2xl border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1 sm:mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      {...register("email", { required: "Email is required" })}
                      disabled={isVisitor}
                      className="block w-full rounded-2xl border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                      placeholder="john@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1 sm:mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      maxLength={10}
                      {...register("phone", {
                        required: "Phone is required",
                        pattern: { value: /^\d{10}$/, message: "Exactly 10 digits required" },
                        onChange: (e) => {
                          e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
                        },
                      })}
                      className={`block w-full rounded-2xl border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white ${errors.phone ? "border-red-500 ring-1 ring-red-500" : ""}`}
                      placeholder="1234567890"
                    />
                    {errors.phone && (
                      <span className="text-[10px] text-red-500 font-bold block mt-1">
                        {errors.phone.message}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1 sm:mb-2">
                      Additional Guests
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3 top-2.5 sm:top-3 h-4 w-4 text-gray-400" />
                      <input
                        type="number"
                        {...register("additionalGuests", { min: 0, max: 10 })}
                        className="block w-full rounded-2xl border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white font-bold"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </section>
              <section>
                <div className="flex items-center gap-2 mb-4 sm:mb-6 border-b border-gray-100 dark:border-slate-800 pb-2">
                  <FileUp className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                  <h3 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                    Documents & Vehicle
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-4">
                    <label className="block text-[10px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">
                      Verification Photos <span className="lowercase text-gray-400 font-normal">(optional)</span>
                    </label>
                    <div className="flex gap-3 sm:gap-4">
                      <div className="flex-1">
                        <label className="group relative flex flex-col items-center justify-center h-24 sm:h-32 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all cursor-pointer overflow-hidden bg-gray-50/30 dark:bg-slate-800/20">
                          {previewPhoto ? (
                            <img src={previewPhoto} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center">
                              <Camera className="mx-auto h-5 w-5 sm:h-6 sm:w-6 text-gray-400 group-hover:text-blue-500" />
                              <span className="mt-1 sm:mt-2 block text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">
                                Live Photo
                              </span>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            {...register("photo")}
                            onChange={(e) => handleFilePreview(e, setPreviewPhoto)}
                          />
                        </label>
                      </div>
                      <div className="flex-1">
                        <label className="group relative flex flex-col items-center justify-center h-24 sm:h-32 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 transition-all cursor-pointer overflow-hidden bg-gray-50/30 dark:bg-slate-800/20">
                          {previewIdProof ? (
                            <img src={previewIdProof} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center">
                              <FileText className="mx-auto h-5 w-5 sm:h-6 sm:w-6 text-gray-400 group-hover:text-indigo-500" />
                              <span className="mt-1 sm:mt-2 block text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">
                                Govt ID Proof
                              </span>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            {...register("idProof")}
                            onChange={(e) => handleFilePreview(e, setPreviewIdProof)}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[10px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">
                      Vehicle Information
                    </label>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="col-span-2">
                        <div className="relative">
                          <Car className="absolute left-3 top-2.5 sm:top-3 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            {...register("vehicleNumber")}
                            className="block w-full rounded-2xl border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white font-bold uppercase"
                            placeholder="Vehicle Number (e.g. MH-31...)"
                          />
                        </div>
                      </div>
                      <div className="col-span-2">
                        <CustomSelect
                          value={watch("vehicleType") || ""}
                          onChange={(val) => setValue("vehicleType", val as "2-wheeler" | "4-wheeler" | "other" | "")}
                          options={[
                            { value: "", label: "No Vehicle" },
                            { value: "2-wheeler", label: "2-Wheeler" },
                            { value: "4-wheeler", label: "4-Wheeler" },
                            { value: "other", label: "Other" }
                          ]}
                          placeholder="Select Vehicle Type"
                          className="bg-gray-50/50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 py-2"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
              <section>
                <div className="flex items-center gap-2 mb-4 sm:mb-6 border-b border-gray-100 dark:border-slate-800 pb-2">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  <h3 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                    Visit Logistics
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1 sm:mb-2">
                      Pass Type
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-gray-50 dark:bg-slate-800 rounded-2xl">
                      <button
                        type="button"
                        onClick={() => setValue("passType", "single_day")}
                        className={`py-1.5 sm:py-2 text-[9px] sm:text-[10px] font-bold uppercase rounded-xl transition-all ${passType === "single_day" ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-gray-400"}`}
                      >
                        Single Day
                      </button>
                      <button
                        type="button"
                        onClick={() => setValue("passType", "multi_day")}
                        className={`py-1.5 sm:py-2 text-[9px] sm:text-[10px] font-bold uppercase rounded-xl transition-all ${passType === "multi_day" ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-gray-400"}`}
                      >
                        Multi-Day
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1 sm:mb-2">
                      Approver Email
                    </label>
                    <input
                      type="email"
                      {...register("hostEmail")}
                      disabled
                      placeholder={isVisitor ? "Campus Administration" : "Assigned to You"}
                      className="block w-full rounded-2xl border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 py-2 px-3 text-xs sm:text-sm dark:text-slate-400 italic cursor-not-allowed opacity-70"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1 sm:mb-2">
                      {passType === "multi_day" ? "Valid From *" : "Visit Date *"}
                    </label>
                    <input
                      type="date"
                      {...register("visitDate", { required: "Date is required" })}
                      min={new Date().toISOString().split("T")[0]}
                      className="block w-full rounded-2xl border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 py-2 px-3 text-xs sm:text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all dark:text-white"
                    />
                  </div>

                  {passType === "multi_day" && (
                    <div>
                      <label className="block text-[10px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1 sm:mb-2">
                        Valid Until *
                      </label>
                      <input
                        type="date"
                        {...register("validUntil", { required: "End date is required" })}
                        min={visitDate}
                        className="block w-full rounded-2xl border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 py-2 px-3 text-xs sm:text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all dark:text-white"
                      />
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-[10px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1 sm:mb-2">
                      Purpose of Visit *
                    </label>
                    <input
                      type="text"
                      {...register("purpose", { required: "Purpose is required" })}
                      className="block w-full rounded-2xl border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 py-2 px-3 text-xs sm:text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all dark:text-white"
                      placeholder="Meeting, Maintenance, Guest Lecture..."
                    />
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-slate-800 flex flex-col xs:flex-row gap-3">
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-bold uppercase tracking-wider text-[11px] sm:text-xs active:scale-95 transition-colors shadow-sm"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <QrCode className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="truncate">
                      {isVisitor || !user
                        ? "Submit Request & Generate Pass"
                        : "Register Visit & Generate Pass"}
                    </span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-3 border border-gray-200 dark:border-slate-700 rounded-xl text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all active:scale-95"
              >
                Reset
              </button>
            </div>
          </form>

          {qrImageUrl && (
            <div
              id="generated-pass"
              className="px-3 xs:px-4 sm:px-5 pb-6 sm:pb-8 print:m-0"
            >
              <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-200 dark:via-slate-700 to-transparent mb-6 sm:mb-8 print-hide" />
              <div className="flex justify-center">
                <div className="w-full max-w-sm relative">
                  <div className="bg-white dark:bg-[#0f172a] rounded-[1.5rem] shadow-sm dark:shadow-none overflow-hidden border border-slate-200 dark:border-slate-800">
                    <div className="h-1 w-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600" />

                    <div className="p-6 sm:p-8 flex flex-col items-center">
                      <div className="w-full flex items-start justify-between mb-5 sm:mb-7">
                        <div>
                          <h4 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                            Entry Pass
                          </h4>
                          <p className="text-[10px] sm:text-xs text-gray-400 dark:text-slate-500 mt-1 font-semibold uppercase tracking-widest">
                            IIIT Nagpur Campus
                          </p>
                        </div>
                      </div>

                      {/* Pending Status Badge for visitor registration */}
                      <div className="w-full mb-6">
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-xl p-3 flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></div>
                          <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-500 uppercase tracking-wider">
                            Pending Approval
                          </p>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-[#0f172a] rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-5 shadow-md border border-gray-100 dark:border-slate-700 mb-5 sm:mb-7 ring-1 ring-black/[0.04] opacity-50 grayscale transition-all hover:grayscale-0 hover:opacity-100">
                        <img src={qrImageUrl} alt="QR Code" className="w-44 h-44 sm:w-52 sm:h-52" />
                      </div>
                      
                      <div className="w-full bg-gray-50/80 dark:bg-slate-800/50 rounded-2xl p-4 sm:p-5 mb-5 sm:mb-7 border border-gray-100 dark:border-slate-700/50 space-y-4">
                        
                        <div>
                          <p className="text-[9px] sm:text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-1">
                            Reference ID
                          </p>
                          <p className="text-xs sm:text-sm font-mono font-bold text-gray-900 dark:text-white break-all">
                            {lastVisitId || "Pending"}
                          </p>
                        </div>

                        <div className="h-px bg-gray-100 dark:bg-slate-700/50" />

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] sm:text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-1">
                              Visitor Name
                            </p>
                            <p className="text-sm sm:text-base font-black text-gray-900 dark:text-white truncate">
                              {watch("name") || "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] sm:text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-1">
                              Host
                            </p>
                            <p className="text-sm sm:text-base font-black text-gray-900 dark:text-white truncate">
                              {isVisitor ? "Campus Administration" : watch("hostEmail")}
                            </p>
                          </div>
                        </div>

                        <div className="h-px bg-gray-100 dark:bg-slate-700/50" />

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] sm:text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-1">
                              {watch("passType") === "multi_day" ? "Valid From" : "Visit Date"}
                            </p>
                            <p className="text-xs sm:text-sm font-bold text-gray-800 dark:text-slate-200">
                              {watch("visitDate")
                                ? new Date(watch("visitDate")).toLocaleDateString("en-US", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "---"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] sm:text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-1">
                              Pass Type
                            </p>
                            <p className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 capitalize">
                              {watch("passType")?.replace("_", " ")}
                            </p>
                          </div>
                          {watch("passType") === "multi_day" && watch("validUntil") && (
                            <div className="col-span-2">
                              <p className="text-[9px] sm:text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-1">
                                Valid Until
                              </p>
                              <p className="text-xs sm:text-sm font-bold text-gray-800 dark:text-slate-200">
                                {new Date(watch("validUntil")!).toLocaleDateString("en-US", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="h-px bg-gray-100 dark:bg-slate-700/50" />

                        <div>
                          <p className="text-[9px] sm:text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-1">
                            Purpose of Visit
                          </p>
                          <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-slate-200 capitalize">
                            {watch("purpose")?.replace("_", " ")}
                          </p>
                        </div>
                      </div>
                      <div className="w-full grid grid-cols-2 gap-3">
                        <a
                          href={qrImageUrl}
                          download={`iiitn-pass-${watch("name")?.replace(/\s+/g, "-").toLowerCase()}.png`}
                          className="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[10px] sm:text-[11px] uppercase tracking-wider transition-colors active:scale-95 shadow-sm"
                        >
                          <Download className="w-4 h-4" /> Save
                        </a>
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-[10px] sm:text-[11px] uppercase tracking-wider transition-colors border border-transparent dark:border-slate-700 active:scale-95"
                        >
                          <Printer className="w-4 h-4" /> Print
                        </button>
                      </div>
                    </div>
                    <div className="px-6 pb-4 flex items-center justify-center gap-2">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" />
                      <span className="text-[8px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                        Secured by IIIT Nagpur VMS
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
