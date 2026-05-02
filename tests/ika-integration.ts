import { expect } from "chai";
import { readFileSync } from "fs";
import { join } from "path";
import { PublicKey } from "@solana/web3.js";
import { AxiomClient } from "../sdk/src";
import {
  IkaDwalletClient,
  unauthorizedDestinationDemo,
} from "../integrations/ika/src";

function fixture(name: string) {
  return JSON.parse(
    readFileSync(join(process.cwd(), "tests", "fixtures", "ika", name), "utf8")
  );
}

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
    programId: PublicKey.unique(),
    methods: {
      initializeIkaPolicy: method("initializeIkaPolicy"),
      verifyIkaPolicy: method("verifyIkaPolicy"),
      fundRepaymentStream: method("fundRepaymentStream"),
    },
  } as any;
}

describe("Ika integration", () => {
  it("creates borrower dWallet policy initialization calls", () => {
    const data = fixture("policy-demo.json");
    const program = mockProgram();
    const ika = new IkaDwalletClient(new AxiomClient(program));
    const repaymentDestination = PublicKey.unique();
    const policy = ika.borrowerPolicy({
      owner: PublicKey.unique(),
      dwallet: PublicKey.unique(),
      repaymentDestination,
      maxTransactionAmount: data.maxTransactionAmount,
    });

    ika.initializePolicy(policy);

    expect(policy.kind).to.equal("borrower");
    expect(policy.allowedDestinations).to.deep.equal([repaymentDestination]);
    expect(program.calls[0][0]).to.equal("initializeIkaPolicy");
    expect(program.calls[0][1]).to.deep.equal({ borrower: {} });
  });

  it("creates lender policy for Kamino and pool routing", () => {
    const ika = new IkaDwalletClient(new AxiomClient(mockProgram()));
    const kaminoVault = PublicKey.unique();
    const poolVault = PublicKey.unique();
    const policy = ika.lenderPolicy({
      owner: PublicKey.unique(),
      dwallet: PublicKey.unique(),
      kaminoVault,
      poolVault,
      maxTransactionAmount: 10_000,
    });

    expect(policy.kind).to.equal("lender");
    expect(policy.allowedDestinations).to.deep.equal([kaminoVault, poolVault]);
  });

  it("wraps a repayment action with Ika policy verification", () => {
    const data = fixture("policy-demo.json");
    const program = mockProgram();
    const client = new AxiomClient(program);
    const ika = new IkaDwalletClient(client);

    ika.enforce(
      {
        dwallet: PublicKey.unique(),
        destination: PublicKey.unique(),
        amount: data.repaymentAmount,
        description: "repay active loan",
      },
      () => client.fundRepaymentStream(data.repaymentAmount)
    );

    expect(program.calls.map((call) => call[0])).to.deep.equal([
      "verifyIkaPolicy",
      "fundRepaymentStream",
    ]);
  });

  it("blocks unauthorized destinations in the demo helper", () => {
    const ika = new IkaDwalletClient(new AxiomClient(mockProgram()));

    expect(() => unauthorizedDestinationDemo(ika)).to.throw(
      "Action destination is not allowed"
    );
  });
});
