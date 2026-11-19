const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateRegistration(f) {
  const e = {}
  if (!f.name.trim() || f.name.trim().length < 2) e.name = 'Full name must be at least 2 characters'
  if (!/^[a-zA-Z0-9_.]{3,30}$/.test(f.username.trim())) e.username = 'Username: 3–30 letters, numbers, _ or .'
  if (!EMAIL_RE.test(f.email.trim())) e.email = 'Enter a valid email address'
  if (f.password.length < 8) e.password = 'Password must be at least 8 characters'
  else if (!/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) e.password = 'Use at least one letter and one number'
  if (f.confirmPassword !== f.password) e.confirmPassword = 'Passwords do not match'
  return e
}

