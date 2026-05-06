import { expect } from "chai";
import { PublicKey } from "@solana/web3.js";
import { AxiomClient } from "../sdk/src";
import {
  PrivyPolicyClient,
  unauthorizedDestinationDemo,
} from "../integrations/privy-policy/src";

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

describe("Privy policy integration", () => {
  it("creates borrower policy initialization calls through AXIOM policy", () => {
    const program = mockProgram();
    const privy = new PrivyPolicyClient(new AxiomClient(program));
    const repaymentDestination = PublicKey.unique();
    const policy = privy.borrowerPolicy({
      owner: PublicKey.unique(),
      agentWallet: PublicKey.unique(),
      repaymentDestination,
      maxTransactionAmount: 1_000,
      privyPolicyId: "policy_borrower",
    });

    privy.initializePolicy(policy);

    expect(policy.kind).to.equal("borrower");
    expect(policy.allowedDestinations).to.deep.equal([repaymentDestination]);
    expect(policy.privyPolicyId).to.equal("policy_borrower");
    expect(program.calls[0][0]).to.equal("initializeIkaPolicy");
    expect(program.calls[0][1]).to.deep.equal({ borrower: {} });
  });

  it("wraps a repayment action with Privy metadata and AXIOM verification", () => {
    const program = mockProgram();
    const client = new AxiomClient(program);
    const privy = new PrivyPolicyClient(client);
    const result = privy.enforce(
      {
        agentWallet: PublicKey.unique(),
        destination: PublicKey.unique(),
        amount: 250,
        description: "repay active loan",
      },
      () => client.fundRepaymentStream(250),
      { privyPolicyId: "policy_repay", privySignerId: "signer_agent" }
    );

    expect(result.privyPolicyId).to.equal("policy_repay");
    expect(result.privySignerId).to.equal("signer_agent");
    expect(program.calls.map((call) => call[0])).to.deep.equal([
      "verifyIkaPolicy",
      "fundRepaymentStream",
    ]);
  });

  it("blocks unauthorized destinations before signing", () => {
    const privy = new PrivyPolicyClient(new AxiomClient(mockProgram()));

    expect(() => unauthorizedDestinationDemo(privy)).to.throw(
      "Action destination is not allowed"
    );
  });
});
