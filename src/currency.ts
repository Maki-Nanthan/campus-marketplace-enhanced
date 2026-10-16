export type Currency = "USD" | "LKR";

export function formatPrice(
  usdAmount: number,
  currency: Currency,
  usdToLkrRate?: number,
): string {
  let amount = usdAmount;
  if (currency === "LKR") {
    if (
      typeof usdToLkrRate !== "number" ||
      !Number.isFinite(usdToLkrRate) ||
      usdToLkrRate <= 0
    ) {
      return "LKR —";
    }
    amount *= usdToLkrRate;
  }

  return new Intl.NumberFormat(currency === "LKR" ? "en-LK" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "LKR" ? 0 : 2,
  }).format(amount);
}

export function convertToUsd(
  amount: number,
  currency: Currency,
  usdToLkrRate?: number,
): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter an amount greater than zero.");
  }
  if (currency === "USD") return amount;
  if (
    typeof usdToLkrRate !== "number" ||
    !Number.isFinite(usdToLkrRate) ||
    usdToLkrRate <= 0
  ) {
    throw new Error("The LKR exchange rate is unavailable. Try again shortly.");
  }
  return amount / usdToLkrRate;
}

export async function fetchUsdToLkrRate(): Promise<number> {
  const response = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!response.ok) {
    throw new Error(`Exchange-rate service returned HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();
  if (
    !payload ||
    typeof payload !== "object" ||
    !("rates" in payload) ||
    !("result" in payload) ||
    (payload as { result?: unknown }).result !== "success"
  ) {
    throw new Error("Exchange-rate service returned an invalid response.");
  }

  const rates = (payload as { rates?: { LKR?: unknown } }).rates;
  const rate = Number(rates?.LKR);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("Exchange-rate service did not return a valid USD/LKR rate.");
  }
  return rate;
}
