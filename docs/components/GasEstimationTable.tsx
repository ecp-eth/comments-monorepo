import { Skeleton } from "@/components/ui/skeleton";
import Decimal from "decimal.js";
import { useEffect, useMemo, useState } from "react";

type GasEstimationTableProps = {
  operations: {
    name: string;
    gasUnits: string;
  }[];
  gweiPerGases: string[];
};

export function GasEstimationTable({
  operations,
  gweiPerGases,
}: GasEstimationTableProps) {
  const [usdPerEth, setUsdPerEth] = useState(undefined);
  const formatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumSignificantDigits: 2,
      }),
    [],
  );
  useEffect(() => {
    getETHPrice().then(setUsdPerEth);
  }, []);

  return (
    <>
      <table className="vocs_Table">
        <thead>
          <tr className="vocs_TableRow">
            <th className="vocs_TableHeader">Operation</th>
            <th className="vocs_TableHeader">Gas Units</th>
            {gweiPerGases.map((price, index) => (
              <th key={index} className="vocs_TableHeader">
                at {price} gwei
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {operations.map((operation) => (
            <tr key={operation.name} className="vocs_TableRow">
              <td className="vocs_TableCell">{operation.name}</td>
              <td className="vocs_TableCell">{operation.gasUnits}</td>
              {gweiPerGases.map((gweiPerGasString, index) => {
                const gweiPerGas = new Decimal(gweiPerGasString);
                return (
                  <td key={index} className="vocs_TableCell">
                    {usdPerEth == null ? (
                      <Skeleton className="w-full h-[20px] rounded-full" />
                    ) : (
                      `${formatter.format(
                        gweiPerGas
                          .mul(operation.gasUnits)
                          .div(1000000000)
                          .mul(usdPerEth)
                          .toNumber(),
                      )}`
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs italic">
        All prices are shown in U.S. dollars, based on real-time data from
        CoinGecko.com.
      </p>
    </>
  );
}

async function getETHPrice() {
  const response = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.ethereum.usd;
}
