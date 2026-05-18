// POST /api/tx/validate — validate a send transaction before signing
// Supports both native token (ARC) and ERC20 token transfers.
import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { arcProvider } from '@/lib/arc/client';
import { ERC20_ABI } from '@/lib/arc/erc20';

interface ValidatePayload {
  from: string;
  to: string;
  amount?: string;      // smallest unit: wei for native, base unit for ERC20
  data?: string;        // optional raw calldata (native only)
  tokenAddress?: string;
  tokenType?: 'native' | 'erc20';
}

function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ValidatePayload;

    if (!body.from || !body.to) {
      return NextResponse.json(
        { error: 'From and to addresses are required', valid: false },
        { status: 400 },
      );
    }

    if (!isValidAddress(body.from) || !isValidAddress(body.to)) {
      return NextResponse.json(
        { error: 'Invalid address format', valid: false },
        { status: 400 },
      );
    }

    const amount = body.amount ? BigInt(body.amount) : BigInt(0);
    const isERC20 =
      body.tokenType === 'erc20' &&
      body.tokenAddress &&
      isValidAddress(body.tokenAddress);

    // ── ERC20 transfer validation ────────────────────────────────────────
    if (isERC20) {
      const tokenContract = new ethers.Contract(body.tokenAddress!, ERC20_ABI, arcProvider);

      let tokenBalance: bigint;
      let tokenSymbol = '';
      let tokenDecimals = 18;

      try {
        [tokenBalance, tokenSymbol, tokenDecimals] = await Promise.all([
          tokenContract.balanceOf(body.from) as Promise<bigint>,
          tokenContract.symbol() as Promise<string>,
          tokenContract.decimals() as Promise<number>,
        ]);
      } catch {
        return NextResponse.json(
          {
            error: 'Failed to read token contract. Verify the token address.',
            valid: false,
          },
          { status: 400 },
        );
      }

      if (amount > tokenBalance) {
        return NextResponse.json(
          { error: 'Insufficient token balance', valid: false },
          { status: 400 },
        );
      }

      // Encode ERC20 transfer calldata for gas estimation
      const iface = new ethers.Interface([
        'function transfer(address to, uint256 amount) returns (bool)',
      ]);
      const callData = iface.encodeFunctionData('transfer', [body.to, amount]);

      let estimatedGas = BigInt(65000); // conservative ERC20 default
      try {
        estimatedGas = await arcProvider.estimateGas({
          from: body.from,
          to: body.tokenAddress!,
          data: callData,
        });
      } catch {
        // keep default
      }

      const feeData = await arcProvider.getFeeData();
      const gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas ?? BigInt(0);
      const totalGasCost = estimatedGas * gasPrice;
      const nativeBalance = await arcProvider.getBalance(body.from);
      const hasEnoughGas = nativeBalance >= totalGasCost;

      return NextResponse.json({
        valid: hasEnoughGas,
        estimatedGas: estimatedGas.toString(),
        gasPrice: gasPrice.toString(),
        totalGasCost: totalGasCost.toString(),
        nativeBalance: nativeBalance.toString(),
        tokenBalance: tokenBalance.toString(),
        tokenSymbol,
        tokenDecimals,
        warning: hasEnoughGas
          ? null
          : 'Insufficient native balance to cover gas fees',
      });
    }

    // ── Native token transfer validation ────────────────────────────────
    const balance = await arcProvider.getBalance(body.from);

    if (amount > balance) {
      return NextResponse.json(
        { error: 'Insufficient balance', valid: false },
        { status: 400 },
      );
    }

    let estimatedGas = BigInt(21000); // standard ETH transfer
    if (body.data) {
      try {
        estimatedGas = await arcProvider.estimateGas({
          from: body.from,
          to: body.to,
          value: amount,
          data: body.data,
        });
      } catch {
        estimatedGas = BigInt(200000);
      }
    }

    const feeData = await arcProvider.getFeeData();
    const gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas ?? BigInt(0);
    const totalGasCost = estimatedGas * gasPrice;
    const totalRequired = amount + totalGasCost;
    const valid = totalRequired <= balance;

    return NextResponse.json({
      valid,
      estimatedGas: estimatedGas.toString(),
      gasPrice: gasPrice.toString(),
      totalGasCost: totalGasCost.toString(),
      senderBalance: balance.toString(),
      totalRequired: totalRequired.toString(),
      warning: valid
        ? null
        : 'Insufficient balance to cover transaction and gas fees',
    });
  } catch (error) {
    console.error('[/api/tx/validate] error:', error);
    return NextResponse.json(
      { error: 'Transaction validation failed', valid: false },
      { status: 500 },
    );
  }
}
