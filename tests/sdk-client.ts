import { expect } from "chai";
import { PublicKey } from "@solana/web3.js";
import {
  AxiomClient,
  creditTier,
  fixedDestinations,
  fixedOriginChain,
  ikaPolicyKind,
} from "../sdk/src";

const programId = new PublicKey("6Xrd8Ymz9vxecWjifKern6LAzXQ2XKcS4D1zsJ8ENLpK");

function mockProgram() {
  const calls: unknown[][] = [];
  const method =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push([name, ...args]);
      return { name, args };
    };

  return {
    calls,
    programId,
    methods: {
      initializePool: method("initializePool"),
      depositLiquidity: method("depositLiquidity"),
      withdrawLiquidity: method("withdrawLiquidity"),
      registerCreditProof: method("registerCreditProof"),
      requestLoan: method("requestLoan"),
      initRepaymentStream: method("initRepaymentStream"),
      fundRepaymentStream: method("fundRepaymentStream"),
      claimRepayments: method("claimRepayments"),
      closeRepaymentStream: method("closeRepaymentStream"),
      initializeIkaPolicy: method("initializeIkaPolicy"),
      verifyIkaPolicy: method("verifyIkaPolicy"),
    },
  } as any;
}

function normalizeCall(call: unknown[]) {
  return call.map((value) => {
    if (Buffer.isBuffer(value)) {
      return Array.from(value);
    }
    if (value && typeof value === "object" && value.constructor.name === "BN") {
      return value.toString();
    }
    return value;
  });
}

describe("AxiomClient", () => {
  it("derives lending pool PDA", () => {
    const client = new AxiomClient(mockProgram());
    const vault = PublicKey.unique();
    const [pda] = client.deriveLendingPool(vault);

    expect(PublicKey.isOnCurve(pda)).to.equal(false);
  });

  it("builds credit proof registration args", () => {
    const program = mockProgram();
    const client = new AxiomClient(program);

    client.registerCreditProof({
      tier: "gold",
      maxLoan: "10000000000",
      proof: Buffer.from([1, 2, 3]),
      publicInputs: [
        new Array(32).fill(1),
        new Array(32).fill(2),
        new Array(32).fill(3),
      ],
      expiry: "1800000000",
    });

    expect(normalizeCall(program.calls[0])).to.deep.equal([
      "registerCreditProof",
      { gold: {} },
      "10000000000",
      [1, 2, 3],
      [new Array(32).fill(1), new Array(32).fill(2), new Array(32).fill(3)],
      "1800000000",
    ]);
  });

  it("builds loan and repayment helpers", () => {
    const program = mockProgram();
    const client = new AxiomClient(program);
    const dwallet = PublicKey.unique();

    client.requestLoan({
      amount: "500000000",
      durationDays: 30,
      collateralAmount: "250000000",
      ikaDwallet: dwallet,
    });
    client.fundRepaymentStream(10);
    client.claimRepayments();

    expect(program.calls.map((call) => call[0])).to.deep.equal([
      "requestLoan",
      "fundRepaymentStream",
      "claimRepayments",
    ]);
  });

  it("formats Ika policy transaction inputs", () => {
    const program = mockProgram();
    const client = new AxiomClient(program);
    const destination = PublicKey.unique();

    client.initializeIkaPolicy({
      kind: "borrower",
      allowedDestinations: [destination],
      maxTransactionAmount: 1_000,
      originChain: "solana",
    });

    expect(program.calls[0][1]).to.deep.equal({ borrower: {} });
    expect(program.calls[0][2]).to.deep.equal([
      destination,
      PublicKey.default,
      PublicKey.default,
    ]);
    expect(program.calls[0][3]).to.equal(1);
  });

  it("exports enum and fixed array helpers", () => {
    expect(creditTier("silver")).to.deep.equal({ silver: {} });
    expect(ikaPolicyKind("lender")).to.deep.equal({ lender: {} });
    expect(fixedDestinations([PublicKey.unique()])).to.have.length(3);
    expect(fixedOriginChain("ethereum")).to.have.length(16);
  });
});
