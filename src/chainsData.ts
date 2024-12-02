type TEtheriumChain = {
  id: string;
  name: string;
  slug: string;
  logo: string;
  scanLogo: string;
  router: string;
  factory: string;
  rcpAddress: string;
  defaultGas: string;
  wCoin: string;
  testContract: string;
  honeyChecker: string;
  wUSD?: string;
}
export const chainsData: TEtheriumChain[] = [
  {
    // 0x91dFbEE3965baAEE32784c2d546B7a0C62F268c9
    id: 'localtestnet',
    name: 'Local test network',
    slug: 'LTN',
    logo: './assets/bsc.png',
    scanLogo: './assets/bscscan.png',
    router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
    rcpAddress: 'http://localhost:8545/',
    defaultGas: '5000000000',
    wCoin: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    testContract: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
    honeyChecker: '0x52689BA8e1D164A16fb06918A18978d03fF6EB3F',
  },
  {
    id: 'binance',
    name: 'Binance Smart Chain (BSC)',
    slug: 'BSC',
    logo: './assets/bsc.png',
    scanLogo: './assets/bscscan.png',
    router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
    rcpAddress: 'https://bsc-dataseed1.ninicoin.io/',
    defaultGas: '5000000000',
    wCoin: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    testContract: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
    honeyChecker: '0x52689BA8e1D164A16fb06918A18978d03fF6EB3F',
  },
  {
    id: 'ethereum',
    name: 'Ethereum (ETH)',
    slug: 'ETH',
    logo: './assets/ether.png',
    scanLogo: './assets/etherscan.png',
    router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    rcpAddress: 'https://cloudflare-eth.com/',
    defaultGas: '35000000000',
    wCoin: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    testContract: '0xF629cBd94d3791C9250152BD8dfBDF380E2a3B9c',
    honeyChecker: '0xe7e07a2281f1e66e938ae7feefc69db181329f12',
  },
  {
    id: 'dogechain',
    name: 'DogeChain',
    slug: 'DC',
    logo: './assets/dogechain.png',
    scanLogo: './assets/none.png',
    router: '0x72d85Ab47fBfc5E7E04a8bcfCa1601D8f8cE1a50',
    factory: '0xAaA04462e35f3e40D798331657cA015169e005d7',
    rcpAddress: 'https://rpc-us.dogechain.dog',
    defaultGas: '50000000000',
    wCoin: '0xB7ddC6414bf4F5515b52D8BdD69973Ae205ff101',
    testContract: '0x7b4328c127b85369d9f82ca0503b000d09cf9180',
    honeyChecker: '0x7c0612357771f6599e8e1a046a02f4beb9496de1',
  },
  {
    id: 'polygon',
    name: 'Polygon (MATIC)',
    slug: 'MATIC',
    logo: './assets/matic.png',
    scanLogo: './assets/none.png',
    router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
    factory: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
    rcpAddress: 'https://rpc-mainnet.maticvigil.com/',
    defaultGas: '5000000000',
    wCoin: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
    testContract: '0xa8fcee762642f156b5d757b6fabc36e06b6d4a1a',
    honeyChecker: '0xc817b3a104B7d48e3B9C4fbfd624e5D5F03757e0',
  },
  {
    id: 'fantom',
    name: 'Fantom',
    slug: 'FTM',
    logo: './assets/fantom.png',
    scanLogo: './assets/none.png',
    router: '0xf491e7b69e4244ad4002bc14e878a34207e38c29',
    factory: '0x152ee697f2e276fa89e96742e9bb9ab1f2e61be3',
    rcpAddress: 'https://rpc.ftm.tools',
    defaultGas: '100000000000',
    wCoin: '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83',
    testContract: '0xbf1f3d7266a1080bf448e428daa37eec6b05a8ed',
    honeyChecker: '0x4208B737e8f3075fD2dCB9cE3358689452f98dCf',
  },
  {
    id: 'avax',
    name: 'Avalanche',
    slug: 'avax',
    logo: './assets/avax.png',
    scanLogo: './assets/avax.png',
    router: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4',
    factory: '0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10',
    rcpAddress: 'https://api.avax.network/ext/bc/C/rpc',
    wCoin: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
    wUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    testContract: '0x6e84a6216ea6dacc71ee8e6b0a5b7322eebc0fdd',
    defaultGas: '94000000000',
    honeyChecker: '0xf3af9a948f275c2c3b9c61ade16540e66158a1d5',
  },
  {
    id: 'cronos',
    name: 'Cronos',
    slug: 'CRO',
    logo: './assets/cro.png',
    scanLogo: './assets/none.png',
    router: '0x145677fc4d9b8f19b5d56d1820c48e0443049a30',
    factory: '0xd590cC180601AEcD6eeADD9B7f2B7611519544f4',
    rcpAddress: 'https://evm.cronos.org',
    defaultGas: '5000000000',
    wCoin: '0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23',
    testContract: '0xccae06ec0787c07d7df5a60856c73a113fc7cf9a',
    honeyChecker: '0xb5BAA7d906b985C1A1eF0e2dAd19825EbAb5E9fc',
  },
];
