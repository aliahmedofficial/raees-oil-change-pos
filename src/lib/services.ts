
import { supabase } from './supabase';
import {
  Product,
  Customer,
  Sale,
  Discount,
  User,
  AppSettings,
  SalesTab,
} from '../types';

export function getSafeErrorInfo(error: unknown): {
  code: string | null;
  message: string;
  details: string | null;
  hint: string | null;
} {
  const fields =
    typeof error === 'object' && error !== null
      ? (error as {
          code?: unknown;
          message?: unknown;
          details?: unknown;
          hint?: unknown;
        })
      : undefined;

  const sanitize = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;

    return value
      .replace(/https?:\/\/\S+/gi, '[redacted URL]')
      .replace(
        /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
        '[redacted token]'
      )
      .replace(/\bBearer\s+\S+/gi, 'Bearer [redacted]')
      .replace(
        /\b(apikey|api_key|authorization|access_token|refresh_token|token|secret|password)(["']?\s*[:=]\s*["']?)[^,\s"'}]+/gi,
        '$1$2[redacted]'
      );
  };

  const message =
    sanitize(fields?.message) ??
    sanitize(error instanceof Error ? error.message : null) ??
    'Unknown database request error';

  return {
    code: sanitize(fields?.code),
    message,
    details: sanitize(fields?.details),
    hint: sanitize(fields?.hint),
  };
}

export async function logDatabaseRequest<T>(
  name: string,
  request: () => Promise<T>
): Promise<T> {
  const startedAt = performance.now();

  try {
    const result = await request();

    const responseError =
      typeof result === 'object' &&
      result !== null &&
      'error' in result
        ? result.error
        : null;

    const durationMs = Math.round(performance.now() - startedAt);

    if (import.meta.env.DEV) {
      if (responseError) {
        console.error(`[Supabase] ${name} failed`, {
          durationMs,
          ...getSafeErrorInfo(responseError),
        });
      } else {
        console.info(`[Supabase] ${name} succeeded`, { durationMs });
      }
    }

    return result;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error(`[Supabase] ${name} failed`, {
        durationMs: Math.round(performance.now() - startedAt),
        ...getSafeErrorInfo(error),
      });
    }

    throw error;
  }
}

