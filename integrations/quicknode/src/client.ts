import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  LiquidationWarning,
  ProgramEvent,
  QuickNodeConfig,
  SimulatableConnection,
  SimulationResult,
} from "./types";

export class QuickNodeClient {
  readonly connection: Connection;

  constructor(readonly config: QuickNodeConfig) {
    this.connection = new Connection(config.rpcUrl, {
      commitment: config.commitment ?? "confirmed",
      wsEndpoint: config.websocketUrl,
    });
  }

  listenProgramLogs(
    programId: PublicKey,
    onEvent: (event: ProgramEvent) => void
  ): number {
    return this.connection.onLogs(
      programId,
      (logs, context) =>
        onEvent({
          signature: logs.signature,
          slot: context.slot,
          logs: logs.logs,
        }),
      this.config.commitment ?? "confirmed"
    );
  }

  listenLiquidationWarnings(
    programId: PublicKey,
    onWarning: (warning: LiquidationWarning) => void
  ): number {
    return this.listenProgramLogs(programId, (event) => {
      const warning = parseLiquidationWarning(event);
      if (warning) onWarning(warning);
    });
  }

  async simulate(
    transaction: Transaction,
    connection: SimulatableConnection = this.connection
  ): Promise<SimulationResult> {
    const result = await connection.simulateTransaction(transaction);
    return {
      ok: result.value.err === null,
      logs: result.value.logs ?? [],
      error: result.value.err ? JSON.stringify(result.value.err) : undefined,
    };
  }
}

export function parseLiquidationWarning(
  event: ProgramEvent
): LiquidationWarning | null {
  const line = event.logs.find((log) => log.includes("LiquidationWarning"));
  if (!line) return null;

  return {
    signature: event.signature,
    loan: parsePubkey(line, "loan"),
    borrower: parsePubkey(line, "borrower"),
    collateralValueUsd: parseNumber(line, "collateral_value_usd"),
    debtUsdt: parseNumber(line, "debt_usdt"),
  };
}

function parsePubkey(line: string, key: string): PublicKey | null {
  const value = parseField(line, key);
  if (!value) return null;

  try {
    return new PublicKey(value);
  } catch {
    return null;
  }
}

function parseNumber(line: string, key: string): number | null {
  const value = parseField(line, key);
  return value ? Number(value) : null;
}

function parseField(line: string, key: string): string | null {
  const match = line.match(new RegExp(`${key}=([^\\s,]+)`));
  return match?.[1] ?? null;
}
