import { NextRequest, NextResponse } from 'next/server';
import { requireAdminOrUnauthorized } from '@/lib/auth/admin-api';
import { writeAuditLog } from '@/lib/auth/audit-log';
import { prisma } from '@/lib/db/prisma';

type TokenBody = {
  id?: string;
  address?: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  chainId?: number;
  logoUrl?: string;
  isActive?: boolean;
};

function toAddress(value: string): string {
  return value.toLowerCase();
}

function isLikelyEvmAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export async function GET(req: NextRequest) {
  const { admin, unauthorizedResponse } = await requireAdminOrUnauthorized();
  if (!admin) {
    return unauthorizedResponse;
  }

  const active = req.nextUrl.searchParams.get('active');
  const where =
    active === null
      ? {}
      : {
          isActive: active === 'true',
        };

  const tokens = await prisma.token.findMany({
    where,
    orderBy: [{ chainId: 'asc' }, { symbol: 'asc' }],
  });

  return NextResponse.json({
    tokens: tokens.map((token: typeof tokens[number]) => ({
      ...token,
      id: token.id.toString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const { admin, unauthorizedResponse } = await requireAdminOrUnauthorized();
  if (!admin) {
    return unauthorizedResponse;
  }

  const body = (await req.json()) as TokenBody;
  if (!body.address || !body.symbol || body.decimals == null || body.chainId == null) {
    return NextResponse.json({ error: 'address, symbol, decimals and chainId are required' }, { status: 400 });
  }

  if (!isLikelyEvmAddress(body.address)) {
    return NextResponse.json({ error: 'Invalid token address format' }, { status: 400 });
  }

  const created = await prisma.token.upsert({
    where: {
      address_chainId: {
        address: toAddress(body.address),
        chainId: body.chainId,
      },
    },
    create: {
      address: toAddress(body.address),
      symbol: body.symbol,
      name: body.name,
      decimals: body.decimals,
      chainId: body.chainId,
      logoUrl: body.logoUrl,
      isActive: body.isActive ?? true,
    },
    update: {
      symbol: body.symbol,
      name: body.name,
      decimals: body.decimals,
      logoUrl: body.logoUrl,
      isActive: body.isActive ?? true,
    },
  });

  await writeAuditLog({
    action: 'ADMIN_TOKEN_UPSERT',
    adminId: admin.id,
    adminAddress: admin.address,
    newData: {
      id: created.id.toString(),
      address: created.address,
      symbol: created.symbol,
      chainId: created.chainId,
    },
    detail: 'Create or update token config',
  });

  return NextResponse.json({
    success: true,
    token: {
      ...created,
      id: created.id.toString(),
    },
  });
}

export async function PUT(req: NextRequest) {
  const { admin, unauthorizedResponse } = await requireAdminOrUnauthorized();
  if (!admin) {
    return unauthorizedResponse;
  }

  const body = (await req.json()) as TokenBody;
  if (!body.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const id = BigInt(body.id);
  const existing = await prisma.token.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 });
  }

  if (body.address && !isLikelyEvmAddress(body.address)) {
    return NextResponse.json({ error: 'Invalid token address format' }, { status: 400 });
  }

  const updated = await prisma.token.update({
    where: { id },
    data: {
      address: body.address ? toAddress(body.address) : undefined,
      symbol: body.symbol,
      name: body.name,
      decimals: body.decimals,
      chainId: body.chainId,
      logoUrl: body.logoUrl,
      isActive: body.isActive,
    },
  });

  await writeAuditLog({
    action: 'ADMIN_TOKEN_UPDATE',
    adminId: admin.id,
    adminAddress: admin.address,
    oldData: existing,
    newData: updated,
    detail: 'Update token config by id',
  });

  return NextResponse.json({
    success: true,
    token: {
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
  const existing = await prisma.token.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 });
  }

  const updated = await prisma.token.update({
    where: { id },
    data: { isActive: false },
  });

  await writeAuditLog({
    action: 'ADMIN_TOKEN_DISABLE',
    adminId: admin.id,
    adminAddress: admin.address,
    oldData: existing,
    newData: updated,
    detail: 'Disable token config',
  });

  return NextResponse.json({ success: true });
}