// Products Service
export const productsService = {
  async getAll(
    onBatchLoadError?: (error: unknown) => void
  ): Promise<Product[]> {
    const allProducts: any[] = [];
    const pageSize = 10;
    let page = 0;

    // Load products in small batches to reduce request timeouts.
    while (true) {
      const { data, error } = await logDatabaseRequest(
        `products.select_active.page_${page + 1}`,
        async () =>
          await supabase
            .from('products')
            .select('*')
            .eq('active', true)
            .order('name', { ascending: true })
            .range(page * pageSize, (page + 1) * pageSize - 1)
      );

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        break;
      }

      allProducts.push(...data);

      if (data.length < pageSize) {
        break;
      }

      page++;
    }

    const products = allProducts;

    if (!products.length) return [];

    const productIds = products.map((product) => product.id);

    const { data: batches, error: batchError } =
      await logDatabaseRequest(
        'product_batches.select_for_products',
        async () =>
          await supabase
            .from('product_batches')
            .select('*')
            .in('product_id', productIds)
      );

    if (batchError) {
      onBatchLoadError?.(batchError);
    }

    const batchMap = new Map<string, any[]>();

    for (const batch of batches || []) {
      if (!batch.product_id) continue;

      const list = batchMap.get(batch.product_id) || [];
      list.push(batch);
      batchMap.set(batch.product_id, list);
    }

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || undefined,
      price: product.price || 0,
      cost: product.cost || 0,
      stock: product.stock || 0,
      minStock: product.min_stock || 0,
      category: product.category,
      description: product.description || '',
      image: product.image || undefined,
      taxable: product.taxable ?? true,
      active: product.active ?? true,
      isWeightBased: product.is_weight_based ?? false,
      pricePerUnit: product.price_per_unit || undefined,
      unit: product.unit || undefined,
      trackInventory: product.track_inventory ?? true,
      batches: (batchMap.get(product.id) || []).map((batch: any) => ({
        id: batch.id,
        batchNumber: batch.batch_number,
        manufacturingDate: new Date(batch.manufacturing_date),
        expiryDate: new Date(batch.expiry_date),
        quantity: batch.quantity || 0,
        costPrice: batch.cost_price || 0,
        supplierInfo: batch.supplier_info || '',
      })),
      createdAt: new Date(product.created_at),
      updatedAt: new Date(product.updated_at),
    }));
  },

  async create(
    product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        price: product.price,
        cost: product.cost,
        stock: product.stock,
        min_stock: product.minStock,
        category: product.category,
        description: product.description,
        image: product.image,
        taxable: product.taxable,
        active: product.active,
        is_weight_based: product.isWeightBased,
        price_per_unit: product.pricePerUnit,
        unit: product.unit,
        track_inventory: product.trackInventory,
      })
      .select()
      .single();

    if (error) throw error;

    if (product.batches && product.batches.length > 0) {
      const batchesData = product.batches.map((batch) => ({
        product_id: data.id,
        batch_number: batch.batchNumber,
        manufacturing_date: batch.manufacturingDate
          .toISOString()
          .split('T')[0],
        expiry_date: batch.expiryDate.toISOString().split('T')[0],
        quantity: batch.quantity,
        cost_price: batch.costPrice,
        supplier_info: batch.supplierInfo,
      }));

      const { error: batchesError } = await supabase
        .from('product_batches')
        .insert(batchesData);

      if (batchesError) throw batchesError;
    }

    return this.getById(data.id);
  },

  async update(
    id: string,
    product: Partial<Product>
  ): Promise<Product> {
    const updateData: Record<string, unknown> = {};

    if (product.name !== undefined) updateData.name = product.name;
    if (product.sku !== undefined) updateData.sku = product.sku;
    if (product.barcode !== undefined) updateData.barcode = product.barcode;
    if (product.price !== undefined) updateData.price = product.price;
    if (product.cost !== undefined) updateData.cost = product.cost;
    if (product.stock !== undefined) updateData.stock = product.stock;
    if (product.minStock !== undefined) {
      updateData.min_stock = product.minStock;
    }
    if (product.category !== undefined) {
      updateData.category = product.category;
    }
    if (product.description !== undefined) {
      updateData.description = product.description;
    }
    if (product.image !== undefined) updateData.image = product.image;
    if (product.taxable !== undefined) updateData.taxable = product.taxable;
    if (product.active !== undefined) updateData.active = product.active;

    if (product.isWeightBased !== undefined) {
      updateData.is_weight_based = product.isWeightBased;
    }

    if (product.pricePerUnit !== undefined) {
      updateData.price_per_unit = product.pricePerUnit;
    }

    if (product.unit !== undefined) updateData.unit = product.unit;

    if (product.trackInventory !== undefined) {
      updateData.track_inventory = product.trackInventory;
    }

    const { error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    if (product.batches !== undefined) {
      const { error: deleteError } = await supabase
        .from('product_batches')
        .delete()
        .eq('product_id', id);

      if (deleteError) throw deleteError;

      if (product.batches.length > 0) {
        const batchesData = product.batches.map((batch) => ({
          product_id: id,
          batch_number: batch.batchNumber,
          manufacturing_date: batch.manufacturingDate
            .toISOString()
            .split('T')[0],
          expiry_date: batch.expiryDate.toISOString().split('T')[0],
          quantity: batch.quantity,
          cost_price: batch.costPrice,
          supplier_info: batch.supplierInfo,
        }));

        const { error: insertError } = await supabase
          .from('product_batches')
          .insert(batchesData);

        if (insertError) throw insertError;
      }
    }

    return this.getById(id);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getById(id: string): Promise<Product> {
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    const { data: batches, error: batchError } = await supabase
      .from('product_batches')
      .select('*')
      .eq('product_id', id);

    if (batchError && import.meta.env.DEV) {
      console.error(
        '[Supabase] product_batches.select_for_product failed',
        getSafeErrorInfo(batchError)
      );
    }

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || undefined,
      price: product.price || 0,
      cost: product.cost || 0,
      stock: product.stock || 0,
      minStock: product.min_stock || 0,
      category: product.category,
      description: product.description || '',
      image: product.image || undefined,
      taxable: product.taxable ?? true,
      active: product.active ?? true,
      isWeightBased: product.is_weight_based ?? false,
      pricePerUnit: product.price_per_unit || undefined,
      unit: product.unit || undefined,
      trackInventory: product.track_inventory ?? true,
      batches: (batches || []).map((batch: any) => ({
        id: batch.id,
        batchNumber: batch.batch_number,
        manufacturingDate: new Date(batch.manufacturing_date),
        expiryDate: new Date(batch.expiry_date),
        quantity: batch.quantity || 0,
        costPrice: batch.cost_price || 0,
        supplierInfo: batch.supplier_info || '',
      })),
      createdAt: new Date(product.created_at),
      updatedAt: new Date(product.updated_at),
    };
  },
};

