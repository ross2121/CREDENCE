import {
  AnchorProvider,
  Program,
  setProvider,
  workspace,
} from "@coral-xyz/anchor";

module.exports = async function (provider: AnchorProvider) {
  setProvider(provider);
  const program = workspace.axiom as Program;
  console.log("Deploying AXIOM program", program.programId.toBase58());
};
