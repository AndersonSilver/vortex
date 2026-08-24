import { In, type EntityManager } from "typeorm";
import type {
  MeasurementUnit,
  PurchaseOrderDTO,
  PurchaseOrderInput,
  PurchaseOrderItemDTO,
} from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import {
  Asset,
  ExpenseCategory,
  Filament,
  PurchaseOrder,
  PurchaseOrderItem,
  Supply,
} from "../../entities";
import { HttpError } from "../../utils/async-handler";
import { applyFilamentMovement, updateFilamentCostFromPurchase } from "../filaments/filament-stock.service";
import { applySupplyMovement } from "../supplies/supply-stock.service";
import { recordExpense } from "../expenses/expense-ledger.service";

const purchaseOrderRepo = () => AppDataSource.getRepository(PurchaseOrder);

function itemLabel(item: PurchaseOrderItem): string {
  if (item.filament) {
    return `${item.filament.brand} · ${item.filament.color}`;
  }
  if (item.supply) {
    return item.supply.name;
  }
  return item.description ?? item.category?.name ?? "Item";
}

function toItemDTO(item: PurchaseOrderItem): PurchaseOrderItemDTO {
  return {
    id: item.id,
    categoryId: item.categoryId,
    categoryName: item.category?.name ?? "",
    categoryKind: item.category?.kind ?? "direct_variable",
    categoryTarget: item.category?.target ?? "none",
    label: itemLabel(item),
    description: item.description ?? null,
    filamentId: item.filamentId ?? null,
    supplyId: item.supplyId ?? null,
    assetId: item.assetId ?? null,
    quantity: Number(item.quantity),
    unit: item.unit,
    unitCost: Number(item.unitCost),
    totalCost: Number(item.totalCost),
    allocatedCost: item.allocatedCost !== null && item.allocatedCost !== undefined ? Number(item.allocatedCost) : null,
  };
}

export function toPurchaseOrderDTO(po: PurchaseOrder): PurchaseOrderDTO {
  const items = (po.items ?? []).map(toItemDTO);
  const itemsCost = items.reduce((sum, item) => sum + item.totalCost, 0);
  const totalCost = itemsCost + Number(po.freightCost) + Number(po.otherCharges) - Number(po.discount);
  return {
    id: po.id,
    supplierId: po.supplierId,
    supplierName: po.supplier?.name ?? "",
    status: po.status,
    documentNumber: po.documentNumber ?? null,
    purchasedAt: po.purchasedAt,
    freightCost: Number(po.freightCost),
    otherCharges: Number(po.otherCharges),
    discount: Number(po.discount),
    paymentMethod: po.paymentMethod ?? null,
    installments: po.installments,
    notes: po.notes ?? null,
    receivedAt: po.receivedAt ? po.receivedAt.toISOString() : null,
    items,
    itemsCost,
    totalCost,
    createdAt: po.createdAt.toISOString(),
  };
}

/** Converte a quantidade do item para gramas, para movimentar filamento. */
function toGrams(quantity: number, unit: MeasurementUnit): number {
  if (unit === "kg") {
    return quantity * 1000;
  }
  return quantity;
}

/**
 * Rateia frete, encargos e desconto sobre os itens, proporcional ao valor de
 * cada um. Sem isso o custo do insumo em estoque fica menor do que o real.
 */
function allocateCosts(items: PurchaseOrderItem[], extras: number): Map<string, number> {
  const itemsCost = items.reduce((sum, item) => sum + Number(item.totalCost), 0);
  const allocation = new Map<string, number>();
  let distributed = 0;
  items.forEach((item, index) => {
    const share =
      itemsCost > 0 ? Number(item.totalCost) / itemsCost : items.length > 0 ? 1 / items.length : 0;
    const isLast = index === items.length - 1;
    // O último item absorve a sobra dos arredondamentos, para fechar com o total.
    const extraShare = isLast ? extras - distributed : Number((extras * share).toFixed(2));
    distributed += extraShare;
    allocation.set(item.id, Number((Number(item.totalCost) + extraShare).toFixed(2)));
  });
  return allocation;
}

