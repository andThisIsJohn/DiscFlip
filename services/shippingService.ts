
import { config } from './config';
import { PackagePreset } from '../types';

class ShippingService {
    private static instance: ShippingService;

    public static getInstance(): ShippingService {
        if (!ShippingService.instance) ShippingService.instance = new ShippingService();
        return ShippingService.instance;
    }

    public async createLabel(params: {
        auctionId: string,
        carrier: 'USPS' | 'UPS',
        preset: PackagePreset,
        weightOz: number
    }): Promise<{ tracking: string, labelUrl: string }> {
        if (config.isMockEnabled) {
            console.log("Mock: Creating Label for", params.auctionId);
            return { 
                tracking: `MOCK-${Math.floor(Math.random() * 100000)}`, 
                labelUrl: 'https://www.easypost.com/mock-label.pdf' 
            };
        }

        const response = await fetch(`${config.apiBaseUrl}/api/shipping/create-label`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });

        if (!response.ok) throw new Error("Failed to generate label from carrier");
        return await response.json();
    }
}

export const shipping = ShippingService.getInstance();
