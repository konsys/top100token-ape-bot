import Web3 from 'web3';
import Crypto from 'crypto';

export const randomEntropy = Crypto.randomBytes(32).toString('hex');

export interface Account {
  address: string;
  privateKey: string;
  signTransaction: any;
  sign: any;
  encrypt: any;
}

export interface TxConfing {
  to: string;
  value?: number | string;
  gasLimit?: number | string;
  gasPrice?: number | string;
}

export const AddressFromPrivatekey = (privateKey: string) => {
  const web3 = new Web3();

  const wallet = web3.eth.accounts.privateKeyToAccount(privateKey);

  return wallet.address;
};

export const createWeb3Wallet = (entropy = randomEntropy): Account => {
  const web3 = new Web3();

  const result = web3.eth.accounts.create(entropy);

  return result;
};