export async function createPurchaseOrder(body: PurchaseOrderInput): Promise<PurchaseOrder> {
  return AppDataSource.transaction(async (manager) => {
    const categoryIds = Array.from(new Set(body.items.map((item) => item.categoryId)));
    const categories = await manager.getRepository(ExpenseCategory).find({ where: { id: In(categoryIds) } });
    if (categories.length !== categoryIds.length) {
      throw new HttpError(404, "Categoria de gasto não encontrada.");
    }
    const categoryById = new Map(categories.map((category) => [category.id, category]));

    const items: Partial<PurchaseOrderItem>[] = [];
    for (const item of body.items) {
      const category = categoryById.get(item.categoryId)!;
      let supplyId = item.supplyId ?? null;

      if (category.target === "filament" && !item.filamentId) {
        throw new HttpError(400, `Selecione o filamento do item "${category.name}".`);
      }
      // Insumo novo é criado já na compra, com estoque zero até o recebimento.
      if (category.target === "supply" && !supplyId) {
        if (!item.newSupplyName) {
          throw new HttpError(400, `Selecione ou nomeie o insumo do item "${category.name}".`);
        }
        const supplyRepo = manager.getRepository(Supply);
        const supply = await supplyRepo.save(
          supplyRepo.create({
            name: item.newSupplyName,
            categoryId: category.id,
            unit: item.unit,
            quantityOnHand: 0,
            avgUnitCost: 0,
            supplierId: body.supplierId,
          }),
        );
        supplyId = supply.id;
      }
      if (category.target === "asset" && !item.asset) {
        throw new HttpError(400, `Informe a vida útil do ativo do item "${category.name}".`);
      }

      items.push({
        categoryId: item.categoryId,
        description: item.description ?? null,
        filamentId: item.filamentId ?? null,
        supplyId,
        quantity: item.quantity,
        unit: item.unit,
        unitCost: Number((item.totalCost / item.quantity).toFixed(4)),
        totalCost: item.totalCost,
        assetUsefulLifeMonths: item.asset?.usefulLifeMonths ?? null,
        assetSalvageValue: item.asset?.salvageValue ?? null,
        assetExpectedHoursPerMonth: item.asset?.expectedHoursPerMonth ?? null,
        assetPrinterId: item.asset?.printerId ?? null,
      });
    }

    const repo = manager.getRepository(PurchaseOrder);
    const saved = await repo.save(
      repo.create({
        supplierId: body.supplierId,
        documentNumber: body.documentNumber ?? null,
        purchasedAt: body.purchasedAt ?? new Date().toISOString().slice(0, 10),
        freightCost: body.freightCost,
        otherCharges: body.otherCharges,
        discount: body.discount,
        paymentMethod: body.paymentMethod ?? null,
        installments: body.installments,
        notes: body.notes ?? null,
        items: items as PurchaseOrderItem[],
      }),
    );
    return manager.getRepository(PurchaseOrder).findOneOrFail({
      where: { id: saved.id },
      relations: { supplier: true },
    });
  });
}

/**
 * Recebe a compra em uma transação: movimenta estoque de filamento e insumo,
 * cria os ativos e lança cada item no livro de despesas com o custo rateado.
 */
export async function receivePurchaseOrder(id: string): Promise<PurchaseOrder> {
  return AppDataSource.transaction(async (manager: EntityManager) => {
    const po = await manager.getRepository(PurchaseOrder).findOne({
      where: { id },
      relations: { supplier: true },
    });
    if (!po) {
      throw new HttpError(404, "Compra não encontrada.");
    }
    if (po.status !== "pending") {
      throw new HttpError(400, "Só é possível receber compras pendentes.");
    }

    const extras = Number(po.freightCost) + Number(po.otherCharges) - Number(po.discount);
    const allocation = allocateCosts(po.items, extras);
    const itemRepo = manager.getRepository(PurchaseOrderItem);

    for (const item of po.items) {
      const allocatedCost = allocation.get(item.id) ?? Number(item.totalCost);
      const target = item.category?.target ?? "none";
      const label = itemLabel(item);

      if (target === "filament" && item.filamentId) {
        const grams = toGrams(Number(item.quantity), item.unit);
        const filament = await manager.getRepository(Filament).findOneBy({ id: item.filamentId });
        const previousGrams = filament ? filament.remainingWeightGrams : 0;
        await applyFilamentMovement(
          item.filamentId,
          grams,
          "purchase",
          `Compra ${po.id.slice(0, 8)}`,
          manager,
        );
        await updateFilamentCostFromPurchase(item.filamentId, grams, allocatedCost, previousGrams, manager);
      }

      if (target === "supply" && item.supplyId) {
        const quantity = Number(item.quantity);
        await applySupplyMovement(
          item.supplyId,
          quantity,
          "purchase",
          quantity > 0 ? allocatedCost / quantity : 0,
          `Compra ${po.id.slice(0, 8)}`,
          manager,
        );
      }

      if (target === "asset" && !item.assetId) {
        const assetRepo = manager.getRepository(Asset);
        const asset = await assetRepo.save(
          assetRepo.create({
            name: item.description ?? label,
            categoryId: item.categoryId,
            printerId: item.assetPrinterId ?? null,
            status: "active",
            acquiredAt: po.purchasedAt,
            acquisitionCost: allocatedCost,
            salvageValue: item.assetSalvageValue ?? 0,
            usefulLifeMonths: item.assetUsefulLifeMonths ?? 60,
            expectedHoursPerMonth: item.assetExpectedHoursPerMonth ?? 0,
          }),
        );
        item.assetId = asset.id;
      }

      item.allocatedCost = allocatedCost;
      await itemRepo.save(item);

      await recordExpense(
        {
          categoryId: item.categoryId,
          description: label,
          amount: allocatedCost,
          incurredAt: po.purchasedAt,
          source: "purchase_order",
          supplierId: po.supplierId,
          purchaseOrderId: po.id,
          assetId: item.assetId ?? null,
          paymentMethod: po.paymentMethod ?? null,
        },
        manager,
      );
    }

    po.status = "received";
    po.receivedAt = new Date();
    await manager.getRepository(PurchaseOrder).save(po);
    return po;
  });
}

export async function findPurchaseOrder(id: string): Promise<PurchaseOrder> {
  const po = await purchaseOrderRepo().findOne({ where: { id }, relations: { supplier: true } });
  if (!po) {
    throw new HttpError(404, "Compra não encontrada.");
  }
  return po;
}
