import { config } from './config';
import { supabase } from './supabaseClient';
import { PackagePreset } from '../types';

class ShippingService {
  private static instance: ShippingService;

  public static getInstance(): ShippingService {
    if (!ShippingService.instance) ShippingService.instance = new ShippingService();
    return ShippingService.instance;
  }

  public async createLabel(params: {
    auctionId: string;
    carrier: 'USPS' | 'UPS';
    preset: PackagePreset;
    weightOz: number;
  }): Promise<{ tracking: string; labelUrl: string }> {
    if (config.isMockEnabled) {
      // Demo mode: fake a label and move the order forward so the flow can be tested
      const tracking = `MOCK${Math.floor(Math.random() * 1e9)}`;
      const auctions = JSON.parse(localStorage.getItem('discflip_db_auctions') || '[]');
      localStorage.setItem(
        'discflip_db_auctions',
        JSON.stringify(
          auctions.map((a: any) =>
            a.id === params.auctionId
              ? {
                  ...a,
                  status: 'label_created',
                  trackingNumber: tracking,
                  labelCarrier: params.carrier,
                }
              : a
          )
        )
      );
      const label = `<h1>DEMO SHIPPING LABEL</h1><p>${params.carrier} • ${tracking}</p><p>Not valid for shipping.</p>`;
      return { tracking, labelUrl: `data:text/html,${encodeURIComponent(label)}` };
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const response = await fetch(`${config.apiBaseUrl}/api/shipping/create-label`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify(params),
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.error || 'Failed to generate label from carrier');
    return json;
  }
}

export const shipping = ShippingService.getInstance();
