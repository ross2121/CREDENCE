import {
  completion,
  loadModel,
  QWEN3_600M_INST_Q4,
  unloadModel,
} from "@qvac/sdk";
import { QvacCreditModel } from "../axiom-agents/credit-agent/src";
import { buildFeatureVector } from "../axiom-agents/credit-agent/src";

async function main() {
  const runInference = process.env.AXIOM_QVAC_RUN === "true";
  const modelName = process.env.AXIOM_QVAC_CREDIT_MODEL ?? "QWEN3_600M_INST_Q4";

  console.log("QVAC SDK installed");
  console.log("Default model:", modelName);
  console.log("Inference enabled:", runInference);

  if (!runInference) {
    const model = QvacCreditModel.fromEnv();
    const decision = await model.decide(
      buildFeatureVector({
        wallet: "qvac-smoke-wallet",
        chains: [],
      })
    );

    console.log("Adapter fallback decision:", decision);
    console.log("Set AXIOM_QVAC_ENABLED=true AXIOM_QVAC_RUN=true to load a QVAC model.");
    return;
  }

  const modelId = await loadModel({
    modelSrc: QWEN3_600M_INST_Q4,
    modelType: "llm",
    modelConfig: {
      ctx_size: Number(process.env.AXIOM_QVAC_CONTEXT_SIZE ?? 2048),
    },
  });

  try {
    const result = completion({
      modelId,
      stream: false,
      history: [
        {
          role: "user",
          content: "Return only this JSON: {\"ok\":true,\"runtime\":\"qvac\"}",
        },
      ],
    });

    console.log(await result.text);
  } finally {
    await unloadModel({ modelId });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
