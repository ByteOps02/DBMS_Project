import type React from "react";
import { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { toast } from "react-hot-toast";
import { useAuthStore } from "../store/auth";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import log from "../lib/logger";
import { api } from "../lib/api";

export type UnifiedVisitFormData = {
  name: string;
  email: string;
  phone: string;
  purpose: string;
  visitDate: string;
  validUntil?: string;
  hostEmail: string;
  photo?: FileList;
  idProof?: FileList;
  vehicleNumber?: string;
  vehicleType?: string;
  additionalGuests?: number;
  passType: "single_day" | "multi_day";
};

export function useVisitRegistration(formMethods: UseFormReturn<UnifiedVisitFormData>) {
  const { user } = useAuthStore();
  const { setValue, watch, reset } = formMethods;

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [previewIdProof, setPreviewIdProof] = useState<string | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [lastVisitId, setLastVisitId] = useState<string | null>(null);
  const [isBlacklisted, setIsBlacklisted] = useState(false);

  const userRole = user?.role;
  const isVisitor = userRole === "visitor";
  const isGuardOrAdmin = userRole === "guard" || userRole === "admin";

  const passType = watch("passType");
  const visitorEmail = watch("email");

  useEffect(() => {
    if (qrImageUrl) {
      const el = document.getElementById("generated-pass");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [qrImageUrl]);

  useEffect(() => {
    if (user) {
      if (isVisitor) {
        setValue("name", user.name || "");
        setValue("email", user.email || "");
        setValue("hostEmail", "");
      } else {
        setValue("hostEmail", user.email || "");
      }
    }
  }, [user, isVisitor, setValue]);
  useEffect(() => {
    if (visitorEmail && visitorEmail.includes("@")) {
      const checkBlacklist = async () => {
        const visitors = await api.visitors.list({ email: visitorEmail.trim() });
        const data = visitors[0];

        if (data?.is_blacklisted) {
          setIsBlacklisted(true);
          setErrorMessage(
            `BLOCKED: This visitor is on the campus blacklist. Reason: ${data.blacklist_reason || "Not specified"}`
          );
        } else {
          setIsBlacklisted(false);
          if (errorMessage.includes("watchlist") || errorMessage.includes("blocked"))
            setErrorMessage("");
        }
      };
      checkBlacklist();
    }
  }, [visitorEmail, errorMessage, isGuardOrAdmin]);

  const handleFilePreview = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadToStorage = async (file: File): Promise<string | null> => {
    try {
      const res = await api.upload(file);
      return res.url;
    } catch (e) {
      log.error(`[UnifiedVisit] upload error:`, e);
      return null;
    }
  };

  const onSubmit = async (formData: UnifiedVisitFormData) => {
    if (isBlacklisted) {
      toast.error(
        "You are blocked and cannot register your visit. Please contact admin or support staff."
      );
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setQrImageUrl(null);

    try {
      log.info("[UnifiedVisit] Starting advanced registration for role:", userRole);

      const effectiveHostEmail = isVisitor ? formData.hostEmail : user?.email;
      let approverId = null;

      if (effectiveHostEmail && effectiveHostEmail.trim() !== "") {
        const hosts = await api.hosts.list(effectiveHostEmail.trim());
        const approver = hosts.find(h => h.email.toLowerCase() === effectiveHostEmail.trim().toLowerCase());

        if (!approver) throw new Error(`Approver not found with email: ${effectiveHostEmail}`);
        approverId = approver.id;
      }
      let photoUrl = null;
      if (formData.photo?.[0]) {
        photoUrl = await uploadToStorage(formData.photo[0]);
      }

      let idProofUrl = null;
      if (formData.idProof?.[0]) {
        idProofUrl = await uploadToStorage(formData.idProof[0]);
      }

      const visitors = await api.visitors.list({ email: formData.email.trim() });
      const existingVisitor = visitors[0];

      if (existingVisitor?.is_blacklisted) {
        throw new Error("This user is completely blocked and cannot register any visits.");
      }

      const visitor = await api.visitors.upsert({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || "N/A",
        photo_url: photoUrl || undefined,
        id_proof_url: idProofUrl || undefined,
      });
      const visitorId = visitor.id;
      const visitId = uuidv4();
      const visitDate = formData.visitDate ? new Date(formData.visitDate) : new Date();
      const validUntil = formData.validUntil ? new Date(formData.validUntil) : new Date(visitDate);
      if (formData.passType === "single_day") validUntil.setHours(23, 59, 59);

      await api.visits.create({
        id: visitId,
        visitor_id: visitorId,
        host_id: approverId,
        purpose: formData.purpose,
        status: "pending",
        valid_until: validUntil.toISOString(),
        valid_from: visitDate.toISOString(),
        expected_out_time: validUntil.toISOString(),
        vehicle_number: formData.vehicleNumber || null,
        vehicle_type: formData.vehicleType || null,
        additional_guests: Number(formData.additionalGuests) || 0,
        pass_type: formData.passType,
      });
      const qrData = JSON.stringify({
        vId: visitId,
        n: formData.name,
        e: formData.email,
        p: formData.purpose,
        t: formData.passType,
        d: visitDate.toISOString().split("T")[0],
        u: validUntil.toISOString().split("T")[0],
        v: formData.vehicleNumber || "None",
      });
      const qrUrl = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: "M",
        margin: 3,
        scale: 10,
      });
      setQrImageUrl(qrUrl);
      setLastVisitId(visitId);

      toast.success("Visitor successfully Registered");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to process registration.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    reset();
    setPreviewPhoto(null);
    setPreviewIdProof(null);
    setQrImageUrl(null);
    setLastVisitId(null);
  };

  return {
    loading,
    errorMessage,
    previewPhoto,
    previewIdProof,
    qrImageUrl,
    lastVisitId,
    isBlacklisted,
    isVisitor,
    isGuardOrAdmin,
    handleFilePreview,
    onSubmit,
    handleReset,
    setPreviewPhoto,
    setPreviewIdProof,
    userRole,
    passType,
  };
}
