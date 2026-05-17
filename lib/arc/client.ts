// Arc RPC client setup
import { ARC_RPC_URL } from '../../constants';
import { ethers } from 'ethers';

export const arcProvider = new ethers.JsonRpcProvider(ARC_RPC_URL);
