import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createExperimentRun, listExperimentRuns } from "./db";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  experiment: router({
    list: protectedProcedure.query(({ ctx }) => listExperimentRuns(ctx.user.id)),
    save: protectedProcedure
      .input(
        z.object({
          label: z.string().trim().min(1).max(120),
          seed: z.number().int().positive(),
          trackerMode: z.enum(["classical", "predictive", "benchmark"]),
          configuration: z.record(z.string(), z.unknown()),
          results: z.record(z.string(), z.unknown()),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await createExperimentRun({ ...input, userId: ctx.user.id });
        return { success: true } as const;
      }),
  }),
});

export type AppRouter = typeof appRouter;
