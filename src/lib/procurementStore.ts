import { appendRetailBatchInventory } from './accountScopedStore';
import { extendedVanuatuProducts } from './mockDataFull';
import { StretProduct } from './productLogic';
import { getCachedSharedState, loadSharedState, saveSharedState } from './sharedStateStore';

const PROCUREMENT_KEY = 'procurement_orders';
const PRODUCT_STATE_KEY = 'warehouse_products';

export type ProcurementDeliveryMode = 'SELF_PICKUP' | 'SHIPMENT';

export type ProcurementStatus =
  | 'SUBMITTED'
  | 'ALLOCATED'
  | 'WAREHOUSE_OUT'
  | 'READY_FOR_PICKUP'
  | 'DRIVER_ASSIGNED'
  | 'IN_TRANSIT'
  | 'AT_SHIPPING_COMPANY'
  | 'RECEIVED'
  | 'CANCELLED'
  | 'REJECTED';

export interface ProcurementOrderItem {
  productId: string;
  title: string;
  barcode: string;
  quantity: number;
  receivedQuantity?: number;
  batchNo?: string;
  expiryDate?: string;
  qualityFlags?: string[];
}

export interface ProcurementOrder {
  id: string;
  retailerAccountId: string;
  retailerName: string;
  wholesalerAccountId: string;
  wholesalerName: string;
  driverAccountId?: string;
  driverName?: string;
  deliveryMode: ProcurementDeliveryMode;
  shippingCompanyName?: string;
  status: ProcurementStatus;
  items: ProcurementOrderItem[];
  totalQuantity: number;
  note?: string;
  receiptPhotoDataUrl?: string;
  pickupSignatureName?: string;
  pickupSignedAt?: string;
  pickupSignatureDataUrl?: string;
  shippingHandoffSignatureName?: string;
  shippingHandoffSignedAt?: string;
  shippingHandoffCompanyName?: string;
  shippingHandoffSignatureDataUrl?: string;
  shippingHandoffPhotoDataUrl?: string;
  driverIssuePhotoDataUrl?: string;
  driverIssueActive?: boolean;
  driverIssueResolvedAt?: string;
  driverCurrentLocation?: {
    lat: number;
    lng: number;
    label?: string;
  };
  driverLastPingAt?: string;
  createdAt: string;
  updatedAt: string;
  timeline: Array<{ at: string; label: string; by: string }>;
  driverIssueLogs?: Array<{ at: string; by: string; type: string; note: string }>;
}

const DEFAULT_RETAIL_TO_WHOLESALE: Record<string, { accountId: string; name: string }> = {
  'R-ESS': { accountId: 'W-TIANYI', name: 'TIANYI 批发店' },
  'R-001': { accountId: 'W-TIANYI', name: 'TIANYI 批发店' },
};

const DEFAULT_SHIPPING_COMPANY = '瓦努阿图船运公司';

const nowStamp = () => new Date().toLocaleString();

const cloneProductsForAccount = (accountId: string) => {
  const cached = getCachedSharedState(accountId, PRODUCT_STATE_KEY, [] as StretProduct[]);
  if (Array.isArray(cached) && cached.length > 0) return cached;
  return extendedVanuatuProducts.map((item) => ({ ...item }));
};

export const getWarehouseProducts = async (accountId: string): Promise<StretProduct[]> => {
  if (!accountId) return extendedVanuatuProducts.map((item) => ({ ...item }));
  const local = cloneProductsForAccount(accountId);
  const synced = await loadSharedState(accountId, PRODUCT_STATE_KEY, local);
  if (!Array.isArray(synced) || synced.length === 0) return local;
  return synced as StretProduct[];
};

export const saveWarehouseProducts = async (accountId: string, products: StretProduct[]) => {
  if (!accountId) return;
  await saveSharedState(accountId, PRODUCT_STATE_KEY, products);
};

export const getDefaultWholesalePartner = (retailerAccountId: string) =>
  DEFAULT_RETAIL_TO_WHOLESALE[retailerAccountId] || {
    accountId: 'W-TIANYI',
    name: 'TIANYI 批发店',
  };

