// src/api/evmTokenApi.ts
import { Network } from "@/types/web3";

// API Response with error handling
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  statusCode: number;
}

// Raw Lambda response structure
export interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string; // Contains a JSON string
}

export interface BaseRequest {
  network: Network;
}

// Balances Endpoint
export interface BalancesRequest extends BaseRequest {
  userAddress: string;
  contractAddresses?: string; // Comma-separated list
}

export interface TokenBalance {
  contractAddress: string;
  tokenBalance: string; // Hex string
}

// Allowance Endpoint
export interface AllowanceRequest extends BaseRequest {
  userAddress: string;
  contractAddress: string;
  spenderAddress: string;
}

export interface AllowanceResponse {
  allowance: string; // Hex string
}

// Metadata Endpoint
export interface MetadataRequest extends BaseRequest {
  contractAddress: string;
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  logo?: string;
  totalSupply?: string;
}

// Prices Endpoint
export interface TokenAddressInfo {
  network: Network;
  address: string;
}

export interface PricesRequest {
  addresses: TokenAddressInfo[];
}

export interface TokenPrice {
  currency: string;
  value: string;
  lastUpdatedAt: string;
}

export interface TokenPriceResult {
  network: Network;
  address: string;
  prices: TokenPrice[];
  error: string | null;
}

export interface PricesResponse {
  data: TokenPriceResult[];
}

export class EvmTokenAPI {
  private baseUrl: string;

  constructor(
    baseUrl: string = "https://iwz0cfumv5.execute-api.ap-southeast-2.amazonaws.com/rest",
  ) {
    this.baseUrl = baseUrl;
  }

  /**
   * Simple test endpoint - uses pure GET without body
   */
  public async test(): Promise<ApiResponse<{ message: string }>> {
    return this.getRequest<{ message: string }>("test");
  }

  /**
   * Fetch token balances for a given address
   */
  public async getBalances(
    request: BalancesRequest,
  ): Promise<ApiResponse<TokenBalance[]>> {
    try {
      // Make a direct POST request to the Lambda API
      const response = await this.postRequest<TokenBalance[]>(
        "balances",
        request,
      );
      return response;
    } catch (error) {
      console.error("Balance API request error:", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : String(error),
        statusCode: 500,
      };
    }
  }

  /**
   * Check token allowance for a given user/spender pair
   */
  public async getAllowance(
    request: AllowanceRequest,
  ): Promise<ApiResponse<AllowanceResponse>> {
    try {
      // Make a direct POST request to the Lambda API
      const response = await this.postRequest<AllowanceResponse>(
        "allowance",
        request,
      );
      return response;
    } catch (error) {
      console.error("Allowance API request error:", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : String(error),
        statusCode: 500,
      };
    }
  }

  /**
   * Get metadata for a token contract
   */
  public async getTokenMetadata(
    request: MetadataRequest,
  ): Promise<ApiResponse<TokenMetadata>> {
    try {
      // Make a direct POST request to the Lambda API
      const response = await this.postRequest<TokenMetadata>(
        "metadata",
        request,
      );
      return response;
    } catch (error) {
      console.error("Metadata API request error:", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : String(error),
        statusCode: 500,
      };
    }
  }

  public async testBalancesDirectFetch(
    request: BalancesRequest,
  ): Promise<ApiResponse<TokenBalance[]>> {
    try {
      const url = `${this.baseUrl}/balances`;

      console.log(`Making explicit POST request to ${url} with body:`, request);

      // Create a new request object with explicit POST method
      const options: RequestInit = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(request),
      };

      console.log("Request options:", JSON.stringify(options));

      const response = await fetch(url, options);
      const statusCode = response.status;

      console.log(`Response status: ${statusCode}`);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP error ${statusCode}` };
        }

        console.error(`Error response:`, errorData);

        return {
          data: null,
          error:
            errorData.error || errorData.message || `HTTP error ${statusCode}`,
          statusCode,
        };
      }

      // Parse the JSON response
      const responseText = await response.text();
      let data: TokenBalance[];

      try {
        data = JSON.parse(responseText) as TokenBalance[];
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        return {
          data: null,
          error: `Failed to parse response: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
          statusCode,
        };
      }

      return { data, error: null, statusCode };
    } catch (error) {
      console.error("Balance API direct fetch error:", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : String(error),
        statusCode: 500,
      };
    }
  }

  /**
   * Get token prices for a list of tokens
   */
  public async getTokenPrices(
    request: PricesRequest,
  ): Promise<ApiResponse<PricesResponse>> {
    try {
      // Make a direct POST request to the Lambda API
      const response = await this.postRequest<PricesResponse>(
        "prices",
        request,
      );
      return response;
    } catch (error) {
      console.error("Prices API request error:", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : String(error),
        statusCode: 500,
      };
    }
  }

  /**
   * Make a simple GET request to the Lambda API
   * Used for endpoints that don't need parameters
   */
  private async getRequest<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}/${endpoint}`;

      console.log(`Making GET request to ${url}`);

      const options: RequestInit = {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      };

      const response = await fetch(url, options);
      const statusCode = response.status;

      console.log(`Response status: ${statusCode}`);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP error ${statusCode}` };
        }

        console.error(`Error response:`, errorData);

        return {
          data: null,
          error:
            errorData.error || errorData.message || `HTTP error ${statusCode}`,
          statusCode,
        };
      }

      const data: T = await response.json();
      return { data, error: null, statusCode };
    } catch (error) {
      console.error("API request error:", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        statusCode: 500,
      };
    }
  }

  /**
   * Make a POST request directly to the Lambda API
   * Used for endpoints that need parameters
   */
  private async postRequest<T>(
    endpoint: string,
    body?: BaseRequest | PricesRequest,
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}/${endpoint}`;

      console.log(`Making POST request to ${url}`);

      const options: RequestInit = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      };

      const response = await fetch(url, options);
      const statusCode = response.status;

      console.log(`Response status: ${statusCode}`);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP error ${statusCode}` };
        }

        console.error(`Error response:`, errorData);

        return {
          data: null,
          error:
            errorData.error || errorData.message || `HTTP error ${statusCode}`,
          statusCode,
        };
      }

      // Parse the JSON response
      const responseText = await response.text();
      let data: T;

      try {
        data = JSON.parse(responseText) as T;
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        return {
          data: null,
          error: `Failed to parse response: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
          statusCode,
        };
      }

      return { data, error: null, statusCode };
    } catch (error) {
      console.error("API request error:", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        statusCode: 500,
      };
    }
  }
}

export const evmTokenApi = new EvmTokenAPI();
