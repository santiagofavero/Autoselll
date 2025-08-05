"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { joinWaitlistSchema, type JoinWaitlistInput } from "@/lib/validations/waitlist";
import { joinWaitlist } from "@/lib/actions/waitlist";
import { toast } from "sonner";

export function WaitlistForm() {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState<{ queueNumber?: number; message?: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<JoinWaitlistInput>({
    resolver: zodResolver(joinWaitlistSchema),
  });

  const onSubmit = (data: JoinWaitlistInput) => {
    startTransition(async () => {
      try {
        const result = await joinWaitlist(data.email);
        
        if (result.success) {
          setSuccess({
            queueNumber: result.queueNumber,
            message: result.message,
          });
          reset();
          toast.success(result.message || "Successfully joined the waitlist!");
        } else {
          if (result.queueNumber) {
            // User is already on waitlist
            setSuccess({
              queueNumber: result.queueNumber,
              message: `You're already on the waitlist at position #${result.queueNumber}!`,
            });
          }
          toast.error(result.error || "Something went wrong");
        }
      } catch (error) {
        toast.error("Something went wrong. Please try again.");
      }
    });
  };

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="text-green-600 text-lg font-semibold">
          🎉 {success.message}
        </div>
        <p className="text-muted-foreground text-sm">
          We'll notify you via email when it's your turn to access Autosell.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="relative">
        <Input
          {...register("email")}
          type="email"
          placeholder="Enter your email address"
          className="w-full relative z-10"
          disabled={isPending}
        />
        {errors.email && (
          <p className="text-red-500 text-sm mt-1 relative z-10">
            {errors.email.message}
          </p>
        )}
      </div>
      
      <Button
        type="submit"
        disabled={isPending}
        className="w-full relative z-10 bg-blue-600 hover:bg-blue-700"
      >
        {isPending ? "Joining..." : "Join Waitlist"}
      </Button>
    </form>
  );
}