// Customers Service
export const customersService = {
  async getAll(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');

    if (error) throw error;

    return data.map((customer) => ({
      id: customer.id,
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      creditLimit: customer.credit_limit || 0,
      creditUsed: customer.credit_used || 0,
      priceTier: customer.price_tier || 'Standard',
      totalPurchases: customer.total_purchases || 0,
      lastPurchase: customer.last_purchase
        ? new Date(customer.last_purchase)
        : undefined,
      createdAt: new Date(customer.created_at),
    }));
  },

  async create(
    customer: Omit<Customer, 'id' | 'createdAt'>
  ): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        credit_limit: customer.creditLimit,
        credit_used: customer.creditUsed,
        price_tier: customer.priceTier,
        total_purchases: customer.totalPurchases,
        last_purchase: customer.lastPurchase?.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      email: data.email || '',
      phone: data.phone || '',
      address: data.address || '',
      creditLimit: data.credit_limit || 0,
      creditUsed: data.credit_used || 0,
      priceTier: data.price_tier || 'Standard',
      totalPurchases: data.total_purchases || 0,
      lastPurchase: data.last_purchase
        ? new Date(data.last_purchase)
        : undefined,
      createdAt: new Date(data.created_at),
    };
  },

  async update(
    id: string,
    customer: Partial<Customer>
  ): Promise<Customer> {
    const updateData: Record<string, unknown> = {};

    if (customer.name !== undefined) updateData.name = customer.name;
    if (customer.email !== undefined) updateData.email = customer.email;
    if (customer.phone !== undefined) updateData.phone = customer.phone;
    if (customer.address !== undefined) updateData.address = customer.address;
    if (customer.creditLimit !== undefined) {
      updateData.credit_limit = customer.creditLimit;
    }
    if (customer.creditUsed !== undefined) {
      updateData.credit_used = customer.creditUsed;
    }
    if (customer.priceTier !== undefined) {
      updateData.price_tier = customer.priceTier;
    }
    if (customer.totalPurchases !== undefined) {
      updateData.total_purchases = customer.totalPurchases;
    }
    if (customer.lastPurchase !== undefined) {
      updateData.last_purchase =
        customer.lastPurchase?.toISOString() ?? null;
    }

    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      email: data.email || '',
      phone: data.phone || '',
      address: data.address || '',
      creditLimit: data.credit_limit || 0,
      creditUsed: data.credit_used || 0,
      priceTier: data.price_tier || 'Standard',
      totalPurchases: data.total_purchases || 0,
      lastPurchase: data.last_purchase
        ? new Date(data.last_purchase)
        : undefined,
      createdAt: new Date(data.created_at),
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// Sales Service
export const salesService = {
  async getAll(): Promise<Sale[]> {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((sale) => ({
      id: sale.id,
      invoiceNumber: sale.invoice_number,
      customerId: sale.customer_id || undefined,
      customerName: sale.customer_name || undefined,
      items: sale.items as any[],
      subtotal: sale.subtotal || 0,
      discountAmount: sale.discount_amount || 0,
      taxAmount: sale.tax_amount || 0,
      total: sale.total || 0,
      paymentMethod: sale.payment_method as any,
      cardDetails: sale.card_details as any,
      status: sale.status as any,
      cashier: sale.cashier || '',
      timestamp: new Date(sale.created_at),
      receiptNumber: sale.receipt_number || undefined,
      notes: sale.notes || undefined,
      appliedDiscounts: sale.applied_discounts as any,
      freeGifts: sale.free_gifts as any,
    }));
  },

  async create(sale: Omit<Sale, 'id'>): Promise<Sale> {
    const { data, error } = await supabase
      .from('sales')
      .insert({
        invoice_number: sale.invoiceNumber,
        customer_id: sale.customerId,
        customer_name: sale.customerName,
        items: sale.items,
        subtotal: sale.subtotal,
        discount_amount: sale.discountAmount,
        tax_amount: sale.taxAmount,
        total: sale.total,
        payment_method: sale.paymentMethod,
        card_details: sale.cardDetails,
        status: sale.status,
        cashier: sale.cashier,
        receipt_number: sale.receiptNumber,
        notes: sale.notes,
        applied_discounts: sale.appliedDiscounts,
        free_gifts: sale.freeGifts,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      invoiceNumber: data.invoice_number,
      customerId: data.customer_id || undefined,
      customerName: data.customer_name || undefined,
      items: data.items as any[],
      subtotal: data.subtotal || 0,
      discountAmount: data.discount_amount || 0,
      taxAmount: data.tax_amount || 0,
      total: data.total || 0,
      paymentMethod: data.payment_method as any,
      cardDetails: data.card_details as any,
      status: data.status as any,
      cashier: data.cashier || '',
      timestamp: new Date(data.created_at),
      receiptNumber: data.receipt_number || undefined,
      notes: data.notes || undefined,
      appliedDiscounts: data.applied_discounts as any,
      freeGifts: data.free_gifts as any,
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// Discounts Service
export const discountsService = {
  async getAll(): Promise<Discount[]> {
    const { data, error } = await supabase
      .from('discounts')
      .select('*')
      .order('name');

    if (error) throw error;

    return data.map((discount) => ({
      id: discount.id,
      name: discount.name,
      description: discount.description || '',
      type: discount.type as any,
      value: discount.value || 0,
      conditions: discount.conditions as any,
      freeGiftProducts: discount.free_gift_products || undefined,
      minAmount: discount.min_amount || undefined,
      maxDiscount: discount.max_discount || undefined,
      validFrom: new Date(discount.valid_from),
      validTo: new Date(discount.valid_to),
      validDays: discount.valid_days || undefined,
      active: discount.active ?? true,
      createdAt: new Date(discount.created_at),
    }));
  },

  async create(
    discount: Omit<Discount, 'id' | 'createdAt'>
  ): Promise<Discount> {
    const { data, error } = await supabase
      .from('discounts')
      .insert({
        name: discount.name,
        description: discount.description,
        type: discount.type,
        value: discount.value,
        conditions: discount.conditions,
        free_gift_products: discount.freeGiftProducts,
        min_amount: discount.minAmount,
        max_discount: discount.maxDiscount,
        valid_from: discount.validFrom.toISOString(),
        valid_to: discount.validTo.toISOString(),
        valid_days: discount.validDays,
        active: discount.active,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      type: data.type as any,
      value: data.value || 0,
      conditions: data.conditions as any,
      freeGiftProducts: data.free_gift_products || undefined,
      minAmount: data.min_amount || undefined,
      maxDiscount: data.max_discount || undefined,
      validFrom: new Date(data.valid_from),
      validTo: new Date(data.valid_to),
      validDays: data.valid_days || undefined,
      active: data.active ?? true,
      createdAt: new Date(data.created_at),
    };
  },

  async update(
    id: string,
    discount: Partial<Discount>
  ): Promise<Discount> {
    const updateData: Record<string, unknown> = {};

    if (discount.name !== undefined) updateData.name = discount.name;
    if (discount.description !== undefined) {
      updateData.description = discount.description;
    }
    if (discount.type !== undefined) updateData.type = discount.type;
    if (discount.value !== undefined) updateData.value = discount.value;
    if (discount.conditions !== undefined) {
      updateData.conditions = discount.conditions;
    }
    if (discount.freeGiftProducts !== undefined) {
      updateData.free_gift_products = discount.freeGiftProducts;
    }
    if (discount.minAmount !== undefined) {
      updateData.min_amount = discount.minAmount;
    }
    if (discount.maxDiscount !== undefined) {
      updateData.max_discount = discount.maxDiscount;
    }
    if (discount.validFrom !== undefined) {
      updateData.valid_from = discount.validFrom.toISOString();
    }
    if (discount.validTo !== undefined) {
      updateData.valid_to = discount.validTo.toISOString();
    }
    if (discount.validDays !== undefined) {
      updateData.valid_days = discount.validDays;
    }
    if (discount.active !== undefined) updateData.active = discount.active;

    const { data, error } = await supabase
      .from('discounts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      type: data.type as any,
      value: data.value || 0,
      conditions: data.conditions as any,
      freeGiftProducts: data.free_gift_products || undefined,
      minAmount: data.min_amount || undefined,
      maxDiscount: data.max_discount || undefined,
      validFrom: new Date(data.valid_from),
      validTo: new Date(data.valid_to),
      validDays: data.valid_days || undefined,
      active: data.active ?? true,
      createdAt: new Date(data.created_at),
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('discounts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// Settings Service
export const settingsService = {
  async get(): Promise<AppSettings> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) throw error;

    return {
      storeName:
        data.store_name &&
        !['Nextera POS', 'Nextera POS Store'].includes(data.store_name)
          ? data.store_name
          : 'Raees Oil Change',
      storeAddress: data.store_address || '',
      storePhone: data.store_phone || '',
      storeEmail: data.store_email || '',
      storeLogo: data.store_logo || undefined,
      taxRate: 0,
      currency: 'PKR',
      interfaceMode: (data.interface_mode as any) || 'touch',
      autoBackup: data.auto_backup ?? true,
      receiptPrinter: data.receipt_printer ?? true,
      theme: (data.theme as any) || 'light',
      invoicePrefix: data.invoice_prefix || 'INV',
      invoiceCounter: data.invoice_counter || 1000,
    };
  },

  async update(settings: Partial<AppSettings>): Promise<AppSettings> {
    const { data: existingData, error: fetchError } = await supabase
      .from('app_settings')
      .select('id')
      .limit(1)
      .single();

    if (fetchError) throw fetchError;

    const { data, error } = await supabase
      .from('app_settings')
      .update({
        store_name: settings.storeName,
        store_address: settings.storeAddress,
        store_phone: settings.storePhone,
        store_email: settings.storeEmail,
        store_logo: settings.storeLogo,
        tax_rate: 0,
        currency: 'PKR',
        interface_mode: settings.interfaceMode,
        auto_backup: settings.autoBackup,
        receipt_printer: settings.receiptPrinter,
        theme: settings.theme,
        invoice_prefix: settings.invoicePrefix,
        invoice_counter: settings.invoiceCounter,
      })
      .eq('id', existingData.id)
      .select()
      .single();

    if (error) throw error;

    return {
      storeName:
        data.store_name &&
        !['Nextera POS', 'Nextera POS Store'].includes(data.store_name)
          ? data.store_name
          : 'Raees Oil Change',
      storeAddress: data.store_address || '',
      storePhone: data.store_phone || '',
      storeEmail: data.store_email || '',
      storeLogo: data.store_logo || undefined,
      taxRate: 0,
      currency: 'PKR',
      interfaceMode: (data.interface_mode as any) || 'touch',
      autoBackup: data.auto_backup ?? true,
      receiptPrinter: data.receipt_printer ?? true,
      theme: (data.theme as any) || 'light',
      invoicePrefix: data.invoice_prefix || 'INV',
      invoiceCounter: data.invoice_counter || 1000,
    };
  },
};

// Users Service
export const usersService = {
  async getAll(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name');

    if (error) throw error;

    return data.map((user) => ({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role as any,
      permissions: user.permissions || [],
      active: user.active ?? true,
      lastLogin: user.last_login
        ? new Date(user.last_login)
        : undefined,
      avatar: user.avatar || undefined,
    }));
  },

  async create(user: Omit<User, 'id'>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert({
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        active: user.active,
        avatar: user.avatar,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      username: data.username,
      name: data.name,
      email: data.email,
      role: data.role as any,
      permissions: data.permissions || [],
      active: data.active ?? true,
      lastLogin: data.last_login
        ? new Date(data.last_login)
        : undefined,
      avatar: data.avatar || undefined,
    };
  },

  async update(
    id: string,
    user: Partial<User>
  ): Promise<User> {
    const updateData: Record<string, unknown> = {};

    if (user.username !== undefined) updateData.username = user.username;
    if (user.name !== undefined) updateData.name = user.name;
    if (user.email !== undefined) updateData.email = user.email;
    if (user.role !== undefined) updateData.role = user.role;
    if (user.permissions !== undefined) {
      updateData.permissions = user.permissions;
    }
    if (user.active !== undefined) updateData.active = user.active;
    if (user.avatar !== undefined) updateData.avatar = user.avatar;
    if (user.lastLogin !== undefined) {
      updateData.last_login = user.lastLogin?.toISOString() ?? null;
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      username: data.username,
      name: data.name,
      email: data.email,
      role: data.role as any,
      permissions: data.permissions || [],
      active: data.active ?? true,
      lastLogin: data.last_login
        ? new Date(data.last_login)
        : undefined,
      avatar: data.avatar || undefined,
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// Sales Tabs Service
export const salesTabsService = {
  async getByUserId(userId: string): Promise<SalesTab[]> {
    const { data, error } = await supabase
      .from('sales_tabs')
      .select(`
        *,
        selected_customer:customers(*)
      `)
      .eq('user_id', userId)
      .order('created_at');

    if (error) throw error;

    return data.map((tab) => ({
      id: tab.id,
      name: tab.name,
      cart: (tab.cart as any[]) || [],
      selectedCustomer: tab.selected_customer
        ? {
            id: tab.selected_customer.id,
            name: tab.selected_customer.name,
            email: tab.selected_customer.email || '',
            phone: tab.selected_customer.phone || '',
            address: tab.selected_customer.address || '',
            creditLimit: tab.selected_customer.credit_limit || 0,
            creditUsed: tab.selected_customer.credit_used || 0,
            priceTier: tab.selected_customer.price_tier || 'Standard',
            totalPurchases: tab.selected_customer.total_purchases || 0,
            lastPurchase: tab.selected_customer.last_purchase
              ? new Date(tab.selected_customer.last_purchase)
              : undefined,
            createdAt: new Date(tab.selected_customer.created_at),
          }
        : null,
      createdAt: new Date(tab.created_at),
    }));
  },

  async create(
    userId: string,
    tab: Omit<SalesTab, 'id' | 'createdAt'>
  ): Promise<SalesTab> {
    const { data, error } = await supabase
      .from('sales_tabs')
      .insert({
        user_id: userId,
        name: tab.name,
        cart: tab.cart,
        selected_customer_id: tab.selectedCustomer?.id,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      cart: (data.cart as any[]) || [],
      selectedCustomer: tab.selectedCustomer,
      createdAt: new Date(data.created_at),
    };
  },

  async update(
    id: string,
    tab: Partial<SalesTab>
  ): Promise<SalesTab> {
    const updateData: Record<string, unknown> = {};

    if (tab.name !== undefined) updateData.name = tab.name;
    if (tab.cart !== undefined) updateData.cart = tab.cart;
    if (tab.selectedCustomer !== undefined) {
      updateData.selected_customer_id = tab.selectedCustomer?.id ?? null;
    }

    const { data, error } = await supabase
      .from('sales_tabs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      cart: (data.cart as any[]) || [],
      selectedCustomer: tab.selectedCustomer || null,
      createdAt: new Date(data.created_at),
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('sales_tabs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// Temporary Products API Diagnostic — development only
export async function diagnoseProductsRequest(): Promise<void> {
  const runTest = async (
    name: string,
    request: () => PromiseLike<any>
  ): Promise<void> => {
    const startedAt = performance.now();

    try {
      const { data, error, status } = await request();

      console.log(`[Products Diagnostic] ${name}`, {
        status,
        rows: data?.length ?? 0,
        durationMs: Math.round(performance.now() - startedAt),
        error: error ? getSafeErrorInfo(error) : null,
      });
    } catch (error) {
      console.error(`[Products Diagnostic] ${name}`, {
        durationMs: Math.round(performance.now() - startedAt),
        ...getSafeErrorInfo(error),
      });
    }
  };

  await runTest('1. ID only', () =>
    supabase.from('products').select('id').limit(1)
  );

  await runTest('2. ID and name', () =>
    supabase.from('products').select('id, name').limit(10)
  );

  await runTest('3. All columns', () =>
    supabase.from('products').select('*').limit(10)
  );

  await runTest('4. Active and sorted', () =>
    supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('name', { ascending: true })
      .limit(10)
  );

  await runTest('5. All active products without limit', () =>
    supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('name', { ascending: true })
  );
}

// Expose diagnostics only during local development.
if (import.meta.env.DEV) {
  (
    window as Window & {
      diagnoseProductsRequest?: () => Promise<void>;
    }
  ).diagnoseProductsRequest = diagnoseProductsRequest;
}
