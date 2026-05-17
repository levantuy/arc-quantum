// Các hàm tiện ích dùng chung
export function shortenAddress(address: string, chars = 4) {
  return `${address.slice(0, 2 + chars)}...${address.slice(-chars)}`;
}

export function formatAmount(amount: string, decimals = 6) {
  return parseFloat(amount).toFixed(decimals);
}
