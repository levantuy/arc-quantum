import { ARC_TESTNET_CHAIN_ID } from '@/constants';

export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const ETHEREUM_SEPOLIA_CHAIN_ID = 11155111;

export const BRIDGE_SUPPORTED_CHAINS = [
  { id: ARC_TESTNET_CHAIN_ID, name: 'Arc Testnet' },
  { id: BASE_SEPOLIA_CHAIN_ID, name: 'Base Sepolia' },
  { id: ETHEREUM_SEPOLIA_CHAIN_ID, name: 'Ethereum Sepolia' },
] as const;

export const BRIDGE_TOKEN_OPTIONS = ['USDC', 'ETH', 'BNB'] as const;

export type BridgeTokenSymbol = (typeof BRIDGE_TOKEN_OPTIONS)[number];

const ARC_TOKEN_ADDRESSES: Record<BridgeTokenSymbol, `0x${string}`> = {
  USDC:
    (process.env.NEXT_PUBLIC_ARC_TESTNET_USDC_ADDRESS as `0x${string}` | undefined) ||
    '0x0000000000000000000000000000000000000001',
  ETH:
    (process.env.NEXT_PUBLIC_ARC_TESTNET_ETH_ADDRESS as `0x${string}` | undefined) ||
    '0x0000000000000000000000000000000000000002',
  BNB:
    (process.env.NEXT_PUBLIC_ARC_TESTNET_BNB_ADDRESS as `0x${string}` | undefined) ||
    '0x0000000000000000000000000000000000000003',
};

const BASE_SEPOLIA_TOKEN_ADDRESSES: Record<BridgeTokenSymbol, `0x${string}`> = {
  USDC:
    (process.env.NEXT_PUBLIC_BASE_SEPOLIA_USDC_ADDRESS as `0x${string}` | undefined) ||
    '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  ETH:
    (process.env.NEXT_PUBLIC_BASE_SEPOLIA_ETH_ADDRESS as `0x${string}` | undefined) ||
    '0x4200000000000000000000000000000000000006',
  BNB:
    (process.env.NEXT_PUBLIC_BASE_SEPOLIA_BNB_ADDRESS as `0x${string}` | undefined) ||
    '0x00000000000000000000000000000000000000bb',
};

const ETHEREUM_SEPOLIA_TOKEN_ADDRESSES: Record<BridgeTokenSymbol, `0x${string}`> = {
  USDC:
    (process.env.NEXT_PUBLIC_ETHEREUM_SEPOLIA_USDC_ADDRESS as `0x${string}` | undefined) ||
    '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238',
  ETH:
    (process.env.NEXT_PUBLIC_ETHEREUM_SEPOLIA_ETH_ADDRESS as `0x${string}` | undefined) ||
    '0xfff9976782d46cc05630d1f6ebab18b2324d6b14',
  BNB:
    (process.env.NEXT_PUBLIC_ETHEREUM_SEPOLIA_BNB_ADDRESS as `0x${string}` | undefined) ||
    '0x00000000000000000000000000000000000000cc',
};

const TOKEN_ADDRESS_BY_CHAIN: Record<number, Record<BridgeTokenSymbol, `0x${string}`>> = {
  [ARC_TESTNET_CHAIN_ID]: ARC_TOKEN_ADDRESSES,
  [BASE_SEPOLIA_CHAIN_ID]: BASE_SEPOLIA_TOKEN_ADDRESSES,
  [ETHEREUM_SEPOLIA_CHAIN_ID]: ETHEREUM_SEPOLIA_TOKEN_ADDRESSES,
};

export function getChainName(chainId: number): string {
  const matchedChain = BRIDGE_SUPPORTED_CHAINS.find((chain) => chain.id === chainId);
  if (matchedChain) {
    return matchedChain.name;
  }

  const legacyChainNames: Record<number, string> = {
    1: 'Ethereum',
    56: 'BSC',
    137: 'Polygon',
    42161: 'Arbitrum',
  };

  return legacyChainNames[chainId] || `Chain ${chainId}`;
}

export function getTokenAddress(chainId: number, symbol: BridgeTokenSymbol): `0x${string}` {
  const chainTokenMap = TOKEN_ADDRESS_BY_CHAIN[chainId];

  if (!chainTokenMap) {
    return ARC_TOKEN_ADDRESSES[symbol];
  }

  return chainTokenMap[symbol];
}

export function getTokenSymbolByAddress(tokenAddress: string): BridgeTokenSymbol | 'Unknown' {
  const normalizedAddress = tokenAddress.toLowerCase();

  for (const chainTokenMap of Object.values(TOKEN_ADDRESS_BY_CHAIN)) {
    for (const [symbol, address] of Object.entries(chainTokenMap)) {
      if (address.toLowerCase() === normalizedAddress) {
        return symbol as BridgeTokenSymbol;
      }
    }
  }

  return 'Unknown';
}
