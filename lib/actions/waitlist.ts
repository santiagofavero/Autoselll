"use server";

import {
  joinWaitlistSchema,
  inviteFromWaitlistSchema,
} from "@/lib/validations/waitlist";
import { revalidatePath } from "next/cache";
import prisma from "../prisma";

export async function joinWaitlist(email: string) {
  try {
    // Validate the email
    const validatedData = joinWaitlistSchema.parse({ email });

    // Check if email already exists
    const existingEntry = await prisma.waitlist.findUnique({
      where: { email: validatedData.email },
    });

    if (existingEntry) {
      return {
        success: false,
        error: "This email is already on the waitlist",
        queueNumber: existingEntry.queueNumber,
      };
    }

    // Get the next queue number and create entry in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get the highest queue number
      const maxQueueNumber = await tx.waitlist.findFirst({
        orderBy: { queueNumber: "desc" },
        select: { queueNumber: true },
      });

      const nextQueueNumber = (maxQueueNumber?.queueNumber || 0) + 1;

      // Create the waitlist entry
      const waitlistEntry = await tx.waitlist.create({
        data: {
          email: validatedData.email,
          queueNumber: nextQueueNumber,
        },
      });

      return waitlistEntry;
    });

    revalidatePath("/");

    return {
      success: true,
      queueNumber: result.queueNumber,
      message: `You're #${result.queueNumber} on the waitlist!`,
    };
  } catch (error) {
    console.error("Error joining waitlist:", error);

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}

export async function getWaitlistStats() {
  try {
    const [total, pending, invited, registered] = await Promise.all([
      prisma.waitlist.count(),
      prisma.waitlist.count({ where: { status: "PENDING" } }),
      prisma.waitlist.count({ where: { status: "INVITED" } }),
      prisma.waitlist.count({ where: { status: "REGISTERED" } }),
    ]);

    return {
      success: true,
      stats: {
        total,
        pending,
        invited,
        registered,
      },
    };
  } catch (error) {
    console.error("Error getting waitlist stats:", error);
    return {
      success: false,
      error: "Failed to get waitlist statistics",
    };
  }
}

export async function inviteFromWaitlist(email: string) {
  try {
    const validatedData = inviteFromWaitlistSchema.parse({ email });

    const updatedEntry = await prisma.waitlist.update({
      where: { email: validatedData.email },
      data: {
        status: "INVITED",
        invitedAt: new Date(),
      },
    });

    revalidatePath("/admin/waitlist");

    return {
      success: true,
      message: `Invited ${email} (Queue #${updatedEntry.queueNumber})`,
    };
  } catch (error) {
    console.error("Error inviting from waitlist:", error);
    return {
      success: false,
      error: "Failed to invite user",
    };
  }
}

export async function getWaitlistEntries(limit = 50) {
  try {
    const entries = await prisma.waitlist.findMany({
      orderBy: { queueNumber: "asc" },
      take: limit,
      select: {
        id: true,
        email: true,
        queueNumber: true,
        status: true,
        createdAt: true,
        invitedAt: true,
      },
    });

    return {
      success: true,
      entries,
    };
  } catch (error) {
    console.error("Error getting waitlist entries:", error);
    return {
      success: false,
      error: "Failed to get waitlist entries",
    };
  }
}
