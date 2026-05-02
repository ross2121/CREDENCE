import { expect } from "chai";
import { readFileSync } from "fs";
import { join } from "path";
import { PublicKey } from "@solana/web3.js";
import {
  CreditAgent,
  buildFeatureVector,
  LocalCreditModel,
} from "../axiom-agents/credit-agent/src";
import { AxiomClient } from "../sdk/src";

function fixture(name: string) {
  return JSON.parse(
    readFileSync(
      join(process.cwd(), "tests", "fixtures", "credit-agent", name),
      "utf8"
    )
  );
}

function mockClient() {
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
      registerCreditProof: method("registerCreditProof"),
      requestLoan: method("requestLoan"),
    },
  } as any;
}

describe("CreditAgent", () => {
  it("extracts wallet history features", () => {
    const features = buildFeatureVector(fixture("gold-wallet.json"));

    expect(features.walletAgeDays).to.equal(1200);
    expect(features.crossChainCount).to.equal(2);
    expect(features.defiInteractions).to.equal(78);
    expect(features.priorRepayments).to.equal(4);
  });

  it("scores strong history as gold tier", async () => {
    const agent = new CreditAgent();
    const result = await agent.scoreWallet(
      "gold-wallet",
      fixture("gold-wallet.json")
    );

    expect(result.decision.tier).to.equal("gold");
    expect(result.decision.maxLoanUsdt).to.equal(10_000);
    expect(result.proof.proof).to.have.length(32);
  });

  it("scores thin history as bronze tier", async () => {
    const agent = new CreditAgent(undefined, new LocalCreditModel());
    const result = await agent.scoreWallet(
      "bronze-wallet",
      fixture("bronze-wallet.json")
    );

    expect(result.decision.tier).to.equal("bronze");
    expect(result.decision.maxLoanUsdt).to.equal(500);
  });

  it("builds SDK calls for proof registration and loan request", async () => {
    const agent = new CreditAgent();
    const result = await agent.scoreWallet(
      "gold-wallet",
      fixture("gold-wallet.json")
    );
    const program = mockClient();
    const client = new AxiomClient(program);

    agent.buildProofRegistration(client, result.decision, result.proof);
    agent.buildLoanRequest(client, result.decision, {
      amountUsdt: 5_000,
      durationDays: 30,
      ikaDwallet: PublicKey.unique(),
    });

    expect(program.calls.map((call) => call[0])).to.deep.equal([
      "registerCreditProof",
      "requestLoan",
    ]);
  });
});
