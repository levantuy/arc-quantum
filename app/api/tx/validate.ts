// API route: Validate TX trước khi ký
import { NextRequest, NextResponse } from 'next/server';
import { arcProvider } from '@/lib/arc/client';

interface ValidatePayload {
  from: string;
  to: string;
  amount?: string;
  data?: string;
  gasLimit?: string;
  gasPrice?: string;
}

function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ValidatePayload;

    // Validate required fields
    if (!body.from || !body.to) {
      return NextResponse.json(
        { error: 'From and to addresses are required', valid: false },
        { status: 400 }
      );
    }

    if (!isValidAddress(body.from) || !isValidAddress(body.to)) {
      return NextResponse.json(
        { error: 'Invalid address format', valid: false },
        { status: 400 }
      );
    }

    // Check if sender has sufficient balance
    const balance = await arcProvider.getBalance(body.from);
    const amount = body.amount ? BigInt(body.amount) : BigInt(0);
    
    if (amount > balance) {
      return NextResponse.json(
        { error: 'Insufficient balance', valid: false },
        { status: 400 }
      );
    }

    // Estimate gas for the transaction
    let estimatedGas = BigInt(21000); // Standard transfer gas
    if (body.data) {
      // If there's contract interaction data, try to estimate
      try {
        estimatedGas = await arcProvider.estimateGas({
          from: body.from,
          to: body.to,
          value: amount,
          data: body.data,
        });
      } catch (e) {
        console.warn('Gas estimation failed:', e);
        // Use default estimate if contract call fails
        estimatedGas = BigInt(200000);
      }
    }

    const gasPrice = await arcProvider.getGasPrice();
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
      warning: valid ? null : 'Insufficient balance to cover transaction and gas',
    });
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { error: 'Transaction validation failed', valid: false },
      { status: 500 }
    );
  }
}
