export interface ComposerState {
  /** USD amount the user wants to borrow. */
  borrowUSDAmount: number;
  /** Loan-to-value percentage, 1–80. */
  ltv: number;
  /** Derived collateral amount in BTC. Maintained by use-loan-calculator. */
  collateralBTCAmount: number;
}

export const initialComposerState: ComposerState = {
  borrowUSDAmount: 0,
  ltv: 50,
  collateralBTCAmount: 0,
};

export const COMPOSER_LTV_MIN = 1;
export const COMPOSER_LTV_MAX = 80;
export const COMPOSER_LTV_DEFAULT = 50;
