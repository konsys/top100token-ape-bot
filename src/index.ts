// Seems Node owners are not really care about their TLS_CERT and common to get 'CERT_HAS_EXPIRED' Error
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Load Before everything
import Logger from './util/logger';
import SuperWallet from './blockchain/superWallet';

import { ApeEngine } from './engine/apeEngine';
import * as path from 'path';
import { app, BrowserWindow } from 'electron';
import { createWeb3Wallet } from './blockchain/utilities/walletHandler';
import BigNumber from 'bignumber.js';
import { ApeOrder, AppState } from './types';
import { ElectronBroker } from './electronBroker';
import { ElectronStore } from './util/electronStorage';
import Web3 from 'web3';
import SQL from './util/sqlStorage';

import { SwapWallet } from './blockchain/swapWallet';
import { ethereumChains } from './chainDatas';
import { TelegramSingaler } from './plugins/telegram/telegram';
import { WebsocketSignaler } from './plugins/websocket/websocket';
import Store from 'electron-store';

console.log(121);   
console.log(234);  
if (process.env.NODE_ENV === 'development') {
  require('electron-watch')(
    __dirname,
    'dev',             // npm scripts, means: npm run dev:electron-main
    path.join(__dirname, './'),      // cwd
    2000,                            // debounce delay
  );
}
 

let electronBroker: ElectronBroker;

BigNumber.set({ EXPONENTIAL_AT: 80 });

SuperWallet.init();

const store = new Store({
  encryptionKey: 'The old apple revels in its authority',
});

