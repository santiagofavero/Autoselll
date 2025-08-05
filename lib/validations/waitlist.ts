import { z } from "zod";

export const joinWaitlistSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .toLowerCase()
    .trim(),
});

export const inviteFromWaitlistSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const waitlistStatsSchema = z.object({
  limit: z.number().min(1).max(100).optional().default(50),
  status: z.enum(["PENDING", "INVITED", "REGISTERED"]).optional(),
});

export type JoinWaitlistInput = z.infer<typeof joinWaitlistSchema>;
export type InviteFromWaitlistInput = z.infer<typeof inviteFromWaitlistSchema>;
export type WaitlistStatsInput = z.infer<typeof waitlistStatsSchema>;