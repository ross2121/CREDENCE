import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Axiom } from "../target/types/axiom";

describe("axiom", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.axiom as Program<Axiom>;

  it("initializes the scaffold program", async () => {
    await program.methods.initialize().rpc();
  });
});
