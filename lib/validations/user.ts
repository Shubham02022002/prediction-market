import { z } from "zod";

export const userRegistrationSchema = z.object({
  email: z.email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long.")
    .max(20, "Password is too long."),
  name: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters long.")
    .max(20, "Name is too long.")
    .optional(),
});

export type UserRegistration = z.infer<typeof userRegistrationSchema>;
