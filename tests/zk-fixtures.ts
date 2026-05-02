import { expect } from "chai";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const tiers = {
  bronze: 400,
  silver: 600,
  gold: 750,
  platinum: 900,
};

describe("zk credit fixtures", () => {
  for (const [tier, threshold] of Object.entries(tiers)) {
    it(`${tier} fixture exposes expected public inputs`, () => {
      const path = join(process.cwd(), "fixtures", "zk", `${tier}.json`);
      expect(existsSync(path)).to.equal(true);

      const fixture = JSON.parse(readFileSync(path, "utf8"));
      expect(fixture.tier).to.equal(tier);
      expect(fixture.publicSignals).to.deep.equal([
        String(threshold),
        fixture.input.wallet_hash,
        fixture.input.model_hash,
      ]);
      expect(Number(fixture.input.credit_score)).to.be.greaterThanOrEqual(
        threshold
      );
    });
  }
});
