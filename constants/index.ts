// Dùng để khai báo các hằng số toàn cục
export const ARC_RPC_URL = process.env.NEXT_PUBLIC_ARC_RPC_URL || 'https://rpc.testnet.arc.network';
export const ARC_TESTNET_CHAIN_ID = 5042002;
export const ARC_TESTNET_CHAIN_HEX = '0x4cef52';
export const ARC_TESTNET_EXPLORER_URL = 'https://testnet.arcscan.app';
export const ARC_SWAP_TOKENS = ['USDC', 'EURC', 'cirBTC'] as const;
export const SUPPORTED_CHAINS = [
  { id: ARC_TESTNET_CHAIN_ID, name: 'Arc Testnet' },
];
