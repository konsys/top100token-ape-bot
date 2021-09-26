    import { EventEmitter } from 'eventemitter3';
import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';

export class TelegramScrapper extends EventEmitter {
  private ready = true;

  private apiId: number;
  private apiHash: string;
  private stringSession: StringSession;
  private channelName: string;

  private lastSignal = '';
  private listener: NodeJS.Timer;
  private  client: TelegramClient;

  constructor(apiId: string, apiHash: string, session: string, channelName: string) {
    super();
    this.apiId = Number(apiId);
    this.apiHash = apiHash;
    this.stringSession = new StringSession(session);
    this.channelName = channelName;

    this.client = new TelegramClient(this.stringSession, this.apiId, this.apiHash, {
        connectionRetries: 5,
      });

    // Every 2 Minute check
    this.listener = setInterval(async () => {
      if (this.ready) {
        await this.GetPoocoinSignal();
      }
    }, 60000);
  }

  public async GetPoocoinSignal(): Promise<void> {
    this.ready = false;

    try {
      if(!this.client.connected){
        await this.client.connect();
      }
      
      const channelResult = await this.client.invoke(
        new Api.channels.GetFullChannel({
          channel: this.channelName,
        }),
      );

      const lastMessage = (channelResult.fullChat as any).readInboxMaxId;
      const unreadCount = (channelResult.fullChat as any).unreadCount;

      const getLastMessage = await this.client.invoke(
        new Api.channels.GetMessages({
          channel: this.channelName,
          id: [lastMessage + unreadCount] as any,
        }),
      );

      const content = (getLastMessage as any)?.messages[0]?.message;

      

      if (content && content.includes('poocoin.app')) {
        const almostAddres = content.split('poocoin.app/tokens/');

        // for e.g. 0xb6a6dcccba92905c34801e1458b0606e07bb3dd4
        const address = almostAddres[1].substring(0, 42);

        if (this.lastSignal !== address) {
          this.lastSignal = address;
          this.emit('newSignal', address);
        }
      }
    } catch (error) {
      console.log('Telegram error, ', error);
    } finally {
      this.ready = true;
    }
  }
}