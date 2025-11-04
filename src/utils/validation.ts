import * as yup from 'yup';

// Email validation
export const emailSchema = yup
  .string()
  .required('Email is required')
  .email('Please enter a valid email address')
  .lowercase()
  .trim();

// Password validation
export const passwordSchema = yup
  .string()
  .required('Password is required')
  .min(8, 'Password must be at least 8 characters')
  .matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  );

// Username validation
export const usernameSchema = yup
  .string()
  .required('Username is required')
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must not exceed 20 characters')
  .matches(
    /^[a-zA-Z0-9_]+$/,
    'Username can only contain letters, numbers, and underscores'
  )
  .trim();

// Full name validation
export const fullNameSchema = yup
  .string()
  .required('Full name is required')
  .min(2, 'Full name must be at least 2 characters')
  .max(50, 'Full name must not exceed 50 characters')
  .matches(
    /^[a-zA-Z\s]+$/,
    'Full name can only contain letters and spaces'
  )
  .trim();

// Phone number validation (international format)
export const phoneSchema = yup
  .string()
  .required('Phone number is required')
  .matches(
    /^\+?[1-9]\d{1,14}$/,
    'Please enter a valid phone number'
  );

// Sign up form validation
export const signUpSchema = yup.object().shape({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords must match'),
  username: usernameSchema,
  full_name: fullNameSchema,
  phone_number: phoneSchema,
});

// Sign in form validation
export const signInSchema = yup.object().shape({
  email: emailSchema,
  password: yup.string().required('Password is required'),
});

// Manual stamp code validation
export const stampCodeSchema = yup
  .string()
  .required('Stamp code is required')
  .matches(
    /^(QR_|SHOP_|STAMP:)/,
    'Invalid stamp code format'
  );

// Business review validation
export const reviewSchema = yup.object().shape({
  rating: yup
    .number()
    .required('Rating is required')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must not exceed 5'),
  comment: yup
    .string()
    .max(500, 'Comment must not exceed 500 characters')
    .trim(),
});

// Helper function to validate a single field
export const validateField = async (
  schema: yup.Schema,
  value: any
): Promise<{ valid: boolean; error?: string }> => {
  try {
    await schema.validate(value);
    return { valid: true };
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return { valid: false, error: error.message };
    }
    return { valid: false, error: 'Validation error' };
  }
};

// Helper function to validate entire form
export const validateForm = async <T extends Record<string, any>>(
  schema: yup.Schema,
  values: T
): Promise<{ valid: boolean; errors: Partial<Record<keyof T, string>> }> => {
  try {
    await schema.validate(values, { abortEarly: false });
    return { valid: true, errors: {} };
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      const errors: Partial<Record<keyof T, string>> = {};
      error.inner.forEach((err) => {
        if (err.path) {
          errors[err.path as keyof T] = err.message;
        }
      });
      return { valid: false, errors };
    }
    return { valid: false, errors: {} };
  }
};
