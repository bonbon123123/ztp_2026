const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPECIAL_CHARACTER_RE = /[!@#$%^&*()_\-+=\[{\]};:'",<.>/?\\|`~]/;
const UPPERCASE_RE = /[A-Z]/;
const DIGIT_RE = /\d/;

export const PASSWORD_MIN_LENGTH = 8;
export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 50;

export function validateEmail(email: unknown, errors: string[]) {
  if (typeof email !== "string" || !EMAIL_RE.test(email.trim()) || email.trim().length > 254) {
    errors.push("email: wymagany poprawny adres e-mail");
  }
}

/** Złożoność hasła: długość, wielka litera, cyfra, znak specjalny. */
export function validatePasswordStrength(password: unknown, errors: string[]) {
  if (typeof password !== "string") {
    errors.push("password: hasło jest wymagane");
    return;
  }
  if (password.length < PASSWORD_MIN_LENGTH) errors.push("password: hasło musi mieć co najmniej 8 znaków");
  if (!UPPERCASE_RE.test(password)) errors.push("password: hasło musi zawierać co najmniej jedną wielką literę");
  if (!DIGIT_RE.test(password)) errors.push("password: hasło musi zawierać co najmniej jedną cyfrę");
  if (!SPECIAL_CHARACTER_RE.test(password)) {
    errors.push("password: hasło musi zawierać co najmniej jeden znak specjalny");
  }
}

export function validatePasswordConfirmation(password: unknown, confirm: unknown, errors: string[]) {
  if (password !== confirm) errors.push("confirm_password: hasło i potwierdzenie hasła muszą być takie same");
}

export function validateName(value: unknown, field: string, label: string, errors: string[]) {
  const len = typeof value === "string" ? value.trim().length : 0;
  if (len < NAME_MIN_LENGTH || len > NAME_MAX_LENGTH) {
    errors.push(`${field}: ${label} musi mieć od ${NAME_MIN_LENGTH} do ${NAME_MAX_LENGTH} znaków`);
  }
}
