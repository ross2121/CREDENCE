import { expect } from "chai";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { buildPoseidon } from "circomlibjs";

const tiers = {
  bronze: 400,
  silver: 600,
  gold: 750,
  platinum: 900,
};

describe("zk credit fixtures", () => {
  for (const [tier, threshold] of Object.entries(tiers)) {
    it(`${tier} fixture exposes expected public inputs`, async () => {
      const path = join(process.cwd(), "fixtures", "zk", `${tier}.json`);
      expect(existsSync(path)).to.equal(true);

      const fixture = JSON.parse(readFileSync(path, "utf8"));
      const poseidon = await buildPoseidon();
      const walletCommitment = poseidon.F.toString(
        poseidon([
          BigInt(fixture.input.wallet_secret),
          BigInt(fixture.input.wallet_salt),
          BigInt(1001),
        ])
      );
      const modelCommitment = poseidon.F.toString(
        poseidon([
          BigInt(fixture.input.model_secret),
          BigInt(fixture.input.model_salt),
          BigInt(2001),
        ])
      );

      expect(fixture.tier).to.equal(tier);
      expect(fixture.publicSignals).to.deep.equal([
        String(threshold),
        fixture.input.wallet_commitment,
        fixture.input.model_commitment,
      ]);
      expect(fixture.input.wallet_commitment).to.equal(walletCommitment);
      expect(fixture.input.model_commitment).to.equal(modelCommitment);
      expect(fixture.input.wallet_commitment).to.not.equal(
        fixture.input.wallet_secret
      );
      expect(fixture.input.model_commitment).to.not.equal(
        fixture.input.model_secret
      );
      expect(Number(fixture.input.credit_score)).to.be.greaterThanOrEqual(
        threshold
      );
    });
  }
});
