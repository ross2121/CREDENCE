import { BN, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Axiom } from "../../target/types/axiom";

export type AxiomProgram = Program<Axiom>;

export type CreditTierName = "bronze" | "silver" | "gold" | "platinum";
export type IkaPolicyKindName = "borrower" | "lender" | "crossChainCollateral";
export type DisputeRulingName = "borrower" | "lender";

export const AXIOM_SEEDS = {
  lendingPool: "lending_pool",
  creditProof: "credit_proof",
  repaymentStream: "repayment_stream",
  ikaPolicy: "ika_policy",
};

export class AxiomClient {
  constructor(readonly program: AxiomProgram) {}

  deriveLendingPool(usdtVault: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(AXIOM_SEEDS.lendingPool), usdtVault.toBuffer()],
      this.program.programId
    );
  }

  deriveCreditProof(wallet: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(AXIOM_SEEDS.creditProof), wallet.toBuffer()],
      this.program.programId
    );
  }

  deriveRepaymentStream(loan: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(AXIOM_SEEDS.repaymentStream), loan.toBuffer()],
      this.program.programId
    );
  }

  deriveIkaPolicy(owner: PublicKey, dwallet: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from(AXIOM_SEEDS.ikaPolicy),
        owner.toBuffer(),
        dwallet.toBuffer(),
      ],
      this.program.programId
    );
  }

  initializePool(
    baseInterestRate: bigint | number | string,
    kaminoVault: PublicKey
  ) {
    return this.program.methods.initializePool(
      toAnchorAmount(baseInterestRate),
      kaminoVault
    );
  }

  depositLiquidity(amount: bigint | number | string) {
    return this.program.methods.depositLiquidity(toAnchorAmount(amount));
  }

  withdrawLiquidity(amount: bigint | number | string) {
    return this.program.methods.withdrawLiquidity(toAnchorAmount(amount));
  }

  registerCreditProof(args: {
    tier: CreditTierName;
    maxLoan: bigint | number | string;
    proof: Buffer | Uint8Array | number[];
    expiry: bigint | number | string;
  }) {
    return this.program.methods.registerCreditProof(
      creditTier(args.tier) as any,
      toAnchorAmount(args.maxLoan),
      Buffer.from(args.proof),
      toAnchorAmount(args.expiry)
    );
  }

  requestLoan(args: {
    amount: bigint | number | string;
    durationDays: bigint | number | string;
    collateralAmount: bigint | number | string;
    ikaDwallet: PublicKey;
  }) {
    return this.program.methods.requestLoan(
      toAnchorAmount(args.amount),
      toAnchorAmount(args.durationDays),
      toAnchorAmount(args.collateralAmount),
      args.ikaDwallet
    );
  }

  initRepaymentStream() {
    return this.program.methods.initRepaymentStream();
  }

  fundRepaymentStream(amount: bigint | number | string) {
    return this.program.methods.fundRepaymentStream(toAnchorAmount(amount));
  }

  claimRepayments() {
    return this.program.methods.claimRepayments();
  }

  closeRepaymentStream() {
    return this.program.methods.closeRepaymentStream();
  }

  initializeIkaPolicy(args: {
    kind: IkaPolicyKindName;
    allowedDestinations: PublicKey[];
    maxTransactionAmount: bigint | number | string;
    crossChain?: boolean;
    originChain?: string;
  }) {
    return this.program.methods.initializeIkaPolicy(
      ikaPolicyKind(args.kind) as any,
      fixedDestinations(args.allowedDestinations),
      args.allowedDestinations.length,
      toAnchorAmount(args.maxTransactionAmount),
      args.crossChain ?? false,
      fixedOriginChain(args.originChain ?? "")
    );
  }

  verifyIkaPolicy(
    dwallet: PublicKey,
    destination: PublicKey,
    amount: bigint | number | string
  ) {
    return this.program.methods.verifyIkaPolicy(
      dwallet,
      destination,
      toAnchorAmount(amount)
    );
  }

  decode = {
    lendingPool: (account: unknown) => account as DecodedLendingPool,
    creditProof: (account: unknown) => account as DecodedCreditProof,
    loan: (account: unknown) => account as DecodedLoan,
  };
}

export function creditTier(tier: CreditTierName) {
  return { [tier]: {} };
}

export function ikaPolicyKind(kind: IkaPolicyKindName) {
  return { [kind]: {} };
}

export function disputeRuling(ruling: DisputeRulingName) {
  return { [ruling]: {} };
}

export function fixedDestinations(destinations: PublicKey[]): PublicKey[] {
  if (destinations.length === 0 || destinations.length > 3) {
    throw new Error("Ika policy requires 1 to 3 destinations");
  }

  return [
    destinations[0],
    destinations[1] ?? PublicKey.default,
    destinations[2] ?? PublicKey.default,
  ];
}

export function fixedOriginChain(originChain: string): number[] {
  const bytes = Buffer.alloc(16);
  Buffer.from(originChain).copy(bytes, 0, 0, 16);
  return Array.from(bytes);
}

function toAnchorAmount(value: bigint | number | string): BN {
  return new BN(value.toString());
}

export type DecodedLendingPool = {
  authority: PublicKey;
  usdtVault: PublicKey;
  totalDeposits: bigint;
  totalBorrowed: bigint;
};

export type DecodedCreditProof = {
  wallet: PublicKey;
  tier: Record<string, unknown>;
  maxLoanUsdt: bigint;
  expiresAt: bigint;
};

export type DecodedLoan = {
  borrower: PublicKey;
  principal: bigint;
  amountRepaid: bigint;
  status: Record<string, unknown>;
};