export const getDeliveryModeLabel = (mode: ProcurementDeliveryMode) =>
  mode === 'SELF_PICKUP' ? '零售商自提' : '司机送船运公司';

export const getProcurementStatusLabel = (status: ProcurementStatus) => {
  switch (status) {
    case 'SUBMITTED':
      return '已提交给批发商';
    case 'ALLOCATED':
      return '批发商已配货';
    case 'WAREHOUSE_OUT':
      return '仓库已出库';
    case 'READY_FOR_PICKUP':
      return '待零售商提货';
    case 'DRIVER_ASSIGNED':
      return '已交司机';
    case 'IN_TRANSIT':
      return '配送中';
    case 'AT_SHIPPING_COMPANY':
      return '已送达船运公司';
    case 'RECEIVED':
      return '已签收入库';
    case 'CANCELLED':
      return '已取消';
    case 'REJECTED':
      return '已拒收待重发';
    default:
      return status;
  }
};

export const getProcurementOrders = async () => {
  const cached = getCachedSharedState('GLOBAL', PROCUREMENT_KEY, [] as ProcurementOrder[]);
  const synced = await loadSharedState('GLOBAL', PROCUREMENT_KEY, cached);
  return Array.isArray(synced) ? (synced as ProcurementOrder[]) : [];
};

const saveOrders = async (orders: ProcurementOrder[]) => {
  await saveSharedState('GLOBAL', PROCUREMENT_KEY, orders);
};

export const createProcurementOrder = async (input: {
  retailerAccountId: string;
  retailerName: string;
  wholesalerAccountId?: string;
  wholesalerName?: string;
  items: ProcurementOrderItem[];
  note?: string;
  deliveryMode?: ProcurementDeliveryMode;
  shippingCompanyName?: string;
}) => {
  const orders = await getProcurementOrders();
  const partner =
    input.wholesalerAccountId && input.wholesalerName
      ? { accountId: input.wholesalerAccountId, name: input.wholesalerName }
      : getDefaultWholesalePartner(input.retailerAccountId);
  const stamp = nowStamp();
  const deliveryMode = input.deliveryMode || 'SHIPMENT';
  const order: ProcurementOrder = {
    id: `PO-${Date.now().toString().slice(-8)}`,
    retailerAccountId: input.retailerAccountId,
    retailerName: input.retailerName,
    wholesalerAccountId: partner.accountId,
    wholesalerName: partner.name,
    deliveryMode,
    shippingCompanyName:
      deliveryMode === 'SHIPMENT' ? input.shippingCompanyName || DEFAULT_SHIPPING_COMPANY : undefined,
    status: 'SUBMITTED',
    items: input.items,
    totalQuantity: input.items.reduce((sum, item) => sum + item.quantity, 0),
    note: input.note?.trim() || undefined,
    createdAt: stamp,
    updatedAt: stamp,
    timeline: [
      {
        at: stamp,
        label:
          deliveryMode === 'SELF_PICKUP'
            ? '零售商已提交自提进货单'
            : '零售商已提交船运进货单',
        by: input.retailerName,
      },
    ],
  };
  await saveOrders([order, ...orders]);
  return order;
};

const writeProductState = async (accountId: string, products: StretProduct[]) => {
  await saveSharedState(accountId, PRODUCT_STATE_KEY, products);
};

const patchStock = async (
  accountId: string,
  items: ProcurementOrderItem[],
  mode: 'increase' | 'decrease'
) => {
  const products = cloneProductsForAccount(accountId);
  const next = products.map((product) => {
    const matched = items.find((item) => item.productId === product.id || item.barcode === product.barcode);
    if (!matched) return product;
    const delta = Number(matched.quantity || 0);
    return {
      ...product,
      stock:
        mode === 'increase'
          ? Number(product.stock || 0) + delta
          : Math.max(0, Number(product.stock || 0) - delta),
    };
  });
  await writeProductState(accountId, next);
};

