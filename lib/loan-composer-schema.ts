import { z } from 'zod';

/**
 * Mirrors borrow-turborepo/apps/web/lib/validators/loan-composer-schema.ts
 * Used by <LoanComposer> to validate inputs before requesting quotes.
 */
export const loanComposerSchema = z
  .object({
    borrowUSDAmount: z
      .number()
      .positive('Loan amount must be greater than 0')
      .finite('Loan amount must be a valid number'),
    collateralBTCAmount: z
      .number()
      .min(0.0001, 'Collateral amount must be at least 0.0001 BTC')
      .finite('Collateral amount must be a valid number'),
    ltv: z
      .number()
      .positive('LTV must be greater than 0')
      .finite('LTV must be a valid number'),
    maxLtv: z.number().positive().finite(),
  })
  .refine((data) => data.ltv <= data.maxLtv, {
    message: 'LTV cannot exceed maximum LTV',
    path: ['ltv'],
  });

export type LoanComposerInput = z.infer<typeof loanComposerSchema>;
