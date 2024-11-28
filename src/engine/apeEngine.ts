import BigNumber from 'bignumber.js';
import Web3 from 'web3';

BigNumber.set({ EXPONENTIAL_AT: 80 });

import { approveInfinity } from '../contants';

import { ApeContract, ApeOrder, ApeOrderStatus, Balance, EngineEvent, ApeHistoryDB, ApeState } from '../types';

import { SwapWallet } from '../blockchain/swapWallet';

import { EventEmitter } from 'eventemitter3';
import { ERC20TokenData } from '../blockchain/utilities/erc20';
import { Logger } from '../util/logger';
import SQL from '../util/sqlStorage';

export interface ApeEngineSettings {
  chainId: string;
  privateKey: string;
  apeAmount: string;
  minProfitPct: string;
  gasprice?: string;
  gasLimit?: string;
  updateTimeout?: number;
  injectWallet?: SwapWallet;
  maxSlippage?: string;
}

export class ApeEngine extends EventEmitter {
  public orderStatus = ApeOrderStatus.created;

  private retryTimeout = 5000;

  private maxBuyRetry = 5;
  private maxApproveRerty = 5;
  private maxSellRetry = 5;

  private currBuyRetry = 0;
  private currApproveRerty = 0;
  private currSellRetry = 0;

  public contractAddress = '';

  public liqudityAddress?: string;

  private updateInterval?: NodeJS.Timeout;

  private swapWallet: SwapWallet;

  private Balance: Balance;

  private Events: EngineEvent[] = [];

  private Contract?: ApeContract;
  private apeAmount: string;

  public minProfit: number;

  private lastState = '';
  public state: ApeState = ApeState.wait;

  public isApproved = false;
  public isSelling = false;

  public paused = false;

  public swapValue = '0';

  public currProfit = '0.00%';

  public erc20Data: ERC20TokenData | undefined;

  public createdAt = Date.now();
  public slippage: number;
  public sellTax: number;

  constructor(settings: ApeEngineSettings) {
    super();

    this.swapWallet =
      settings.injectWallet ||
      new SwapWallet(settings.chainId, settings.privateKey, settings.gasprice, settings.gasLimit);

    this.Balance = {
      chain: this.swapWallet.chainData.id,
      ethBalance: '0',
    };

    this.apeAmount = Web3.utils.toWei(settings.apeAmount, 'ether');

    this.minProfit = Number(settings.minProfitPct) / 100;

    this.sellTax = 0.03;

    this.slippage = Number(settings.maxSlippage ?? 10) / 100;

    this.CreateEventQueue(settings.updateTimeout || 800);
  }

  public SnapshotApe(): ApeOrder {
    return {
      chain: this.swapWallet.chainData.id,
      address: this.contractAddress,
      erc20Data: this.erc20Data,
      apeAmount: this.apeAmount,
      tokenBalance: this.Balance[this.contractAddress],
      minProfit: this.minProfit,
      currProfit: this.currProfit,
      isApproved: this.isApproved,
      slippage: this.slippage,
      stopped: false,
      error: undefined,
      status: this.orderStatus,
      createdAt: this.createdAt,
    };
  }

  public PauseApe() {
    this.paused = !this.paused;
  }

  public StopApe() {
    this.paused = true;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    // Save forced stop status
    if (this.orderStatus !== ApeOrderStatus.finished) {
      this.orderStatus = ApeOrderStatus.stopped;
    }
  }

  public PanicSell() {
    this.minProfit = -0.99;
    this.slippage = 0.99;
  }

  public SetMinProfit(minProfit: number) {
    this.minProfit = minProfit;
  }

  async SafeBuyApe(address: string) {
    this.contractAddress = address;
    await this.HandleSafeBuyApe();
  }

  public async LoadSnapshotApe(apeOrder: ApeOrder) {
    this.contractAddress = apeOrder.address;
    this.Balance[apeOrder.address] = apeOrder.tokenBalance;
    this.minProfit = apeOrder.minProfit;
    (this.apeAmount = apeOrder.apeAmount), (this.isApproved = apeOrder.isApproved);
    this.orderStatus = apeOrder.status;
    this.createdAt = apeOrder.createdAt;

    this.erc20Data = apeOrder.erc20Data;

    this.UpdateERC20(apeOrder.address);

    if (!this.isApproved) {
      this.Events.push({
        type: 'apeApprove',
        address: apeOrder.address,
      });
    }

    this.Events.push({
      type: 'apeExitCheck',
      address: apeOrder.address,
    });
  }

