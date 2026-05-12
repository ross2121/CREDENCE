import {
  IkaCurveName,
  IkaNetwork,
  IkaSdkClientConfig,
  IkaSdkClientHandle,
  IkaSigningDefaults,
  IkaUserShareKeyMaterial,
} from "./types";

const DEFAULT_NETWORK: IkaNetwork = "testnet";

function loadPackage(name: string): Record<string, any> {
  try {
    return require(name);
  } catch (caught) {
    const detail = caught instanceof Error ? `: ${caught.message}` : "";
    throw new Error(
      `Missing optional Ika dependency "${name}"${detail}. Install @ika.xyz/sdk and @mysten/sui to run live dWallet flows.`
    );
  }
}

function assertSdkExport<T>(
  pkg: Record<string, any>,
  name: string,
  packageName: string
): T {
  const exported = pkg[name];
  if (!exported) {
    throw new Error(`Ika dependency "${packageName}" does not export ${name}`);
  }
  return exported as T;
}

export function normalizeIkaSeed(seed: Uint8Array | string): Uint8Array {
  if (typeof seed !== "string") return seed;
  return new TextEncoder().encode(seed);
}

export function ikaSolanaSigningDefaults(): IkaSigningDefaults {
  return {
    chain: "solana",
    curve: "ED25519",
    signatureAlgorithm: "EdDSA",
    hash: "SHA512",
  };
}

export async function createIkaSdkClient(
  config: IkaSdkClientConfig = {}
): Promise<IkaSdkClientHandle> {
  const sdk = loadPackage("@ika.xyz/sdk");
  const sui = loadPackage("@mysten/sui/client");
  const network = config.network ?? DEFAULT_NETWORK;
  const SuiClient = assertSdkExport<any>(
    sui,
    "SuiClient",
    "@mysten/sui/client"
  );
  const getFullnodeUrl = assertSdkExport<(network: string) => string>(
    sui,
    "getFullnodeUrl",
    "@mysten/sui/client"
  );
  const getNetworkConfig = assertSdkExport<(network: IkaNetwork) => unknown>(
    sdk,
    "getNetworkConfig",
    "@ika.xyz/sdk"
  );
  const IkaClient = assertSdkExport<any>(sdk, "IkaClient", "@ika.xyz/sdk");

  const suiClient = new SuiClient({
    url: config.suiRpcUrl ?? getFullnodeUrl(network),
  });
  const ikaClient = new IkaClient({
    suiClient,
    config: getNetworkConfig(network),
    network,
    cache: config.cache ?? true,
  });

  if (typeof ikaClient.initialize === "function") {
    await ikaClient.initialize();
  }

  return { sdk, sui, suiClient, ikaClient, network };
}

export async function createIkaUserShareKeys(
  seed: Uint8Array | string,
  curve: IkaCurveName = ikaSolanaSigningDefaults().curve
): Promise<IkaUserShareKeyMaterial> {
  const sdk = loadPackage("@ika.xyz/sdk");
  const Curve = assertSdkExport<Record<IkaCurveName, unknown>>(
    sdk,
    "Curve",
    "@ika.xyz/sdk"
  );
  const UserShareEncryptionKeys = assertSdkExport<any>(
    sdk,
    "UserShareEncryptionKeys",
    "@ika.xyz/sdk"
  );

  const curveValue = Curve[curve];
  if (curveValue === undefined) {
    throw new Error(`Unsupported Ika curve "${curve}"`);
  }

  const keys = await UserShareEncryptionKeys.fromRootSeedKey(
    normalizeIkaSeed(seed),
    curveValue
  );

  return {
    curve,
    suiAddress: keys.getSuiAddress(),
    publicKey: keys.getSigningPublicKeyBytes(),
    serialized: keys.toShareEncryptionKeysBytes(),
  };
}
