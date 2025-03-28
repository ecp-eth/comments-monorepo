import Decimal from "decimal.js";

type GasEstimationTableProps = {
  operations: {
    name: string;
    gasUnits: string;
  }[];
  gweiPerGases: string[];
  usdPerEth: string;
};

export function GasEstimationTable({
  operations,
  gweiPerGases,
  usdPerEth,
}: GasEstimationTableProps) {
  return (
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
                  $
                  {gweiPerGas
                    .mul(operation.gasUnits)
                    .div(1000000000)
                    .mul(usdPerEth)
                    .toString()}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
