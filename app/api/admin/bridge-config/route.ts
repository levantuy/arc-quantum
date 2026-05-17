import { NextRequest, NextResponse } from 'next/server';
import { requireAdminOrUnauthorized } from '@/lib/auth/admin-api';
import { writeAuditLog } from '@/lib/auth/audit-log';
import { prisma } from '@/lib/db/prisma';

type BridgeConfigBody = {
  id?: string;
  chainFrom?: number;
  chainTo?: number;
  minAmount?: string;
  maxAmount?: string;
  fee?: string;
  isActive?: boolean;
};

function isPositiveDecimal(value: string): boolean {
  return /^\d+(\.\d+)?$/.test(value);
}

function isValidFee(value: string): boolean {
  if (!isPositiveDecimal(value)) {
    return false;
  }

  const numeric = Number(value);
  return numeric >= 0 && numeric < 100;
}

function validateRange(minAmount: string, maxAmount: string): boolean {
  if (!isPositiveDecimal(minAmount) || !isPositiveDecimal(maxAmount)) {
    return false;
  }

  return Number(minAmount) < Number(maxAmount);
}

export async function GET() {
  const { admin, unauthorizedResponse } = await requireAdminOrUnauthorized();
  if (!admin) {
    return unauthorizedResponse;
  }

  const bridgeConfigs = await prisma.bridgeConfig.findMany({
    orderBy: [{ chainFrom: 'asc' }, { chainTo: 'asc' }],
  });

  return NextResponse.json({
    bridgeConfigs: bridgeConfigs.map((item: typeof bridgeConfigs[number]) => ({
      ...item,
      id: item.id.toString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const { admin, unauthorizedResponse } = await requireAdminOrUnauthorized();
  if (!admin) {
    return unauthorizedResponse;
  }

  const body = (await req.json()) as BridgeConfigBody;
  if (
    body.chainFrom == null ||
    body.chainTo == null ||
    !body.minAmount ||
    !body.maxAmount ||
    !body.fee
  ) {
    return NextResponse.json(
      { error: 'chainFrom, chainTo, minAmount, maxAmount and fee are required' },
      { status: 400 },
    );
  }

  if (body.chainFrom === body.chainTo) {
    return NextResponse.json({ error: 'chainFrom and chainTo must be different' }, { status: 400 });
  }

  if (!validateRange(body.minAmount, body.maxAmount)) {
    return NextResponse.json({ error: 'minAmount must be less than maxAmount' }, { status: 400 });
  }

  if (!isValidFee(body.fee)) {
    return NextResponse.json({ error: 'fee must be in [0, 100)' }, { status: 400 });
  }

  const bridgeConfig = await prisma.bridgeConfig.upsert({
    where: {
      chainFrom_chainTo: {
        chainFrom: body.chainFrom,
        chainTo: body.chainTo,
      },
    },
    create: {
      chainFrom: body.chainFrom,
      chainTo: body.chainTo,
      minAmount: body.minAmount,
      maxAmount: body.maxAmount,
      fee: body.fee,
      isActive: body.isActive ?? true,
    },
    update: {
      minAmount: body.minAmount,
      maxAmount: body.maxAmount,
      fee: body.fee,
      isActive: body.isActive ?? true,
    },
  });

  await writeAuditLog({
    action: 'ADMIN_BRIDGE_CONFIG_UPSERT',
    adminId: admin.id,
    adminAddress: admin.address,
    newData: bridgeConfig,
    detail: 'Create or update bridge config',
  });

  return NextResponse.json({
    success: true,
    bridgeConfig: {
      ...bridgeConfig,
      id: bridgeConfig.id.toString(),
    },
  });
}

export async function PUT(req: NextRequest) {
  const { admin, unauthorizedResponse } = await requireAdminOrUnauthorized();
  if (!admin) {
    return unauthorizedResponse;
  }

  const body = (await req.json()) as BridgeConfigBody;
  if (!body.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const id = BigInt(body.id);
  const existing = await prisma.bridgeConfig.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: 'Bridge config not found' }, { status: 404 });
  }

  if (body.minAmount && body.maxAmount && !validateRange(body.minAmount, body.maxAmount)) {
    return NextResponse.json({ error: 'minAmount must be less than maxAmount' }, { status: 400 });
  }

  if (body.fee && !isValidFee(body.fee)) {
    return NextResponse.json({ error: 'fee must be in [0, 100)' }, { status: 400 });
  }

  const updated = await prisma.bridgeConfig.update({
    where: { id },
    data: {
      chainFrom: body.chainFrom,
      chainTo: body.chainTo,
      minAmount: body.minAmount,
      maxAmount: body.maxAmount,
      fee: body.fee,
      isActive: body.isActive,
    },
  });

  await writeAuditLog({
    action: 'ADMIN_BRIDGE_CONFIG_UPDATE',
    adminId: admin.id,
    adminAddress: admin.address,
    oldData: existing,
    newData: updated,
    detail: 'Update bridge config by id',
  });

  return NextResponse.json({
    success: true,
    bridgeConfig: {
      ...updated,
      id: updated.id.toString(),
    },
  });
}

export async function DELETE(req: NextRequest) {
  const { admin, unauthorizedResponse } = await requireAdminOrUnauthorized();
  if (!admin) {
    return unauthorizedResponse;
  }

  const idParam = req.nextUrl.searchParams.get('id');
  if (!idParam) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const id = BigInt(idParam);
  const existing = await prisma.bridgeConfig.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: 'Bridge config not found' }, { status: 404 });
  }

  const updated = await prisma.bridgeConfig.update({
    where: { id },
    data: { isActive: false },
  });

  await writeAuditLog({
    action: 'ADMIN_BRIDGE_CONFIG_DISABLE',
    adminId: admin.id,
    adminAddress: admin.address,
    oldData: existing,
    newData: updated,
    detail: 'Disable bridge config',
  });

  return NextResponse.json({ success: true });
}
