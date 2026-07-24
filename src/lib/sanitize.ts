export function sanitizeInput(input: string, maxLength: number = 255): string {
  if (!input) return "";

  return input
    .trim()
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/&/g, "&amp;") // Escape ampersand
    .replace(/"/g, "&quot;") 
    .replace(/'/g, "&#x27;") 
    .slice(0, maxLength);
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(normalizeEmail(email));
}

export function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function isValidPhoneNumber(phone: string): boolean {
  const sanitized = sanitizePhoneNumber(phone);
  return sanitized.length >= 10 && sanitized.length <= 20;
}

export function sanitizeVehicleNumber(vehicleNumber: string): string {
  return vehicleNumber
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "") // Allow only alphanumeric and hyphen
    .slice(0, 20);
}

export function validatePasswordStrength(password: string): {
  valid: boolean;
  message: string;
} {
  if (password.length < 8) {
    return {
      valid: false,
      message: "Password must be at least 8 characters",
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain lowercase letters",
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain uppercase letters",
    };
  }

  if (!/\d/.test(password)) {
    return {
      valid: false,
      message: "Password must contain numbers",
    };
  }

  if (!/[@$!%*?&]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain special characters (@$!%*?&)",
    };
  }

  return {
    valid: true,
    message: "Password is strong",
  };
}
