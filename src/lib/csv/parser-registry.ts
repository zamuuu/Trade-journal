import { BrokerParser } from "@/types";
import { sterlingParser } from "./parsers/sterling";

const parsers: Record<string, BrokerParser> = {
  sterling: sterlingParser,
};

export function getParser(brokerId: string): BrokerParser | null {
  return parsers[brokerId] ?? null;
}

export function getAvailableParsers(): { id: string; name: string }[] {
  return Object.entries(parsers).map(([id, parser]) => ({
    id,
    name: parser.name,
  }));
}
