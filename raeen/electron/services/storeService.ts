import axios from 'axios';
import { getDb } from '../database';

export interface Deal {
    storeID: string;
    dealID: string;
    price: string;
    retailPrice: string;
    savings: string;
    title: string;
    thumb: string;
    metacriticScore?: string;
    steamRatingText?: string;
    steamRatingPercent?: string;
    steamAppID?: string;
    releaseDate?: number;
    isOnSale: string;
    dealRating: string; // 0 to 10
}

export class StoreService {
    private readonly BASE_URL = 'https://www.cheapshark.com/api/1.0';

    async getDeals(params: { 
        storeID?: string, 
        pageNumber?: number, 
        pageSize?: number, 
        sortBy?: 'Savings' | 'Price' | 'Title' | 'Metacritic' | 'Reviews' | 'Release' | 'Store',
        desc?: number,
        lowerPrice?: number,
        upperPrice?: number,
        title?: string
    } = {}): Promise<Deal[]> {
        try {
            const response = await axios.get(`${this.BASE_URL}/deals`, { params });
            return response.data;
        } catch (error) {
            console.error('Failed to fetch deals from CheapShark:', error);
            return [];
        }
    }

    async getStores(): Promise<any[]> {
        try {
            // Cache stores in memory or DB if needed, for now simple fetch
            const response = await axios.get(`${this.BASE_URL}/stores`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch stores:', error);
            return [];
        }
    }

    async getGameDetails(gameId: string): Promise<any> {
        try {
            const response = await axios.get(`${this.BASE_URL}/games`, { params: { id: gameId } });
            return response.data;
        } catch (error) {
            console.error('Failed to fetch game details:', error);
            return null;
        }
    }
}
