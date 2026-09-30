import { useState } from "react";
import { MovementsView } from "../../components/consignment-views";
import {
  useMyConsignmentMovements,
  useMyConsignmentStock,
  type ConsignmentMovementFilters,
} from "../../hooks/useConsignment";

export function ConsignadoHistoryPage() {
  const [filters, setFilters] = useState<ConsignmentMovementFilters>({});
  const { data: movements = [], isLoading } = useMyConsignmentMovements(filters);
  const { data: stock = [] } = useMyConsignmentStock();

  return (
    <div>
      <div className="admin-header">
        <h1>Histórico</h1>
      </div>
      <MovementsView
        movements={movements}
        isLoading={isLoading}
        filters={filters}
        onFiltersChange={setFilters}
        productOptions={stock.map((s) => ({ productId: s.productId, name: s.productName }))}
      />
    </div>
  );
}