  public CreateEventQueue(speed: number) {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      if (this.state !== this.lastState) {
        this.lastState = this.state;
      }

      if (this.paused) {
        return;
      }

      const e = this.Events.shift();

      if (e) {
        switch (e.type) {
          case 'apeBuyFail':
            this.HandleSafeBuyApe();
            break;
          case 'apeBuySuccess':
            this.HandleApeBuySuccess(e.address);
            break;
          case 'apeApprove':
            this.HandleApeApprove(e.address);
            break;
          case 'apeExitCheck':
            this.HandleApeExitCheck(e.address);
            break;
        }
      }
    }, speed);
  }

  async HandleApeBuySuccess(address: string) {
    try {
      const basicData = await this.swapWallet.GetERC20Data(address);

      this.erc20Data = basicData;

      const contractData = {
        address,
        ...basicData,
      };

      this.Contract = contractData;
    } catch (error) {
      Logger.log(error);

      this.Events.push({
        type: 'apeBuySuccess',
        address,
      });
    }
  }

  async HandleSafeBuyApe() {
    try {
      this.state = ApeState.waitLiquidity;

      if (!this.erc20Data) {
        const basicData = await this.swapWallet.GetERC20Data(this.contractAddress);
        this.erc20Data = basicData;
      }

      // Check is the transaction and honeypot
      const slipResult = await this.swapWallet.GetSlippage(
        this.contractAddress,
        this.apeAmount,
        this.swapWallet.chainData.router,
      );

      // Logger.log('Honey / Slip checker result', {
      //   ...slipResult,
      // });

      if (slipResult.isHoneypot === 0) {
        const buyTax = Number(slipResult.buyTax) / 100;

        this.sellTax = Number(slipResult.sellTax) / 100;

        const minAmount = new BigNumber(slipResult.expectedBuyAmount)
          .multipliedBy(1 - (this.slippage + buyTax))
          .toFixed(0);

        Logger.log('Max amount', slipResult.expectedBuyAmount, 'Min amount', minAmount);

        this.HandleApeBuyEvent(this.contractAddress, minAmount);
        return;
      } else {
        this.currBuyRetry += 1;

        if (this.currBuyRetry >= this.maxBuyRetry) {
          this.state = ApeState.retryBuyLimitAndStopped;
          this.StopApe();
          return;
        }

        Logger.log(`Transaction pre-check failed ${this.contractAddress}`);
      }

      this.Events.push({
        type: 'apeBuyFail',
        address: this.contractAddress,
      });
    } catch (error) {
      this.currBuyRetry += 1;

      if (this.currBuyRetry >= this.maxBuyRetry) {
        this.state = ApeState.retryBuyLimitAndStopped;
        this.StopApe();
        return;
      } else {
        this.Events.push({
          type: 'apeBuyFail',
          address: this.contractAddress,
        });
      }

      Logger.log(`Error HandleSafeBuyApe ${error}`);
    }
  }

  async HandleApeExitCheck(address: string) {
    try {
      this.orderStatus = ApeOrderStatus.waitForExit;

      const tokenBalance = await this.swapWallet.BalanceOfErc20(address);
      const swapValue = await this.swapWallet.GetApeSwapValue(address, tokenBalance, this.sellTax);

      this.Balance[address] = tokenBalance;

      this.swapValue = swapValue;

      const kindofProfit = new BigNumber(swapValue)
        .dividedBy(new BigNumber(this.apeAmount))
        .multipliedBy(100)
        .toNumber();

      if (Number(this.swapValue) !== 0) {
        this.currProfit = `${Number(Math.round(kindofProfit) - 100)
          .toFixed(2)
          .toString()}%`;
      }

      if (new BigNumber(swapValue).isGreaterThan(new BigNumber(this.apeAmount).multipliedBy(1 + this.minProfit))) {
        if (!this.isSelling) {
          await this.HandleApeSell(
            address,
            tokenBalance,
            new BigNumber(swapValue).multipliedBy(1 - this.slippage).toFixed(0),
          );
        }

        return;
      }
    } catch (error) {
      Logger.log(error);
    } finally {
      this.Events.push({
        type: 'apeExitCheck',
        address,
      });
    }
  }

  private async HandleApeBuyEvent(address: string, minAmount: string): Promise<any> {
    try {
      this.state = ApeState.buyStarted;
      this.orderStatus = ApeOrderStatus.buyStart;

      if (this.currBuyRetry >= this.maxBuyRetry) {
        this.state = ApeState.retryBuyLimitAndStopped;
        this.StopApe();
        return;
      }

      const data = await this.swapWallet.SwapExactETHForTokens(address, this.swapWallet.walletAddress, minAmount);

      const singedTx = await this.swapWallet.CreateSignedTx(data, {
        to: this.swapWallet.chainData.router,
        value: this.apeAmount,
      });

      const receipt = await this.swapWallet.SendSignedTx(singedTx);

      if (receipt) {
        this.state = ApeState.buySuccess;
        this.orderStatus = ApeOrderStatus.buySuccess;

        this.Events.push({
          type: 'apeApprove',
          address,
        });

        this.Events.push({
          type: 'apeBuySuccess',
          address,
        });

        this.Events.push({
          type: 'apeExitCheck',
          address,
        });
      } else {
        throw new Error('Transaction failed!');
      }
    } catch (error) {
      Logger.log(error);

      this.state = ApeState.retryBuy;

      this.currBuyRetry += 1;

      this.Events.push({
        type: 'apeBuyFail',
        address,
      });
      return;
    }
  }

  private async HandleApeApprove(address: string): Promise<any> {
    try {
      this.state = ApeState.approveStarted;
      this.orderStatus = ApeOrderStatus.approvedStart;

      const tokenBalance = await this.swapWallet.BalanceOfErc20(address);

      if (new BigNumber(tokenBalance).isZero()) {
        throw new Error('Cannot Approve Token Balance is 0');
      }

      const allowed = await this.swapWallet.AllowanceErc20(address);

      if (allowed > 0) {
        this.state = ApeState.approveFinished;
        this.isApproved = true;
        this.orderStatus = ApeOrderStatus.approvedSuccess;
        return;
      }

      if (this.currApproveRerty >= this.maxApproveRerty) {
        this.state = ApeState.retryApproveLimitAndStopped;
        this.StopApe();
        return;
      }

      const data = await this.swapWallet.ApproveErc20(address, this.swapWallet.chainData.router, approveInfinity);

      const singedTx = await this.swapWallet.CreateSignedTx(data, {
        to: address,
      });

      const receipt = await this.swapWallet.SendSignedTx(singedTx);

      if (receipt) {
        this.state = ApeState.approveFinished;
        this.isApproved = true;
        this.orderStatus = ApeOrderStatus.approvedSuccess;
      } else {
        throw new Error('Transaction failed!');
      }
    } catch (error) {
      Logger.log(error);

      this.state = ApeState.approveFailed;

      this.currApproveRerty += 1;

      await new Promise((resolve) => setTimeout(resolve, this.retryTimeout));

      this.Events.push({
        type: 'apeApprove',
        address,
      });
      return;
    }
  }

  private async HandleApeSell(address: string, tokenBalance: string, minOut: string): Promise<any> {
    try {
      if (!this.isApproved) {
        this.Events.push({
          type: 'apeExitCheck',
          address,
        });
        return;
      }

      if (this.currSellRetry >= this.maxSellRetry) {
        this.state = ApeState.retrySellLimitAndStopped;
        this.StopApe();
        return;
      }

      this.state = ApeState.startedSell;
      this.orderStatus = ApeOrderStatus.sellStart;
      this.isSelling = true;

      const data = await this.swapWallet.SwapExactTokensForETH(
        address,
        tokenBalance,
        this.swapWallet.walletAddress,
        minOut,
      );

      const singedTx = await this.swapWallet.CreateSignedTx(data, {
        to: this.swapWallet.chainData.router,
      });

      const receipt = await this.swapWallet.SendSignedTx(singedTx);

      if (receipt) {
        this.state = ApeState.finisheSell;
        this.orderStatus = ApeOrderStatus.sellSuccess;
        this.StopApe();
        this.orderStatus = ApeOrderStatus.finished;

        SQL.InsertData<ApeHistoryDB>(
          {
            chain: this.swapWallet.chainData.id,
            data: JSON.stringify({
              wallet: this.swapWallet.walletAddress,
              contract: this.contractAddress,
              buyAmount: this.apeAmount,
              coinBalance: this.Balance[this.contractAddress],
              expectedProfit: this.currProfit,
              targetProfit: this.minProfit,
              time: Date.now(),
            }),
          },
          'apeHistory',
        );
      } else {
        throw new Error('Transaction failed!');
      }
    } catch (error) {
      Logger.log(error);

      this.state = ApeState.retrySellFailAndRetry;

      this.currSellRetry += 1;

      await new Promise((resolve) => setTimeout(resolve, this.retryTimeout));

      this.Events.push({
        type: 'apeExitCheck',
        address,
      });
      return;
    }
  }

  private async UpdateERC20(address: string) {
    try {
      const basicData = await this.swapWallet.GetERC20Data(address);

      this.erc20Data = basicData;
    } catch (error) { }
  }
}