const createWindow = (): Electron.BrowserWindow => {
  const window = new BrowserWindow({
    width: 1800,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  window.loadFile(path.join(__dirname, '../assets/index.html'));

  if (process?.env?.DEBUG === 'true') {
    window.webContents.openDevTools();
  }

  return window;
};
console.log(6663456);  
if (app) {
  Store.initRenderer();
  SQL.init();
  /*
  SQL.ReadData<ApeHistoryDB>('apeHistory').then((data)=> {
    console.log(data)
  });
  */

  app.whenReady().then(() => {
    const mainWindow = createWindow();

    electronBroker = new ElectronBroker(mainWindow);

    Logger.setWindow(mainWindow);

    start(electronBroker).then();
  });
  app.on('window-all-closed', () => {
    app.quit();
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const mainWindow = createWindow();

      electronBroker = new ElectronBroker(mainWindow);

      Logger.setWindow(mainWindow);

      start(electronBroker).then();
    }
  });
}

const appState: AppState = {
  syncStared: false,
  buttonState: 'none',
  selectedToken: undefined,
  privateKey: '',
  runningApes: [],
  settings: {} as unknown as AppState['settings'],
};

const startNewApe = async (apeAddress: string, broker: ElectronBroker) => {
  if (apeAddress) {
    if (appState.runningApes.find((e) => e.contractAddress === apeAddress && e.orderStatus <= 7)) {
      Logger.log('You cannot create new Ape order for the given address!');
      return;
    }

    const apeEngine = new ApeEngine({
      chainId: appState.settings.chainId,
      privateKey: appState.privateKey,
      apeAmount: appState.settings.apeAmount,
      minProfitPct: appState.settings.minProfit,
      gasprice: appState.settings.gasPrice,
      gasLimit: appState.settings.gasLimit,
      maxSlippage: appState.settings.maxSlippage,
    });

    await apeEngine.SafeBuyApe(apeAddress);

    appState.runningApes.push(apeEngine);

    const allApes = appState.runningApes.map((e) => e.SnapshotApe());

    broker.emit(
      'portfolio:sync',
      allApes.filter((e) => e.status < 8),
    );
  }
};

const loadNewApe = async (apeAddress: string, broker: ElectronBroker) => {
  if (apeAddress) {
    Logger.log('New ape address', apeAddress);

    const wallet = new SwapWallet(appState.settings.chainId, appState.privateKey);

    const erc20Data = await wallet.GetERC20Data(apeAddress);

    appState.selectedToken = {
      ...erc20Data,
      address: apeAddress,
      chainId: appState.settings.chainId,
    };

    const slippage = await wallet.GetSlippage(apeAddress, Web3.utils.toWei(appState.settings.apeAmount, 'ether'));

    if (slippage) {
      appState.selectedToken = {
        ...appState.selectedToken,
        ...slippage,
      };
    }

    Logger.log('Honey/slippage result:', slippage);

    const balance = await wallet.BalanceOfErc20(apeAddress);

    if (balance) {
      appState.selectedToken = {
        ...appState.selectedToken,
        balanceReal: balance,
        balance: new BigNumber(balance)
          .div(10 ** erc20Data.decimals)
          .toNumber()
          .toFixed(8),
      };
    }

    broker.emit('selectedToken:data:update', appState.selectedToken);
  }
};

const start = async (broker: ElectronBroker) => {
  // Load Settings
  if (store.get('chainId')) {
    appState.settings.chainId = store.get('chainId') as string;
  }
  if (store.has('apeAmount')) {
    appState.settings.apeAmount = store.get('apeAmount') as string;
  }
  if (store.has('minProfit')) {
    appState.settings.minProfit = store.get('minProfit') as string;
  }
  if (store.has('gasPrice')) {
    appState.settings.gasPrice = store.get('gasPrice') as string;
  }
  if (store.has('gasLimit')) {
    appState.settings.gasLimit = store.get('gasLimit') as string;
  }
  if (store.has('maxSlippage')) {
    appState.settings.maxSlippage = store.get('maxSlippage') as string;
  }

  // Bot already setted up!
  if (store.has('privateKey')) {
    const privateKey = store.get('privateKey');

    appState.privateKey = privateKey as string;

    if (appState.settings.chainId) {
      SuperWallet.AddPrivateKey(appState.settings.chainId, appState.privateKey);
    }

    const apeStore = new ElectronStore(`${privateKey}:apeOrders`, 'address');

    const allApes = await apeStore.Load<ApeOrder>();

    // Load Portfolio Apes
    allApes.forEach((apeOrder) => {
      // Only load orders which has still something to do
      if (apeOrder.status >= 2 && apeOrder.status <= 6) {
        const apeEngine = new ApeEngine({
          chainId: apeOrder.chain,
          privateKey: appState.privateKey,
          apeAmount: Web3.utils.fromWei(apeOrder.apeAmount, 'ether'),
          minProfitPct: apeOrder.minProfit.toString(),
        });

        apeEngine.LoadSnapshotApe(apeOrder);
        apeEngine.CreateEventQueue(3000); // Slow down update interval

        appState.runningApes.push(apeEngine);
      }
    });
  }

  /*
  const websocketSignal = new WebsocketSignaler('', 'testSignal', 'binance');

  if (websocketSignal) {
    websocketSignal.on('newSignal', async (address: string) => {
      try {
        if (store.has('signalHistoryTg')) {
          if (store.get('signalHistoryTg') === address) {
            return;
          }
        }

        store.set('signalHistoryTg', address);

        if (appState.runningApes.find((e) => e.contractAddress === address && e.orderStatus <= 7)) {
          Logger.log('You cannot create new Ape order for the given address!');
          return;
        }

        const apeEngine = new ApeEngine({
          chainId: appState.settings.chainId,
          privateKey: appState.privateKey,
          apeAmount: appState.settings.apeAmount,
          minProfitPct: appState.settings.minProfit,
          gasprice: appState.settings.gasPrice,
          gasLimit: appState.settings.gasLimit,
          maxSlippage: appState.settings.maxSlippage,
        });

        await apeEngine.SafeBuyApe(address);

        appState.runningApes.push(apeEngine);
      } catch (error) {
        Logger.log('Unable to start Websocket Signal APE');
      }
    });
  }
  */

  // TELEGRAM PLUGIN
  if (store.has('telegramAPI') && store.has('telegramAPIHASH')) {
    if (store.has('telegramSession') && store.has('telegramChannel')) {
      const tgOption = {
        api: store.get('telegramAPI') as string,
        hash: store.get('telegramAPIHASH') as string,
        session: store.get('telegramSession') as string,
        channel: store.get('telegramChannel') as string,
        filter: store.get('telegramFilter') as string || '',
      };

      if (tgOption?.channel?.length) {
        const telegramSignaler = new TelegramSingaler(
          tgOption.api,
          tgOption.hash,
          tgOption.session,
          tgOption.channel,
          tgOption.filter,
        );
        telegramSignaler.on('newSignal', async (address: string) => {
          try {
            if (store.has('signalHistoryTg')) {
              if (store.get('signalHistoryTg') === address) {
                return;
              }
            }

            store.set('signalHistoryTg', address);

            if (appState.runningApes.find((e) => e.contractAddress === address && e.orderStatus <= 7)) {
              Logger.log('You cannot create new Ape order for the given address!');
              return;
            }

            const apeEngine = new ApeEngine({
              chainId: appState.settings.chainId,
              privateKey: appState.privateKey,
              apeAmount: appState.settings.apeAmount,
              minProfitPct: appState.settings.minProfit,
              gasprice: appState.settings.gasPrice,
              gasLimit: appState.settings.gasLimit,
              maxSlippage: appState.settings.maxSlippage,
            });

            await apeEngine.SafeBuyApe(address);

            appState.runningApes.push(apeEngine);
          } catch (error) {
            Logger.log('Unable to start Telegram Signal APE');
          }
        });
      }
    }
  }

  broker.msg.on('apeAddress:changed', async (event, apeAddress) => {
    try {
      loadNewApe(apeAddress, broker);
    } catch (error) {
      event.reply('asynchronous-reply', {
        status: 'error',
        statusdDetails: error,
      });
    }
  });

  broker.msg.on('button:control', async (event, action, apeAddress) => {
    try {
      if (action === 'start') {
        startNewApe(apeAddress, broker);
      }
    } catch (error) {
      event.reply('asynchronous-reply', {
        status: 'error',
        statusdDetails: error,
      });
    }
  });

  broker.msg.on('setting:async', async (event, arg) => {
    if (appState.settings.chainId != arg.chain || appState.privateKey != arg.privateKey) {
      SuperWallet.AddPrivateKey(arg.chain, arg.privateKey);
    }

    appState.privateKey = arg.privateKey;
    appState.settings.chainId = arg.chain;
    appState.settings.apeAmount = arg.apeAmount;
    appState.settings.minProfit = arg.minProfit;
    appState.settings.gasPrice = arg.gasPrice;
    appState.settings.gasLimit = arg.gasLimit;
    appState.settings.maxSlippage = arg.maxSlippage;

    console.log(appState.settings);
  });

  broker.msg.on('start:sync', () => {
    const apeStore = new ElectronStore(`${appState.privateKey}:apeOrders`, 'address');

    if (!appState.syncStared) {
      appState.syncStared = true;

      const allApes = appState.runningApes.map((e) => e.SnapshotApe());
      broker.emit(
        'portfolio:sync',
        allApes.filter((e) => e.status < 8),
      );

      setInterval(async () => {
        const chainData = ethereumChains.find((e) => e.id === appState.settings.chainId);

        if (chainData) {
          const wallet = new SwapWallet(appState.settings.chainId, appState.privateKey);

          const ethBalance = await wallet.GetEthBalance();

          broker.emit('write:info', {
            status: 'success',
            statusdDetails: undefined,
            chainName: `${chainData.name}`,
            walletAddress: `${wallet.walletAddress}`,
            walletBalance: `${new BigNumber(ethBalance).dividedBy(10 ** 18).toString()}`,
          });
        }
      }, 1000);

      setInterval(async () => {
        const allApes = appState.runningApes.map((e) => e.SnapshotApe());

        broker.emit(
          'portfolio:sync',
          allApes.filter((e) => e.status < 8),
        );

        const runningApes: ApeOrder[] = appState.runningApes.map((e) => e.SnapshotApe());

        if (runningApes.length > 0) {
          await apeStore.Write<ApeOrder>(runningApes);
        }
      }, 5000);
    }
  });

  broker.msg.on('portfolio:stop', async (event, address) => {
    try {
      const portfolioApe = appState.runningApes.find((e) => e.contractAddress === address && e.orderStatus < 8);

      if (portfolioApe) {
        portfolioApe.StopApe();
      }

      Logger.log('portfolio:stop', address);
    } catch (error) { }
  });

  broker.msg.on('portfolio:sell', async (event, address) => {
    try {
      const portfolioApe = appState.runningApes.find((e) => e.contractAddress === address && e.orderStatus < 8);

      if (portfolioApe) {
        portfolioApe.PanicSell();
      }

      Logger.log('portfolio:sell', address);
    } catch (error) { }
  });

  broker.msg.on('wallet:generate', async (event, arg) => {
    try {
      const result = createWeb3Wallet();

      event.reply('wallet:generate', {
        address: result.address,
        privateKey: result.privateKey,
      });
    } catch (error) { }
  });

  broker.msg.on('privateKey:new', async (event, arg) => {
    try {
      const result = createWeb3Wallet();

      event.reply('wallet:generate', {
        address: result.address,
        privateKey: result.privateKey,
      });
    } catch (error) { }
  });
};