const getInsufficientItems = (accountId: string, items: ProcurementOrderItem[]) => {
  const products = cloneProductsForAccount(accountId);
  return items
    .map((item) => {
      const matched = products.find(
        (product) => product.id === item.productId || product.barcode === item.barcode
      );
      const currentStock = Number(matched?.stock || 0);
      return currentStock < item.quantity ? `${item.title} 缺 ${item.quantity - currentStock} 箱` : null;
    })
    .filter(Boolean) as string[];
};

export const advanceProcurementOrder = async (
  orderId: string,
  action:
    | 'ALLOCATE'
    | 'WAREHOUSE_OUT'
    | 'ASSIGN_DRIVER'
    | 'START_TRANSIT'
    | 'MARK_AT_SHIPPING_COMPANY'
    | 'REPORT_ISSUE'
    | 'RESOLVE_ISSUE'
    | 'REDISPATCH'
    | 'CONFIRM_RECEIPT'
    | 'CANCEL'
    | 'REJECT_RECEIPT'
    | 'RESHIP',
  actor: {
    name: string;
    accountId: string;
    driverName?: string;
    shippingCompanyName?: string;
    receiptQuantities?: Array<{ productId: string; quantity: number }>;
    receiptMeta?: Array<{ productId: string; batchNo?: string; expiryDate?: string }>;
    receiptPhotoDataUrl?: string;
    qualityFlags?: Array<{ productId: string; flags: string[] }>;
    pickupSignatureName?: string;
    pickupSignatureDataUrl?: string;
    shippingHandoffSignatureName?: string;
    shippingHandoffSignatureDataUrl?: string;
    shippingHandoffPhotoDataUrl?: string;
    issueType?: string;
    issueNote?: string;
    issuePhotoDataUrl?: string;
  }
) => {
  const orders = await getProcurementOrders();
  const order = orders.find((item) => item.id === orderId);
  if (!order) return null;

  let nextStatus: ProcurementStatus = order.status;
  let timelineLabel = '';
  let patch: Partial<ProcurementOrder> = {};

  if (action === 'ALLOCATE' && order.status === 'SUBMITTED') {
    nextStatus = 'ALLOCATED';
    timelineLabel = '批发商已完成配货';
  }

  if (action === 'WAREHOUSE_OUT' && order.status === 'ALLOCATED') {
    const insufficient = getInsufficientItems(order.wholesalerAccountId, order.items);
    if (insufficient.length > 0) {
      throw new Error(`仓库库存不足：${insufficient.join('；')}`);
    }
    nextStatus = order.deliveryMode === 'SELF_PICKUP' ? 'READY_FOR_PICKUP' : 'WAREHOUSE_OUT';
    timelineLabel =
      order.deliveryMode === 'SELF_PICKUP' ? '仓库已出库，等待零售商自提' : '仓库已完成出库';
    await patchStock(order.wholesalerAccountId, order.items, 'decrease');
  }

  if (
    action === 'ASSIGN_DRIVER' &&
    (order.status === 'WAREHOUSE_OUT' || order.status === 'REJECTED') &&
    order.deliveryMode === 'SHIPMENT'
  ) {
    nextStatus = 'DRIVER_ASSIGNED';
    timelineLabel = order.status === 'REJECTED' ? '批发商已重新安排司机发货' : '货物已交司机配送';
    patch = {
      driverAccountId: actor.accountId,
      driverName: actor.driverName || actor.name,
      shippingCompanyName: actor.shippingCompanyName || order.shippingCompanyName || DEFAULT_SHIPPING_COMPANY,
    };
  }

  if (action === 'START_TRANSIT' && order.status === 'DRIVER_ASSIGNED') {
    nextStatus = 'IN_TRANSIT';
    timelineLabel = '司机已开始配送至船运公司';
  }

  if (action === 'MARK_AT_SHIPPING_COMPANY' && order.status === 'IN_TRANSIT') {
    nextStatus = 'AT_SHIPPING_COMPANY';
    timelineLabel = `司机已送达${order.shippingCompanyName || DEFAULT_SHIPPING_COMPANY}`;
    patch = {
      shippingHandoffSignatureName: actor.shippingHandoffSignatureName || actor.name,
      shippingHandoffSignedAt: nowStamp(),
      shippingHandoffCompanyName:
        actor.shippingCompanyName || order.shippingCompanyName || DEFAULT_SHIPPING_COMPANY,
      shippingHandoffSignatureDataUrl: actor.shippingHandoffSignatureDataUrl || order.shippingHandoffSignatureDataUrl,
      shippingHandoffPhotoDataUrl: actor.shippingHandoffPhotoDataUrl || order.shippingHandoffPhotoDataUrl,
    };

  }
  if (action === 'REPORT_ISSUE') {
    nextStatus = order.status;
    timelineLabel = `???${actor.issueType || '??'}`;
    patch = {
      note: actor.issueNote
        ? `${order.note ? `${order.note}\n` : ''}[??] ${actor.issueType || '??'}?${actor.issueNote}`
        : order.note,
      driverIssuePhotoDataUrl: actor.issuePhotoDataUrl || order.driverIssuePhotoDataUrl,
      driverIssueActive: true,
      driverIssueLogs: [
        ...(order.driverIssueLogs || []),
        {
          at: nowStamp(),
          by: actor.name,
          type: actor.issueType || '??',
          note: actor.issueNote || '',
        },
      ],
    };
  }

  if (action === 'RESOLVE_ISSUE') {
    nextStatus = order.status;
    timelineLabel = '司机异常已处理';
    patch = {
      driverIssueActive: false,
      driverIssueResolvedAt: nowStamp(),
    };
  }

  if (action === 'REDISPATCH') {
    nextStatus = 'DRIVER_ASSIGNED';
    timelineLabel = '异常任务已重新派送';
    patch = {
      driverIssueActive: false,
      driverIssueResolvedAt: nowStamp(),
      driverName: actor.driverName || order.driverName || actor.name,
      driverAccountId: actor.accountId || order.driverAccountId,
    };
  }


  if (
    action === 'CONFIRM_RECEIPT' &&
    (order.status === 'READY_FOR_PICKUP' || order.status === 'AT_SHIPPING_COMPANY')
  ) {
    nextStatus = 'RECEIVED';
    const stamp = nowStamp();
    const receiptMap = new Map(
      (actor.receiptQuantities || []).map((item) => [item.productId, Math.max(0, item.quantity)])
    );
    const receiptMetaMap = new Map((actor.receiptMeta || []).map((item) => [item.productId, item]));
    const qualityMap = new Map((actor.qualityFlags || []).map((item) => [item.productId, item.flags]));

    const actualReceivedItems = order.items.map((item) => ({
      ...item,
      receivedQuantity: receiptMap.has(item.productId)
        ? Math.min(item.quantity, receiptMap.get(item.productId) || 0)
        : item.quantity,
      batchNo: receiptMetaMap.get(item.productId)?.batchNo || item.batchNo,
      expiryDate: receiptMetaMap.get(item.productId)?.expiryDate || item.expiryDate,
      qualityFlags: qualityMap.get(item.productId) || item.qualityFlags || [],
    }));

    const receivedItems = actualReceivedItems.map((item) => ({
      productId: item.productId,
      title: item.title,
      barcode: item.barcode,
      quantity: item.receivedQuantity ?? item.quantity,
    }));

    const shortageItems = actualReceivedItems.filter(
      (item) => (item.receivedQuantity ?? item.quantity) < item.quantity
    );

    timelineLabel =
      shortageItems.length > 0
        ? order.deliveryMode === 'SELF_PICKUP'
          ? '零售商已部分提货并入库'
          : '零售商已部分接收船运货物并入库'
        : order.deliveryMode === 'SELF_PICKUP'
          ? '零售商已提货并完成入库'
          : '零售商已接收船运货物并入库';

    patch.items = actualReceivedItems;
    patch.receiptPhotoDataUrl = actor.receiptPhotoDataUrl || order.receiptPhotoDataUrl;
    if (order.deliveryMode === 'SELF_PICKUP') {
      patch.pickupSignatureName = actor.pickupSignatureName || actor.name;
      patch.pickupSignedAt = stamp;
      patch.pickupSignatureDataUrl = actor.pickupSignatureDataUrl || order.pickupSignatureDataUrl;
    }
    patch.note =
      shortageItems.length > 0
        ? `缺货回填：${shortageItems
            .map((item) => `${item.title} 缺 ${item.quantity - (item.receivedQuantity ?? 0)} 箱`)
            .join('；')}`
        : order.note;

    await patchStock(order.retailerAccountId, receivedItems, 'increase');
    await appendRetailBatchInventory(
      order.retailerAccountId,
      actualReceivedItems
        .filter((item) => (item.receivedQuantity ?? item.quantity) > 0)
        .map((item) => ({
          batchId: `${order.id}-${item.productId}-${item.batchNo || 'BATCH'}`,
          productId: item.productId,
          title: item.title,
          barcode: item.barcode,
          batchNo: item.batchNo || '未填批次',
          expiryDate: item.expiryDate,
          remainingQuantity: item.receivedQuantity ?? item.quantity,
          receivedAt: stamp,
          sourceReceiptNo: order.id,
          qualityFlags: item.qualityFlags || [],
        }))
    );
  }

  if (action === 'CANCEL' && order.status === 'SUBMITTED') {
    nextStatus = 'CANCELLED';
    timelineLabel = '零售商已取消进货单';
  }

  if (
    action === 'REJECT_RECEIPT' &&
    (order.status === 'READY_FOR_PICKUP' || order.status === 'AT_SHIPPING_COMPANY')
  ) {
    nextStatus = 'REJECTED';
    timelineLabel =
      order.deliveryMode === 'SELF_PICKUP'
        ? '零售商已拒绝提货，等待重新安排'
        : '零售商已拒收船运货物，等待重新发货';
  }

  if (action === 'RESHIP' && order.status === 'REJECTED') {
    nextStatus = order.deliveryMode === 'SELF_PICKUP' ? 'READY_FOR_PICKUP' : 'DRIVER_ASSIGNED';
    timelineLabel =
      order.deliveryMode === 'SELF_PICKUP'
        ? '批发商已重新备货，等待零售商提货'
        : '批发商已重新安排司机发货';
    patch =
      order.deliveryMode === 'SHIPMENT'
        ? {
            driverAccountId: actor.accountId,
            driverName: actor.driverName || actor.name,
            shippingCompanyName: actor.shippingCompanyName || order.shippingCompanyName || DEFAULT_SHIPPING_COMPANY,
          }
        : {};
  }

  if (!timelineLabel) return order;

  const stamp = nowStamp();
  const nextOrder: ProcurementOrder = {
    ...order,
    ...patch,
    status: nextStatus,
    updatedAt: stamp,
    timeline: [...order.timeline, { at: stamp, label: timelineLabel, by: actor.name }],
  };
  await saveOrders(orders.map((item) => (item.id === orderId ? nextOrder : item)));
  return nextOrder;
};

export const updateDriverTracking = async (
  orderIds: string[],
  input: {
    driverAccountId: string;
    lat: number;
    lng: number;
    label?: string;
  }
) => {
  const orders = await getProcurementOrders();
  const stamp = nowStamp();
  const targetIds = new Set(orderIds);
  const nextOrders = orders.map((order) => {
    if (!targetIds.has(order.id)) return order;
    if (order.driverAccountId && order.driverAccountId !== input.driverAccountId) return order;
    return {
      ...order,
      driverCurrentLocation: {
        lat: input.lat,
        lng: input.lng,
        label: input.label,
      },
      driverLastPingAt: stamp,
      updatedAt: stamp,
    };
  });
  await saveOrders(nextOrders);
  return nextOrders.filter((order) => targetIds.has(order.id));
};
